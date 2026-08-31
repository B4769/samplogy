import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("CREATE_USER_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase environment variables are missing.");
    }

    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized." }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.slice("Bearer ".length);
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return json({ error: "Unauthorized." }, 401);
    }

    const body = await req.json();
    const paths = [body?.id_front_url, body?.id_back_url, body?.license_degree_url];

    if (!paths.every((path) => typeof path === "string" && path.startsWith(`${user.id}/`))) {
      return json({ error: "Invalid document paths." }, 400);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, status, profile_completed")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return json({ error: "Profile not found." }, 404);
    }

    const isResubmission = profile.status === "Rejected";
    const isInitialSubmission =
      profile.status === "Pending" && profile.profile_completed !== true;

    if (!isResubmission && !isInitialSubmission) {
      return json({ error: "This profile cannot be submitted for review." }, 409);
    }

    const now = new Date().toISOString();
    const updateData = {
      id_front_url: body.id_front_url,
      id_back_url: body.id_back_url,
      license_degree_url: body.license_degree_url,
      profile_completed: true,
      first_login: false,
      updated_at: now,
    };

    if (isResubmission) {
      Object.assign(updateData, {
        status: "Pending",
        rejection_reason: null,
        rejected_by: null,
        rejected_at: null,
      });
    }

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return json({ profile: updatedProfile });
  } catch (error) {
    console.error("Profile resubmission error:", error);
    return json(
      { error: error instanceof Error ? error.message : "Unable to resubmit profile." },
      400
    );
  }
});
