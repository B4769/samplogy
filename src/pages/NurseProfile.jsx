import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./NurseProfile.css";

function NurseProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [cityName, setCityName] = useState("—");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      setError("");

      // Get the existing Supabase session.
      // NurseProtectedPage has already confirmed that
      // the user is authenticated.
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const user = session?.user;

      if (!user) {
        setError("Your session could not be restored. Please log in again.");
        setLoading(false);
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          username,
          role,
          city_id,
          status,
          first_login,
          profile_completed,
          approved_at,
          created_at,
          updated_at
        `)
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      setProfile(data);

      if (data?.city_id) {
        const { data: city, error: cityError } = await supabase
          .from("cities")
          .select("id, name")
          .eq("id", data.city_id)
          .maybeSingle();

        if (!cityError && city) {
          setCityName(city.name);
        } else {
          setCityName("—");
        }
      } else {
        setCityName("—");
      }
    } catch (err) {
      console.error("Nurse profile error:", err);
      setError(
        err?.message || "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInitialProfile = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (sessionError) {
          throw sessionError;
        }

        const user = session?.user;

        if (!user) {
          setError(
            "Your session could not be restored. Please log in again."
          );
          setLoading(false);
          return;
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            username,
            role,
            city_id,
            status,
            first_login,
            profile_completed,
            approved_at,
            created_at,
            updated_at
          `)
          .eq("id", user.id)
          .single();

        if (cancelled) return;

        if (profileError) {
          throw profileError;
        }

        setProfile(data);

        if (data?.city_id) {
          const { data: city, error: cityError } = await supabase
            .from("cities")
            .select("id, name")
            .eq("id", data.city_id)
            .maybeSingle();

          if (!cancelled && !cityError && city) {
            setCityName(city.name);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Nurse profile error:", err);

          setError(
            err?.message || "Unable to load your profile."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadInitialProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getInitial = () => {
    return (
      profile?.full_name?.charAt(0)?.toUpperCase() ||
      profile?.username?.charAt(0)?.toUpperCase() ||
      "N"
    );
  };

  if (loading) {
    return (
      <div className="nurse-profile-page">
        <div className="profile-loading">
          <div className="profile-spinner" />
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nurse-profile-page">
        <div className="profile-error">
          <h2>Unable to load profile</h2>
          <p>{error}</p>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              loadProfile();
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="nurse-profile-page">
      <header className="profile-page-header">
        <div>
          <p className="profile-breadcrumb">
            Samplogy / <span>Nurse Portal</span>
          </p>

          <h1>My Profile</h1>

          <p>
            View your account information and professional profile.
          </p>
        </div>

        <div className="profile-header-actions">
          <button
            type="button"
            className="profile-secondary-button"
            onClick={() => navigate("/nurse-dashboard")}
          >
            ← Dashboard
          </button>

          <button
            type="button"
            className="profile-primary-button"
            onClick={() => navigate("/change-password")}
          >
            Change Password
          </button>
        </div>
      </header>

      <main className="profile-content">
        <section className="profile-hero-card">
          <div className="profile-avatar-large">
            {getInitial()}
          </div>

          <div className="profile-hero-info">
            <h2>{profile?.full_name || "Nurse"}</h2>

            <p>@{profile?.username || "—"}</p>

            <span className="profile-role-badge">
              {profile?.role === "nurse"
                ? "Nurse"
                : profile?.role || "—"}
            </span>
          </div>

          <div className="profile-status">
            <span
              className={`status-dot ${
                profile?.status?.toLowerCase() || ""
              }`}
            />

            <div>
              <strong>{profile?.status || "—"}</strong>
              <small>Account status</small>
            </div>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-card-heading">
            <div className="profile-card-icon">👤</div>

            <div>
              <h3>Personal Information</h3>
              <p>Your registered account details</p>
            </div>
          </div>

          <div className="profile-grid">
            <div className="profile-field">
              <span>Full Name</span>
              <strong>{profile?.full_name || "—"}</strong>
            </div>

            <div className="profile-field">
              <span>Username</span>
              <strong>
                {profile?.username
                  ? `@${profile.username}`
                  : "—"}
              </strong>
            </div>

            <div className="profile-field">
              <span>Role</span>
              <strong>
                {profile?.role === "nurse"
                  ? "Nurse"
                  : profile?.role || "—"}
              </strong>
            </div>

            <div className="profile-field">
              <span>City / Town</span>
              <strong>{cityName}</strong>
            </div>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-card-heading">
            <div className="profile-card-icon">✓</div>

            <div>
              <h3>Account Information</h3>
              <p>Profile and approval status</p>
            </div>
          </div>

          <div className="profile-grid">
            <div className="profile-field">
              <span>Profile Completed</span>

              <strong>
                {profile?.profile_completed
                  ? "Completed"
                  : "Incomplete"}
              </strong>
            </div>

            <div className="profile-field">
              <span>Account Status</span>
              <strong>{profile?.status || "—"}</strong>
            </div>

            <div className="profile-field">
              <span>Approved Date</span>
              <strong>
                {formatDate(profile?.approved_at)}
              </strong>
            </div>

            <div className="profile-field">
              <span>Member Since</span>
              <strong>
                {formatDate(profile?.created_at)}
              </strong>
            </div>
          </div>
        </section>

        <section className="profile-security-card">
          <div>
            <h3>Account Security</h3>

            <p>
              Keep your account secure by using a strong
              password and changing it regularly.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/change-password")}
          >
            Change Password
          </button>
        </section>
      </main>
    </div>
  );
}

export default NurseProfile;