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
      // =====================================================
      // 1. SIGN IN WITH SUPABASE AUTH
      // =====================================================

      console.log("Attempting Supabase login...");

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: enteredEmail,
          password,
        });

      if (authError) {
        console.error("Login error:", authError);

        setError(
          authError.message || "Invalid login credentials."
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
      // 5. MOBILE APPLICATION = NURSE PORTAL
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
      // 7. PENDING ACCOUNT
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
          "Your profile is waiting for administrator approval."
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
      // 9. ACTIVE ACCOUNT CHECK
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
      // 11. COMPLETE PROFILE
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
      // 12. ROLE-BASED NAVIGATION
      // =====================================================

      if (role === "admin") {
        navigate("/admin", {
          replace: true,
        });

        return;
      }

      if (role === "nurse") {
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
    <div style={styles.page}>

      {/* =====================================================
          LEFT BRAND PANEL
      ===================================================== */}

      <section style={styles.brandPanel}>

        <div style={styles.brandOverlay} />

        <div style={styles.brandContent}>

          <img
            src="/samplogy-logo.png"
            alt="Samplogy"
            style={styles.logo}
          />

          <div style={styles.brandTag}>
            SAMPLE DELIVERY PLATFORM
          </div>

          <h1 style={styles.brandTitle}>
            Smarter sample
            <br />
            management.
          </h1>

          <p style={styles.brandDescription}>
            Samplogy connects healthcare teams,
            laboratories and administrators through
            one secure laboratory workflow.
          </p>

          <div style={styles.divider} />

          <div style={styles.brandPoints}>

            <div style={styles.brandPoint}>
              <span style={styles.pointIcon}>✓</span>
              <span>Secure healthcare workflow</span>
            </div>

            <div style={styles.brandPoint}>
              <span style={styles.pointIcon}>✓</span>
              <span>Connected laboratory operations</span>
            </div>

            <div style={styles.brandPoint}>
              <span style={styles.pointIcon}>✓</span>
              <span>Reliable sample management</span>
            </div>

          </div>

          <div style={styles.brandBottom}>
            <span style={styles.statusDot} />
            Secure healthcare platform
          </div>

        </div>

      </section>

      {/* =====================================================
          RIGHT LOGIN PANEL
      ===================================================== */}

      <section style={styles.loginPanel}>

        <div style={styles.loginContainer}>

          {/* MOBILE LOGO */}

          <div style={styles.mobileLogoContainer}>
            <img
              src="/samplogy-logo.png"
              alt="Samplogy"
              style={styles.mobileLogo}
            />
          </div>

          {/* LOGIN HEADER */}

          <div style={styles.header}>

            <span style={styles.welcomeLabel}>
              WELCOME BACK
            </span>

            <h2 style={styles.title}>
              Sign in to your account
            </h2>

            <p style={styles.subtitle}>
              Enter your credentials to access
              the Samplogy platform.
            </p>

          </div>

          {/* FORM */}

          <form onSubmit={handleLogin}>

            {/* EMAIL */}

            <div style={styles.formGroup}>

              <label style={styles.label}>
                Email address
              </label>

              <div style={styles.inputWrapper}>

                <span style={styles.inputIcon}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="14"
                      rx="2"
                    />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="Enter your email"
                  style={styles.input}
                  autoComplete="email"
                  required
                />

              </div>

            </div>

            {/* PASSWORD */}

            <div style={styles.formGroup}>

              <label style={styles.label}>
                Password
              </label>

              <div style={styles.inputWrapper}>

                <span style={styles.inputIcon}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect
                      x="4"
                      y="10"
                      width="16"
                      height="11"
                      rx="2"
                    />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  style={styles.passwordInput}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  style={styles.showButton}
                >
                  {showPassword ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 4.3A10.8 10.8 0 0 1 12 4c5 0 8.7 4 10 8-0.4 1.2-1.1 2.5-2 3.6" />
                      <path d="M6.6 6.6C4.7 7.9 3.4 10 2 12c1.3 4 5 8 10 8 1 0 2-.2 2.9-.5" />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                      />
                    </svg>
                  )}
                </button>

              </div>

            </div>

            {/* ERROR */}

            {error && (
              <div style={styles.errorBox}>

                <div style={styles.errorIcon}>
                  !
                </div>

                <div style={styles.errorContent}>

                  <strong style={styles.errorTitle}>
                    Sign in failed
                  </strong>

                  <span style={styles.errorMessage}>
                    {error}
                  </span>

                </div>

              </div>
            )}

            {/* LOGIN BUTTON */}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.loginButton,
                opacity: loading ? 0.7 : 1,
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
              }}
            >

              {loading ? (
                <>
                  <span style={styles.spinner} />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <span style={styles.arrow}>
                    →
                  </span>
                </>
              )}

            </button>

          </form>

          {/* SECURITY */}

          <div style={styles.security}>

            <div style={styles.securityIcon}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect
                  x="4"
                  y="10"
                  width="16"
                  height="11"
                  rx="2"
                />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
            </div>

            <div>
              <strong style={styles.securityTitle}>
                Secure access
              </strong>

              <span style={styles.securityText}>
                Your account information is protected.
              </span>
            </div>

          </div>

          {/* FOOTER */}

          <div style={styles.footer}>
            <span>
              © {new Date().getFullYear()} Samplogy
            </span>

            <span style={styles.footerDot}>
              •
            </span>

            <span>
              Sample Delivery & Laboratory Management
            </span>
          </div>

        </div>

      </section>

    </div>
  );
}

const styles = {
  // =====================================================
  // PAGE
  // =====================================================

  page: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "48% 52%",
    background: "#f7fafb",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
  },

  // =====================================================
  // BRAND PANEL
  // =====================================================

  brandPanel: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    padding: "70px",
    boxSizing: "border-box",
    color: "#ffffff",
    background:
      "linear-gradient(145deg, #064d56 0%, #076d77 48%, #098995 100%)",
  },

  brandOverlay: {
    position: "absolute",
    width: "620px",
    height: "620px",
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.08)",
    right: "-330px",
    bottom: "-250px",
  },

  brandContent: {
    width: "100%",
    maxWidth: "520px",
    position: "relative",
    zIndex: 2,
  },

  logo: {
    width: "190px",
    maxWidth: "100%",
    height: "auto",
    objectFit: "contain",
    marginBottom: "45px",
    filter:
      "brightness(0) invert(1) drop-shadow(0 7px 18px rgba(0,0,0,0.12))",
  },

  brandTag: {
    fontSize: "10px",
    fontWeight: "800",
    letterSpacing: "2px",
    opacity: 0.65,
    marginBottom: "18px",
  },

  brandTitle: {
    margin: 0,
    fontSize: "52px",
    lineHeight: 1.08,
    letterSpacing: "-2px",
    fontWeight: "800",
  },

  brandDescription: {
    maxWidth: "470px",
    margin: "24px 0 0",
    fontSize: "16px",
    lineHeight: 1.75,
    opacity: 0.76,
  },

  divider: {
    width: "55px",
    height: "3px",
    borderRadius: "10px",
    background: "#ffffff",
    opacity: 0.8,
    margin: "32px 0",
  },

  brandPoints: {
    display: "grid",
    gap: "14px",
  },

  brandPoint: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "13px",
    fontWeight: "500",
    opacity: 0.86,
  },

  pointIcon: {
    width: "25px",
    height: "25px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.15)",
    fontSize: "11px",
    fontWeight: "800",
  },

  brandBottom: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "55px",
    fontSize: "11px",
    opacity: 0.55,
  },

  statusDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#8ee7df",
    boxShadow: "0 0 0 4px rgba(142,231,223,0.08)",
  },

  // =====================================================
  // LOGIN PANEL
  // =====================================================

  loginPanel: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "50px 70px",
    boxSizing: "border-box",
    background: "#f8fbfc",
  },

  loginContainer: {
    width: "100%",
    maxWidth: "470px",
  },

  mobileLogoContainer: {
    display: "none",
    textAlign: "center",
    marginBottom: "35px",
  },

  mobileLogo: {
    width: "150px",
    height: "auto",
  },

  // =====================================================
  // HEADER
  // =====================================================

  header: {
    marginBottom: "34px",
  },

  welcomeLabel: {
    display: "inline-block",
    color: "#087f8c",
    fontSize: "10px",
    fontWeight: "850",
    letterSpacing: "1.8px",
    marginBottom: "13px",
  },

  title: {
    margin: 0,
    color: "#162936",
    fontSize: "34px",
    lineHeight: 1.2,
    fontWeight: "800",
    letterSpacing: "-0.8px",
  },

  subtitle: {
    margin: "11px 0 0",
    color: "#7b8b94",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  // =====================================================
  // FORM
  // =====================================================

  formGroup: {
    marginBottom: "21px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    color: "#31434f",
    fontSize: "12px",
    fontWeight: "750",
  },

  inputWrapper: {
    position: "relative",
    width: "100%",
  },

  inputIcon: {
    position: "absolute",
    left: "15px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#9aaab1",
    display: "flex",
    alignItems: "center",
    pointerEvents: "none",
    zIndex: 2,
  },

  input: {
    width: "100%",
    height: "54px",
    boxSizing: "border-box",
    border: "1px solid #dce5e8",
    borderRadius: "11px",
    padding: "0 16px 0 44px",
    background: "#ffffff",
    color: "#172b38",
    fontSize: "14px",
    outline: "none",
    transition:
      "border-color 0.2s, box-shadow 0.2s",
  },

  passwordInput: {
    width: "100%",
    height: "54px",
    boxSizing: "border-box",
    border: "1px solid #dce5e8",
    borderRadius: "11px",
    padding: "0 55px 0 44px",
    background: "#ffffff",
    color: "#172b38",
    fontSize: "14px",
    outline: "none",
    transition:
      "border-color 0.2s, box-shadow 0.2s",
  },

  showButton: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "32px",
    height: "32px",
    border: "none",
    background: "transparent",
    color: "#82949c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },

  // =====================================================
  // ERROR
  // =====================================================

  errorBox: {
    display: "flex",
    gap: "11px",
    alignItems: "flex-start",
    padding: "13px 14px",
    marginBottom: "18px",
    borderRadius: "11px",
    border: "1px solid #f1d2d2",
    background: "#fff8f8",
    color: "#a52a2a",
  },

  errorIcon: {
    width: "21px",
    height: "21px",
    minWidth: "21px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#d83b3b",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: "900",
  },

  errorContent: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    fontSize: "12px",
    lineHeight: 1.45,
  },

  errorTitle: {
    fontSize: "12px",
    fontWeight: "800",
  },

  errorMessage: {
    opacity: 0.88,
  },

  // =====================================================
  // BUTTON
  // =====================================================

  loginButton: {
    width: "100%",
    height: "54px",
    border: "none",
    borderRadius: "11px",
    background:
      "linear-gradient(135deg, #087f8c 0%, #066c76 100%)",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "800",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "11px",
    boxShadow:
      "0 9px 24px rgba(8,127,140,0.20)",
  },

  arrow: {
    fontSize: "19px",
    lineHeight: 1,
    marginTop: "-1px",
  },

  spinner: {
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.35)",
    borderTopColor: "#ffffff",
    borderRadius: "50%",
    display: "inline-block",
    animation:
      "samplogySpinner 0.8s linear infinite",
  },

  // =====================================================
  // SECURITY
  // =====================================================

  security: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    marginTop: "28px",
    padding: "14px",
    borderRadius: "11px",
    border: "1px solid #e9eff1",
    background: "#ffffff",
  },

  securityIcon: {
    width: "30px",
    height: "30px",
    minWidth: "30px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#edf8f9",
    color: "#087f8c",
  },

  securityTitle: {
    display: "block",
    color: "#42545e",
    fontSize: "11px",
    fontWeight: "800",
    marginBottom: "2px",
  },

  securityText: {
    display: "block",
    color: "#94a1a8",
    fontSize: "10px",
  },

  // =====================================================
  // FOOTER
  // =====================================================

  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "7px",
    marginTop: "27px",
    color: "#a1adb3",
    fontSize: "10px",
    textAlign: "center",
  },

  footerDot: {
    color: "#cbd3d6",
  },
};

export default Login;