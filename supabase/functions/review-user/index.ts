import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    // =====================================================
    // ENVIRONMENT
    // =====================================================

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey =
      Deno.env.get("CREATE_USER_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json(
        {
          error:
            "Supabase environment variables are missing.",
        },
        500
      );
    }

    // =====================================================
    // AUTHORIZATION
    // =====================================================

    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return json(
        { error: "Unauthorized. Missing access token." },
        401
      );
    }

    const token = authHeader.slice("Bearer ".length);

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // =====================================================
    // GET CURRENT USER
    // =====================================================

    const {
      data: { user: reviewer },
      error: reviewerError,
    } = await supabaseAdmin.auth.getUser(token);

    if (reviewerError || !reviewer) {
      console.error(
        "Reviewer authentication failed:",
        reviewerError
      );

      return json(
        { error: "Unauthorized." },
        401
      );
    }

    console.log(
      "Reviewer:",
      reviewer.id,
      reviewer.email
    );

    // =====================================================
    // CHECK ADMIN
    // =====================================================

    const {
      data: reviewerProfile,
      error: reviewerProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, username, role, status")
      .eq("id", reviewer.id)
      .single();

    if (reviewerProfileError) {
      console.error(
        "Reviewer profile error:",
        reviewerProfileError
      );

      return json(
        {
          error:
            "Unable to load administrator profile.",
        },
        500
      );
    }

    const reviewerRole = String(
      reviewerProfile?.role || ""
    )
      .trim()
      .toLowerCase();

    if (reviewerRole !== "admin") {
      return json(
        {
          error:
            "Access denied. Only administrators can review users.",
        },
        403
      );
    }

    // =====================================================
    // READ REQUEST
    // =====================================================

    const body = await req.json();

    const userId = String(
      body?.user_id || ""
    ).trim();

    const action = String(
      body?.action || ""
    )
      .trim()
      .toLowerCase();

    const rejectionReason = String(
      body?.rejection_reason || ""
    ).trim();

    console.log("Review request:", {
      userId,
      action,
      reviewer: reviewer.id,
    });

    // =====================================================
    // VALIDATE ACTION
    // =====================================================

    const allowedActions = [
      "approve",
      "reject",
      "activate",
      "deactivate",
    ];

    if (
      !userId ||
      !allowedActions.includes(action)
    ) {
      return json(
        {
          error:
            "Invalid review request.",
        },
        400
      );
    }

    if (
      action === "reject" &&
      !rejectionReason
    ) {
      return json(
        {
          error:
            "A rejection reason is required.",
        },
        400
      );
    }

    // =====================================================
    // LOAD TARGET USER
    // =====================================================

    const {
      data: targetProfile,
      error: targetError,
    } = await supabaseAdmin
      .from("profiles")
      .select(
        `
        id,
        full_name,
        username,
        role,
        city_id,
        status,
        first_login,
        profile_completed,
        id_front_url,
        id_back_url,
        license_degree_url,
        approved_by,
        approved_at,
        rejection_reason,
        rejected_by,
        rejected_at,
        created_at,
        updated_at
        `
      )
      .eq("id", userId)
      .single();

    if (targetError || !targetProfile) {
      console.error(
        "Target profile error:",
        targetError
      );

      return json(
        {
          error:
            "User profile not found.",
        },
        404
      );
    }

    // =====================================================
    // NORMALIZE STATUS
    // =====================================================

    const currentStatus = String(
      targetProfile.status || ""
    )
      .trim()
      .toLowerCase();

    console.log("Target user:", {
      id: targetProfile.id,
      name: targetProfile.full_name,
      status: targetProfile.status,
      normalizedStatus: currentStatus,
      action,
    });

    // =====================================================
    // STATUS TRANSITIONS
    // =====================================================

    // -----------------------------------------------------
    // APPROVE
    // Pending OR Rejected → Active
    // -----------------------------------------------------

    if (action === "approve") {
      if (
        currentStatus !== "pending" &&
        currentStatus !== "rejected"
      ) {
        return json(
          {
            error:
              `Cannot approve this user. Current status is "${targetProfile.status}". ` +
              `Only Pending or Rejected users can be approved.`,
          },
          409
        );
      }
    }

    // -----------------------------------------------------
    // REJECT
    // Pending → Rejected
    // -----------------------------------------------------

    if (action === "reject") {
      if (currentStatus !== "pending") {
        return json(
          {
            error:
              `Cannot reject this user. Current status is "${targetProfile.status}". ` +
              `Only Pending users can be rejected.`,
          },
          409
        );
      }
    }

    // -----------------------------------------------------
    // ACTIVATE
    // Inactive → Active
    // -----------------------------------------------------

    if (action === "activate") {
      if (currentStatus !== "inactive") {
        return json(
          {
            error:
              `Cannot activate this user. Current status is "${targetProfile.status}". ` +
              `Only Inactive users can be activated.`,
          },
          409
        );
      }
    }

    // -----------------------------------------------------
    // DEACTIVATE
    // Active → Inactive
    // -----------------------------------------------------

    if (action === "deactivate") {
      if (currentStatus !== "active") {
        return json(
          {
            error:
              `Cannot deactivate this user. Current status is "${targetProfile.status}". ` +
              `Only Active users can be deactivated.`,
          },
          409
        );
      }
    }

    // =====================================================
    // BUILD UPDATE
    // =====================================================

    const now = new Date().toISOString();

    let updateData;

    if (
      action === "approve" ||
      action === "activate"
    ) {
      updateData = {
        status: "Active",

        approved_by: reviewer.id,
        approved_at: now,

        rejection_reason: null,
        rejected_by: null,
        rejected_at: null,

        updated_at: now,
      };
    }

    if (action === "reject") {
      updateData = {
        status: "Rejected",

        approved_by: null,
        approved_at: null,

        rejection_reason:
          rejectionReason,

        rejected_by: reviewer.id,
        rejected_at: now,

        updated_at: now,
      };
    }

    if (action === "deactivate") {
      updateData = {
        status: "Inactive",

        updated_at: now,
      };
    }

    // =====================================================
    // UPDATE PROFILE
    // =====================================================

    const {
      data: updatedProfile,
      error: updateError,
    } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("id", userId)
      .select(
        `
        id,
        full_name,
        username,
        role,
        city_id,
        status,
        first_login,
        profile_completed,
        id_front_url,
        id_back_url,
        license_degree_url,
        approved_by,
        approved_at,
        rejection_reason,
        rejected_by,
        rejected_at,
        created_at,
        updated_at
        `
      )
      .single();

    if (updateError) {
      console.error(
        "Profile update failed:",
        updateError
      );

      return json(
        {
          error:
            updateError.message,
        },
        500
      );
    }

    // =====================================================
    // SUCCESS
    // =====================================================

    console.log(
      "User status successfully changed:",
      {
        userId,
        oldStatus: targetProfile.status,
        newStatus: updatedProfile.status,
        action,
      }
    );

    return json({
      success: true,

      message:
        `User ${action} successful.`,

      user: updatedProfile,
    });

  } catch (error) {
    console.error(
      "Review user error:",
      error
    );

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to review user.",
      },
      500
    );
  }
});