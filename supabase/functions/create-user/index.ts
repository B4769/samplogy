import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

const PASSWORD_REQUIREMENTS =
  /^(?=.*[A-Za-z])(?=.*[0-9]).{8,}$/;

const PASSWORD_REQUIREMENTS_MESSAGE =
  "Password must be at least 8 characters and include at least one letter and one number.";

Deno.serve(async (req) => {
  // =====================================================
  // CORS
  // =====================================================

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Only POST requests are allowed.",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    // =====================================================
    // ENVIRONMENT
    // =====================================================

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get("CREATE_USER_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Supabase environment variables are missing."
      );
    }

    // =====================================================
    // SERVICE ROLE CLIENT
    // =====================================================

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
    // GET AUTHORIZATION HEADER
    // =====================================================

    const authHeader =
      req.headers.get("Authorization");

    if (!authHeader) {
      throw new Error(
        "Missing authorization header."
      );
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw new Error(
        "Invalid authorization header."
      );
    }

    const accessToken =
      authHeader.substring(7).trim();

    if (!accessToken) {
      throw new Error(
        "Missing access token."
      );
    }

    // =====================================================
    // VERIFY CURRENT USER
    // =====================================================

    const {
      data: userData,
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (userError) {
      console.error(
        "Auth verification error:",
        userError
      );

      throw new Error(
        "Unable to verify your login session."
      );
    }

    const currentUser =
      userData?.user;

    if (!currentUser) {
      throw new Error(
        "Unauthorized. Please log in again."
      );
    }

    console.log(
      "Authenticated user:",
      currentUser.id
    );

    // =====================================================
    // CHECK ADMIN PROFILE
    // =====================================================

    const {
      data: adminProfile,
      error: adminProfileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, username, role, status"
        )
        .eq("id", currentUser.id)
        .maybeSingle();

    if (adminProfileError) {
      console.error(
        "Admin profile lookup error:",
        adminProfileError
      );

      throw new Error(
        `Unable to load administrator profile: ${adminProfileError.message}`
      );
    }

    if (!adminProfile) {
      console.error(
        "No profile found for:",
        currentUser.id
      );

      throw new Error(
        "Administrator profile was not found."
      );
    }

    console.log(
      "Admin profile:",
      adminProfile
    );

    // =====================================================
    // ADMIN AUTHORIZATION
    // =====================================================

    if (adminProfile.role !== "admin") {
      throw new Error(
        "Access denied. Only administrators can create users."
      );
    }

    if (adminProfile.status !== "Active") {
      throw new Error(
        "Your administrator account is not active."
      );
    }

    // =====================================================
    // READ REQUEST
    // =====================================================

    let body;

    try {
      body = await req.json();
    } catch {
      throw new Error(
        "Invalid request body."
      );
    }

    const {
      email,
      password,
      full_name,
      username,
      role,
      city_id,
    } = body;

    // =====================================================
    // BASIC VALIDATION
    // =====================================================

    if (
      !email ||
      !password ||
      !full_name ||
      !username ||
      !role
    ) {
      throw new Error(
        "Email, password, full name, username and role are required."
      );
    }

    // =====================================================
    // CLEAN VALUES
    // =====================================================

    const cleanEmail =
      String(email)
        .trim()
        .toLowerCase();

    const cleanUsername =
      String(username)
        .trim()
        .toLowerCase();

    const cleanFullName =
      String(full_name)
        .trim();

    // =====================================================
    // ROLE VALIDATION
    // =====================================================

    const allowedRoles = [
      "admin",
      "nurse",
      "lab_technician",
    ];

    if (!allowedRoles.includes(role)) {
      throw new Error(
        "Invalid user role."
      );
    }

    // =====================================================
    // PASSWORD VALIDATION
    // =====================================================

    if (
      !PASSWORD_REQUIREMENTS.test(
        String(password)
      )
    ) {
      throw new Error(
        PASSWORD_REQUIREMENTS_MESSAGE
      );
    }

    // =====================================================
    // USERNAME CHECK
    // =====================================================

    const {
      data: existingUsername,
      error: usernameError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq(
          "username",
          cleanUsername
        )
        .maybeSingle();

    if (usernameError) {
      throw new Error(
        `Unable to check username: ${usernameError.message}`
      );
    }

    if (existingUsername) {
      throw new Error(
        "Username already exists."
      );
    }

    // =====================================================
    // CITY CHECK
    // =====================================================

    let cleanCityId =
      city_id || null;

    if (cleanCityId) {
      const {
        data: city,
        error: cityError,
      } =
        await supabaseAdmin
          .from("cities")
          .select("id")
          .eq("id", cleanCityId)
          .maybeSingle();

      if (cityError) {
        throw new Error(
          `Unable to verify city: ${cityError.message}`
        );
      }

      if (!city) {
        throw new Error(
          "Selected city does not exist."
        );
      }
    }

    // =====================================================
    // CREATE AUTH USER
    // =====================================================

    console.log(
      "Creating Auth user:",
      cleanEmail
    );

    const {
      data: createdUser,
      error: createUserError,
    } =
      await supabaseAdmin.auth.admin.createUser(
        {
          email: cleanEmail,
          password: String(password),
          email_confirm: true,
        }
      );

    if (createUserError) {
      console.error(
        "Auth user creation error:",
        createUserError
      );

      throw new Error(
        createUserError.message
      );
    }

    if (!createdUser?.user) {
      throw new Error(
        "User was not created."
      );
    }

    const userId =
      createdUser.user.id;

    console.log(
      "Auth user created:",
      userId
    );

    // =====================================================
    // CREATE PROFILE
    // =====================================================

    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,
          full_name: cleanFullName,
          username: cleanUsername,
          role,
          city_id: cleanCityId,

          profile_completed: false,
          first_login: true,

          status: "Pending",

          id_front_url: null,
          id_back_url: null,
          license_degree_url: null,

          approved_by: null,
          approved_at: null,

          rejection_reason: null,
          rejected_by: null,
          rejected_at: null,

          must_change_password: true,
        })
        .select()
        .single();

    // =====================================================
    // ROLLBACK AUTH USER
    // =====================================================

    if (profileError) {
      console.error(
        "Profile creation failed:",
        profileError
      );

      await supabaseAdmin.auth.admin.deleteUser(
        userId
      );

      throw new Error(
        `Profile creation failed: ${profileError.message}`
      );
    }

    // =====================================================
    // SUCCESS
    // =====================================================

    console.log(
      "User created successfully:",
      userId
    );

    return new Response(
      JSON.stringify({
        success: true,

        message:
          "User created successfully.",

        user: {
          id: userId,
          email:
            createdUser.user.email,

          full_name:
            profile.full_name,

          username:
            profile.username,

          role:
            profile.role,

          city_id:
            profile.city_id,

          status:
            profile.status,
        },
      }),
      {
        status: 200,

        headers: {
          ...corsHeaders,

          "Content-Type":
            "application/json",
        },
      }
    );

  } catch (error) {

    console.error(
      "Create user error:",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to create user.",
      }),
      {
        status: 400,

        headers: {
          ...corsHeaders,

          "Content-Type":
            "application/json",
        },
      }
    );
  }
});