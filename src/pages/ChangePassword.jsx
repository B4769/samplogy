import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const PASSWORD_REQUIREMENTS = /^(?=.*[A-Za-z])(?=.*[0-9]).{8,}$/;

function ChangePassword() {
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!newPassword || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (!PASSWORD_REQUIREMENTS.test(newPassword)) {
      setError(
        "Password must be at least 8 characters and include at least one letter and one number."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // =====================================================
      // 1. VERIFY CURRENT SESSION
      // =====================================================

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error(
          "Your login session has expired. Please log in again."
        );
      }

      // =====================================================
      // 2. UPDATE SUPABASE AUTH PASSWORD
      // =====================================================

      const { error: passwordError } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (passwordError) {
        throw new Error(
          passwordError.message || "Unable to change password."
        );
      }

      // =====================================================
      // 3. CLEAR must_change_password SECURELY
      // =====================================================

      const { data, error: functionError } =
        await supabase.functions.invoke("complete-password-change", {
          body: {},
        });

      if (functionError) {
        console.error(
          "Password completion function error:",
          functionError
        );

        throw new Error(
          "Password changed, but the account could not be updated. Please contact the administrator."
        );
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            "Password changed, but the account could not be updated."
        );
      }

      // =====================================================
      // 4. SUCCESS
      // =====================================================

      setSuccess(
        "Password changed successfully. Please continue to complete your profile."
      );

      // Give the user a moment to see the success message.
      setTimeout(() => {
        navigate("/complete-profile", { replace: true });
      }, 800);
    } catch (err) {
      console.error("Change password error:", err);

      setError(
        err?.message ||
          "Something went wrong while changing your password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>🔐</div>

        <h1 style={styles.title}>Change Your Password</h1>

        <p style={styles.subtitle}>
          For security, you must change your temporary password before
          continuing.
        </p>

        <div style={styles.requirements}>
          <strong>Password requirements:</strong>
          <ul>
            <li>At least 8 characters</li>
            <li>At least one letter</li>
            <li>At least one number</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>New Password</label>

            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              style={styles.input}
              autoComplete="new-password"
              disabled={loading}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Confirm New Password</label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              placeholder="Confirm new password"
              style={styles.input}
              autoComplete="new-password"
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          {success && (
            <div style={styles.success}>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? "Changing Password..."
              : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fb",
    fontFamily: "Inter, Arial, sans-serif",
    padding: "20px",
    boxSizing: "border-box",
  },

  card: {
    width: "420px",
    maxWidth: "100%",
    backgroundColor: "#ffffff",
    padding: "40px",
    borderRadius: "18px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    boxSizing: "border-box",
  },

  logo: {
    width: "55px",
    height: "55px",
    margin: "0 auto 15px",
    borderRadius: "15px",
    backgroundColor: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "26px",
  },

  title: {
    textAlign: "center",
    margin: 0,
    fontSize: "25px",
    color: "#1e293b",
  },

  subtitle: {
    textAlign: "center",
    color: "#64748b",
    fontSize: "14px",
    lineHeight: "1.5",
    marginBottom: "25px",
  },

  requirements: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "12px 15px",
    marginBottom: "22px",
    color: "#475569",
    fontSize: "13px",
  },

  formGroup: {
    display: "flex",
    flexDirection: "column",
    marginBottom: "18px",
  },

  label: {
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "7px",
    color: "#334155",
  },

  input: {
    padding: "12px",
    border: "1px solid #dbe2ea",
    borderRadius: "9px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    width: "100%",
  },

  error: {
    backgroundColor: "#fff1f2",
    color: "#dc2626",
    padding: "10px",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "15px",
  },

  success: {
    backgroundColor: "#f0fdf4",
    color: "#15803d",
    padding: "10px",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "15px",
  },

  button: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "9px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

export default ChangePassword;