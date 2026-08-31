import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function CompleteProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);
  const [qualification, setQualification] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // =====================================================
  // LOAD PROFILE
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        setError("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          throw new Error("No logged-in user found. Please log in again.");
        }

        console.log("Logged-in user:", user.id);

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        console.log("Profile loaded:", data);

        if (!mounted) return;

        setProfile(data);

        // Database status values:
        // Active / Inactive / Pending / Rejected

        if (
          data.profile_completed === true &&
          data.status === "Pending"
        ) {
          setSubmitted(true);
        }
      } catch (err) {
        console.error("Error loading profile:", err);

        if (mounted) {
          setError(
            err.message || "Unable to load your profile."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  // =====================================================
  // SUBMIT PROFILE
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!idFront || !idBack || !qualification) {
      setError(
        "Please upload the front and back of your ID and your license or degree."
      );
      return;
    }

    try {
      setSubmitting(true);

      // -------------------------------------------------
      // GET CURRENT USER
      // -------------------------------------------------

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      console.log("Submitting profile for:", user.id);

      // -------------------------------------------------
      // FILE NAMES
      // -------------------------------------------------

      const timestamp = Date.now();

      const idFrontName =
        `${user.id}/id-front-${timestamp}-${idFront.name}`;

      const idBackName =
        `${user.id}/id-back-${timestamp}-${idBack.name}`;

      const qualificationName =
        `${user.id}/qualification-${timestamp}-${qualification.name}`;

      // -------------------------------------------------
      // UPLOAD ID FRONT
      // -------------------------------------------------

      const { error: frontError } = await supabase.storage
        .from("documents")
        .upload(idFrontName, idFront);

      if (frontError) {
        throw new Error(
          `ID front upload failed: ${frontError.message}`
        );
      }

      // -------------------------------------------------
      // UPLOAD ID BACK
      // -------------------------------------------------

      const { error: backError } = await supabase.storage
        .from("documents")
        .upload(idBackName, idBack);

      if (backError) {
        throw new Error(
          `ID back upload failed: ${backError.message}`
        );
      }

      // -------------------------------------------------
      // UPLOAD LICENSE / DEGREE
      // -------------------------------------------------

      const { error: qualificationError } =
        await supabase.storage
          .from("documents")
          .upload(
            qualificationName,
            qualification
          );

      if (qualificationError) {
        throw new Error(
          `License/Degree upload failed: ${qualificationError.message}`
        );
      }

      // -------------------------------------------------
      // UPDATE PROFILE
      // -------------------------------------------------

      const { data, error: functionError } = await supabase.functions.invoke(
        "resubmit-profile",
        {
          body: {
            id_front_url: idFrontName,
            id_back_url: idBackName,
            license_degree_url: qualificationName,
          },
        }
      );

      const updatedProfile = data?.profile;
      const updateError = functionError || (!updatedProfile
        ? new Error("The profile could not be submitted for review.")
        : null);

      if (updateError) {
        console.error(
          "PROFILE UPDATE ERROR:",
          updateError
        );

        throw updateError;
      }

      console.log(
        "Profile successfully updated:",
        updatedProfile
      );

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      setProfile(updatedProfile);
      localStorage.setItem(
        "currentUser",
        JSON.stringify(updatedProfile)
      );
      setSubmitted(true);
    } catch (err) {
      console.error(
        "Error submitting profile:",
        err
      );

      setError(
        err.message ||
          "Something went wrong while submitting your profile."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2 style={styles.title}>
            Loading Profile...
          </h2>

          <p style={styles.info}>
            Please wait.
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // PROFILE ERROR
  // =====================================================

  if (!profile) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2 style={styles.title}>
            Profile Error
          </h2>

          <div style={styles.error}>
            {error || "Profile could not be found."}
          </div>

          <button
            style={styles.button}
            onClick={handleLogout}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // =====================================================
  // PENDING APPROVAL
  // =====================================================

  if (
    submitted ||
    (profile.profile_completed === true &&
      profile.status === "Pending")
  ) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>

          <div style={styles.pendingIcon}>
            ⏳
          </div>

          <h1 style={styles.title}>
            Profile Submitted
          </h1>

          <p style={styles.subtitle}>
            Your profile is waiting for approval.
          </p>

          <div style={styles.pendingBox}>
            <h3 style={styles.pendingTitle}>
              Account Under Review
            </h3>

            <p style={styles.pendingText}>
              Thank you for completing your profile.
              Your identification and professional
              documents have been submitted successfully.
            </p>

            <p style={styles.pendingText}>
              An administrator will review your
              information and activate your account.
            </p>
          </div>

          <div style={styles.statusBox}>
            <span style={styles.statusDot}>
              ●
            </span>

            <strong>
              Pending Administrator Approval
            </strong>
          </div>

          <p style={styles.note}>
            You will be able to access your dashboard
            after your account has been approved.
          </p>

          <button
            style={styles.logoutButton}
            onClick={handleLogout}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // =====================================================
  // COMPLETE PROFILE FORM
  // =====================================================

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <div style={styles.logo}>
          🏥
        </div>

        <h1 style={styles.title}>
          Complete Your Profile
        </h1>

        <p style={styles.subtitle}>
          Welcome,{" "}
          {profile.full_name || profile.username}
        </p>

        <p style={styles.info}>
          {profile.status === "Rejected"
            ? "Update the required documents and submit your corrections for another review."
            : "Since this is your first login, please submit the required identification and professional documents."}
        </p>

        {profile.status === "Rejected" && (
          <div style={styles.rejectionBox}>
            <strong>Profile corrections required</strong>
            <p>{profile.rejection_reason || "Please correct your profile and documents."}</p>
          </div>
        )}

        {/* USER INFORMATION */}

        <div style={styles.userInfo}>

          <div>
            <span style={styles.infoLabel}>
              Full Name
            </span>

            <strong>
              {profile.full_name || "Not provided"}
            </strong>
          </div>

          <div>
            <span style={styles.infoLabel}>
              Username
            </span>

            <strong>
              @{profile.username || "N/A"}
            </strong>
          </div>

          <div>
            <span style={styles.infoLabel}>
              Role
            </span>

            <strong>
              {profile.role || "N/A"}
            </strong>
          </div>

          <div>
            <span style={styles.infoLabel}>
              City
            </span>

            <strong>
              {profile.city_id || "Not assigned"}
            </strong>
          </div>

        </div>

        <form onSubmit={handleSubmit}>

          {/* ID FRONT */}

          <div style={styles.formGroup}>
            <label style={styles.label}>
              ID Document — Front *
            </label>

            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) =>
                setIdFront(
                  e.target.files?.[0] || null
                )
              }
              style={styles.fileInput}
            />

            {idFront && (
              <p style={styles.fileName}>
                ✓ {idFront.name}
              </p>
            )}
          </div>

          {/* ID BACK */}

          <div style={styles.formGroup}>
            <label style={styles.label}>
              ID Document — Back *
            </label>

            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) =>
                setIdBack(
                  e.target.files?.[0] || null
                )
              }
              style={styles.fileInput}
            />

            {idBack && (
              <p style={styles.fileName}>
                ✓ {idBack.name}
              </p>
            )}
          </div>

          {/* LICENSE / DEGREE */}

          <div style={styles.formGroup}>
            <label style={styles.label}>
              License / Degree *
            </label>

            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) =>
                setQualification(
                  e.target.files?.[0] || null
                )
              }
              style={styles.fileInput}
            />

            {qualification && (
              <p style={styles.fileName}>
                ✓ {qualification.name}
              </p>
            )}
          </div>

          {/* ERROR */}

          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...styles.button,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting
              ? "Submitting..."
                : profile.status === "Rejected"
                  ? "Submit Corrections for Review"
                  : "Save Profile and Continue"}
          </button>

        </form>

        <p style={styles.securityNote}>
          🔒 Your documents are stored securely with
          your profile.
        </p>

      </div>
    </div>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f5f7fb",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "30px",
    fontFamily: "Inter, Arial, sans-serif",
  },

  card: {
    width: "520px",
    maxWidth: "100%",
    backgroundColor: "#ffffff",
    borderRadius: "18px",
    padding: "40px",
    boxShadow:
      "0 10px 35px rgba(0,0,0,0.08)",
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

  pendingIcon: {
    width: "70px",
    height: "70px",
    margin: "0 auto 20px",
    borderRadius: "50%",
    backgroundColor: "#fef3c7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
  },

  title: {
    textAlign: "center",
    margin: 0,
    fontSize: "26px",
    color: "#1e293b",
  },

  subtitle: {
    textAlign: "center",
    color: "#2563eb",
    fontWeight: "600",
    margin: "8px 0 20px",
  },

  info: {
    textAlign: "center",
    color: "#64748b",
    fontSize: "13px",
    lineHeight: "1.6",
    marginBottom: "25px",
  },

  rejectionBox: {
    backgroundColor: "#fff1f2",
    border: "1px solid #fecdd3",
    color: "#9f1239",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "20px",
    fontSize: "13px",
    lineHeight: "1.5",
  },

  userInfo: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, 1fr)",
    gap: "12px",
    padding: "16px",
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    marginBottom: "25px",
  },

  infoLabel: {
    display: "block",
    fontSize: "11px",
    color: "#94a3b8",
    marginBottom: "4px",
  },

  formGroup: {
    display: "flex",
    flexDirection: "column",
    marginBottom: "20px",
  },

  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
    marginBottom: "8px",
  },

  fileInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #dbe2ea",
    borderRadius: "9px",
    padding: "10px",
    backgroundColor: "#ffffff",
    fontSize: "13px",
  },

  fileName: {
    margin: "7px 0 0",
    fontSize: "12px",
    color: "#16a34a",
  },

  error: {
    backgroundColor: "#fff1f2",
    color: "#dc2626",
    padding: "11px",
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

  pendingBox: {
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "18px",
  },

  pendingTitle: {
    margin: "0 0 10px",
    color: "#92400e",
    fontSize: "16px",
  },

  pendingText: {
    margin: "8px 0",
    color: "#78350f",
    fontSize: "13px",
    lineHeight: "1.6",
  },

  statusBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px",
    borderRadius: "8px",
    backgroundColor: "#f8fafc",
    color: "#475569",
    fontSize: "13px",
  },

  statusDot: {
    color: "#f59e0b",
  },

  note: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "12px",
    lineHeight: "1.5",
    margin: "18px 0",
  },

  logoutButton: {
    width: "100%",
    padding: "12px",
    border: "1px solid #dbe2ea",
    borderRadius: "9px",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontWeight: "600",
    cursor: "pointer",
  },

  securityNote: {
    textAlign: "center",
    marginTop: "20px",
    fontSize: "11px",
    color: "#94a3b8",
    lineHeight: "1.5",
  },
};

export default CompleteProfile;
