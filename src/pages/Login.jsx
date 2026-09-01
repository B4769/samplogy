import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Capacitor } from "@capacitor/core";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    const enteredEmail = email.trim().toLowerCase();

    if (!enteredEmail || !password) {
      setError("Please enter your email and password.");
      setLoading(false);
      return;
    }

    try {
      console.log("Attempting Supabase login...");

      // =====================================================
      // 1. SIGN IN
      // =====================================================

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: enteredEmail,
          password,
        });

      if (authError) {
        console.error("Login error:", authError);

        setError(
          authError.message || "Invalid email or password."
        );

        setLoading(false);
        return;
      }

      const user = authData?.user;

      if (!user) {
        setError("Unable to log in. Please try again.");
        setLoading(false);
        return;
      }

      console.log("Authenticated user:", user.id);

      // =====================================================
      // 2. VERIFY SESSION
      // =====================================================

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("Session error:", sessionError);

        setError(
          "Login session could not be created. Please try again."
        );

        setLoading(false);
        return;
      }

      console.log("Supabase session created successfully.");

      // =====================================================
      // 3. LOAD PROFILE
      // =====================================================

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error("Profile error:", profileError);

        setError(
          "Your account was found, but your profile could not be loaded."
        );

        await supabase.auth.signOut();

        setLoading(false);
        return;
      }

      console.log("Profile loaded:", profile);

      // =====================================================
      // 4. NORMALIZE ROLE AND STATUS
      // =====================================================

      const role = String(profile.role || "")
        .trim()
        .toLowerCase();

      const status = String(profile.status || "")
        .trim()
        .toLowerCase();

      console.log("User role:", role);
      console.log("User status:", status);

      // =====================================================
      // 5. MOBILE APP = NURSE ONLY
      // =====================================================

      if (
        Capacitor.isNativePlatform() &&
        role !== "nurse"
      ) {
        setError(
          "This mobile application is available to approved nurse accounts only."
        );

        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // =====================================================
      // 6. MANDATORY PASSWORD CHANGE
      // =====================================================

      if (profile.must_change_password === true) {
        localStorage.setItem(
          "currentUser",
          JSON.stringify(profile)
        );

        navigate("/change-password", {
          replace: true,
        });

        return;
      }

      // =====================================================
      // 7. PENDING
      // =====================================================

      if (
        status === "pending" ||
        status === "pending approval"
      ) {
        if (
          profile.first_login === true ||
          profile.profile_completed === false
        ) {
          localStorage.setItem(
            "currentUser",
            JSON.stringify(profile)
          );

          navigate("/complete-profile", {
            replace: true,
          });

          return;
        }

        setError(
          "Your profile has been submitted and is waiting for administrator approval."
        );

        await supabase.auth.signOut();

        setLoading(false);
        return;
      }

      // =====================================================
      // 8. REJECTED
      // =====================================================

      if (status === "rejected") {
        localStorage.setItem(
          "currentUser",
          JSON.stringify(profile)
        );

        navigate("/complete-profile", {
          replace: true,
        });

        return;
      }

      // =====================================================
      // 9. ACTIVE CHECK
      // =====================================================

      if (status !== "active") {
        setError(
          "Your account is inactive. Please contact the administrator."
        );

        await supabase.auth.signOut();

        setLoading(false);
        return;
      }

      // =====================================================
      // 10. SAVE PROFILE
      // =====================================================

      localStorage.setItem(
        "currentUser",
        JSON.stringify(profile)
      );

      // =====================================================
      // 11. FIRST LOGIN / INCOMPLETE PROFILE
      // =====================================================

      if (
        profile.first_login === true ||
        profile.profile_completed === false
      ) {
        navigate("/complete-profile", {
          replace: true,
        });

        return;
      }

      // =====================================================
      // 12. ROLE NAVIGATION
      // =====================================================

      if (role === "admin") {
        console.log("Redirecting to Admin Dashboard...");

        navigate("/admin", {
          replace: true,
        });

        return;
      }

      if (role === "nurse") {
        console.log("Redirecting to Nurse Dashboard...");

        navigate("/nurse-dashboard", {
          replace: true,
        });

        return;
      }

      if (
        role === "laboratory" ||
        role === "lab" ||
        role === "lab_technician"
      ) {
        console.log(
          "Redirecting to Laboratory Dashboard..."
        );

        navigate("/laboratory", {
          replace: true,
        });

        return;
      }

      // =====================================================
      // 13. UNKNOWN ROLE
      // =====================================================

      console.error("Unknown role:", profile.role);

      setError(
        `User role "${profile.role}" is not recognized.`
      );

      await supabase.auth.signOut();
    } catch (err) {
      console.error("Unexpected login error:", err);

      setError(
        err?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* =====================================================
          RESPONSIVE LOGIN STYLES
      ===================================================== */}

      <style>{`
        * {
          box-sizing: border-box;
        }

        .login-page {
          min-height: 100vh;
          width: 100%;
          display: grid;
          grid-template-columns: minmax(360px, 0.85fr) minmax(420px, 1.15fr);
          background: #f4f7f9;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Arial,
            sans-serif;
          overflow-x: hidden;
        }

        /* =====================================================
           BRAND PANEL
        ===================================================== */

        .login-brand {
          min-height: 100vh;
          padding: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          background:
            linear-gradient(
              145deg,
              #075e68 0%,
              #087f8c 55%,
              #0c96a3 100%
            );
        }

        .brand-inner {
          width: 100%;
          max-width: 470px;
        }

        .brand-logo {
          display: block;
          width: 220px;
          max-width: 100%;
          height: auto;
          object-fit: contain;
          margin-bottom: 42px;
        }

        .brand-kicker {
          margin: 0 0 14px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 4px;
          text-transform: uppercase;
          opacity: 0.82;
        }

        .brand-heading {
          margin: 0;
          font-size: clamp(38px, 4vw, 58px);
          line-height: 1.05;
          font-weight: 800;
          letter-spacing: -2px;
        }

        .brand-description {
          max-width: 420px;
          margin: 24px 0 0;
          font-size: 16px;
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.84);
        }

        .brand-divider {
          width: 64px;
          height: 4px;
          margin-top: 30px;
          border-radius: 10px;
          background: #ffffff;
          opacity: 0.9;
        }

        /* =====================================================
           LOGIN AREA
        ===================================================== */

        .login-area {
          min-height: 100vh;
          padding: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f4f7f9;
        }

        .login-card {
          width: 100%;
          max-width: 510px;
          padding: 48px;
          background: #ffffff;
          border: 1px solid #e5ebef;
          border-radius: 24px;
          box-shadow:
            0 20px 60px rgba(15, 23, 42, 0.08);
        }

        /* =====================================================
           MOBILE LOGO
        ===================================================== */

        .mobile-logo-wrapper {
          display: none;
          text-align: center;
          margin-bottom: 28px;
        }

        .mobile-logo {
          width: 155px;
          max-width: 70%;
          height: auto;
        }

        /* =====================================================
           HEADING
        ===================================================== */

        .login-kicker {
          margin: 0 0 10px;
          color: #087f8c;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 4px;
          text-transform: uppercase;
        }

        .login-title {
          margin: 0;
          color: #14233b;
          font-size: 36px;
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -1px;
        }

        .login-subtitle {
          margin: 12px 0 32px;
          color: #718096;
          font-size: 15px;
          line-height: 1.6;
        }

        /* =====================================================
           FORM
        ===================================================== */

        .login-form-group {
          margin-bottom: 22px;
        }

        .login-label {
          display: block;
          margin-bottom: 9px;
          color: #27364d;
          font-size: 13px;
          font-weight: 700;
        }

        .login-input-wrapper {
          position: relative;
          width: 100%;
        }

        .login-input {
          width: 100%;
          height: 54px;
          padding: 0 16px;
          border: 1px solid #d8e1e7;
          border-radius: 12px;
          outline: none;
          background: #ffffff;
          color: #172033;
          font-size: 15px;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .login-input:focus {
          border-color: #087f8c;
          box-shadow:
            0 0 0 4px rgba(8, 127, 140, 0.10);
        }

        .password-input {
          padding-right: 72px;
        }

        .show-password {
          position: absolute;
          top: 50%;
          right: 8px;
          transform: translateY(-50%);
          border: none;
          background: transparent;
          color: #087f8c;
          padding: 8px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        /* =====================================================
           ERROR
        ===================================================== */

        .login-error {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-bottom: 20px;
          padding: 13px 14px;
          border: 1px solid #fecaca;
          border-radius: 12px;
          background: #fff5f5;
          color: #b42318;
          font-size: 13px;
          line-height: 1.5;
        }

        .error-icon {
          width: 21px;
          height: 21px;
          min-width: 21px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #dc2626;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
        }

        .error-title {
          display: block;
          margin-bottom: 2px;
          font-weight: 800;
        }

        /* =====================================================
           BUTTON
        ===================================================== */

        .login-button {
          width: 100%;
          height: 54px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: none;
          border-radius: 12px;
          background:
            linear-gradient(
              135deg,
              #087f8c,
              #066974
            );
          color: #ffffff;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          box-shadow:
            0 8px 20px rgba(8, 127, 140, 0.22);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 12px 25px rgba(8, 127, 140, 0.28);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .button-arrow {
          font-size: 19px;
          line-height: 1;
        }

        .login-security {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 26px;
          padding-top: 20px;
          border-top: 1px solid #edf1f3;
          color: #8795a1;
          font-size: 11px;
          text-align: center;
        }

        .login-footer {
          margin-top: 18px;
          color: #a0acb5;
          font-size: 11px;
          text-align: center;
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (max-width: 900px) {
          .login-page {
            grid-template-columns: 1fr;
          }

          .login-brand {
            display: none;
          }

          .login-area {
            min-height: 100vh;
            padding: 30px 20px;
          }

          .login-card {
            max-width: 500px;
          }

          .mobile-logo-wrapper {
            display: block;
          }
        }

        /* =====================================================
           PHONE
        ===================================================== */

        @media (max-width: 600px) {
          .login-area {
            min-height: 100vh;
            padding: 20px 14px;
            align-items: flex-start;
          }

          .login-card {
            width: 100%;
            max-width: 100%;
            margin: 0;
            padding: 30px 22px;
            border-radius: 18px;
            box-shadow:
              0 10px 35px rgba(15, 23, 42, 0.07);
          }

          .mobile-logo-wrapper {
            margin-bottom: 24px;
          }

          .mobile-logo {
            width: 135px;
          }

          .login-kicker {
            font-size: 10px;
            letter-spacing: 3px;
          }

          .login-title {
            font-size: 30px;
            letter-spacing: -0.7px;
          }

          .login-subtitle {
            margin-bottom: 26px;
            font-size: 14px;
          }

          .login-form-group {
            margin-bottom: 18px;
          }

          .login-input {
            height: 52px;
            font-size: 16px;
          }

          .login-button {
            height: 52px;
          }

          .login-security {
            font-size: 10px;
          }
        }

        /* =====================================================
           SMALL PHONE
        ===================================================== */

        @media (max-width: 380px) {
          .login-area {
            padding: 12px 10px;
          }

          .login-card {
            padding: 25px 18px;
          }

          .mobile-logo {
            width: 120px;
          }

          .login-title {
            font-size: 27px;
          }
        }
      `}</style>

      <div className="login-page">

        {/* =====================================================
            BRAND PANEL
        ===================================================== */}

        <section className="login-brand">
          <div className="brand-inner">

            <img
              src={`${import.meta.env.BASE_URL}samplogy-logo.png`}
              alt="Samplogy"
              className="brand-logo"
            />

            <p className="brand-kicker">
              Sample Delivery Platform
            </p>

            <h1 className="brand-heading">
              Smarter healthcare.
              <br />
              Better connected.
            </h1>

            <div className="brand-divider" />

            <p className="brand-description">
              Samplogy connects healthcare teams,
              laboratories and administrators through
              one secure sample delivery and laboratory
              management platform.
            </p>

          </div>
        </section>

        {/* =====================================================
            LOGIN AREA
        ===================================================== */}

        <main className="login-area">

          <div className="login-card">

            {/* MOBILE LOGO */}

            <div className="mobile-logo-wrapper">
              <img
                src={`${import.meta.env.BASE_URL}samplogy-logo.png`}
                alt="Samplogy"
                className="mobile-logo"
              />
            </div>

            {/* HEADING */}

            <div>
              <p className="login-kicker">
                Welcome back
              </p>

              <h2 className="login-title">
                Sign in to your account
              </h2>

              <p className="login-subtitle">
                Enter your credentials to access
                the Samplogy platform.
              </p>
            </div>

            {/* =================================================
                FORM
            ================================================= */}

            <form onSubmit={handleLogin}>

              {/* EMAIL */}

              <div className="login-form-group">

                <label className="login-label">
                  Email address
                </label>

                <div className="login-input-wrapper">

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="you@example.com"
                    className="login-input"
                    autoComplete="email"
                    required
                  />

                </div>

              </div>

              {/* PASSWORD */}

              <div className="login-form-group">

                <label className="login-label">
                  Password
                </label>

                <div className="login-input-wrapper">

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter your password"
                    className="login-input password-input"
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="show-password"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                  >
                    {showPassword
                      ? "Hide"
                      : "Show"}
                  </button>

                </div>

              </div>

              {/* ERROR */}

              {error && (
                <div className="login-error">

                  <div className="error-icon">
                    !
                  </div>

                  <div>
                    <span className="error-title">
                      Sign in failed
                    </span>

                    <span>
                      {error}
                    </span>
                  </div>

                </div>
              )}

              {/* BUTTON */}

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? (
                  "Signing in..."
                ) : (
                  <>
                    Sign in
                    <span className="button-arrow">
                      →
                    </span>
                  </>
                )}
              </button>

            </form>

            {/* SECURITY */}

            <div className="login-security">
              <span>🔒</span>

              <span>
                Secure healthcare management platform
              </span>
            </div>

            {/* FOOTER */}

            <div className="login-footer">
              © {new Date().getFullYear()} Samplogy
            </div>

          </div>

        </main>

      </div>
    </>
  );
}

export default Login;