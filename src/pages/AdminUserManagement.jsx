import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const ROLES = ["admin", "nurse", "lab_technician"];
const PASSWORD_REQUIREMENTS = /^(?=.*[A-Za-z])(?=.*[0-9]).{8,}$/;
const PASSWORD_REQUIREMENTS_MESSAGE =
  "Password must be at least 8 characters and include at least one letter and one number.";

const EMPTY_FORM = {
  full_name: "",
  username: "",
  email: "",
  password: "",
  role: "",
  city_id: "",
};

async function getVerifiedAdminSession() {
  let { data: { session }, error } = await supabase.auth.getSession();

  if (error) throw error;

  // If the cached session is missing, try to restore it before failing.
  if (!session) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error) throw refreshed.error;
    session = refreshed.data.session;
  }

  if (!session?.user?.id) {
    throw new Error("No active session. Please log in again.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, username, role, status")
    .eq("id", session.user.id)
    .single();

  if (profileError) throw profileError;

  if (profile?.role !== "admin") {
    throw new Error("This account is not an administrator.");
  }

  if (profile?.status !== "Active") {
    throw new Error(`Administrator account is ${profile?.status || "not active"}. Please activate it first.`);
  }

  return { session, profile };
}


function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [cities, setCities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rejectionTarget, setRejectionTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);

  // =====================================================
  // LOAD USERS + CITIES
  // =====================================================

  useEffect(() => {
    let cancelled = false;

    async function initializePage() {
      try {
        setLoading(true);
        setCitiesLoading(true);
        setError("");

        await getVerifiedAdminSession();

        const [usersResult, citiesResult] = await Promise.all([
          supabase
            .from("profiles")
            .select(`
              id, full_name, username, role, city_id, status,
              first_login, profile_completed, id_front_url, id_back_url,
              license_degree_url, approved_by, approved_at, rejection_reason,
              rejected_by, rejected_at, created_at, updated_at
            `)
            .order("created_at", { ascending: false }),

          supabase
            .from("cities")
            .select("id, name")
            .order("name", { ascending: true }),
        ]);

        if (usersResult.error) throw usersResult.error;
        if (citiesResult.error) throw citiesResult.error;

        if (!cancelled) {
          setUsers(usersResult.data || []);
          setCities(citiesResult.data || []);
          setLoading(false);
          setCitiesLoading(false);
        }
      } catch (err) {
        console.error("Admin initialization error:", err);

        if (!cancelled) {
          setError(err.message || "Unable to load admin data.");
          setLoading(false);
          setCitiesLoading(false);
        }
      }
    }

    initializePage();

    return () => {
      cancelled = true;
    };
  }, []);

  // =====================================================
  // REFRESH USERS
  // =====================================================

  const refreshUsers = async () => {
    try {
      setError("");
      await getVerifiedAdminSession();

      const { data, error: fetchError } = await supabase
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
        `)
        .order("created_at", {
          ascending: false,
        });

      if (fetchError) {
        throw fetchError;
      }

      setUsers(data || []);
    } catch (err) {
      console.error("Refresh error:", err);

      setError(
        err.message || "Unable to refresh users."
      );
    }
  };

  // =====================================================
  // CITY NAME
  // =====================================================

  const getCityName = (cityId) => {
    if (!cityId) {
      return "Not assigned";
    }

    const city = cities.find(
      (item) => item.id === cityId
    );

    return city?.name || cityId;
  };

  // =====================================================
  // FORM CHANGE
  // =====================================================


  const closeCreateUserModal = () => {
    if (creatingUser) return;
    setShowPassword(false);
    setShowCreateModal(false);
    setForm(EMPTY_FORM);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // =====================================================
  // CREATE USER
  // =====================================================

  const createUser = async (e) => {
    e.preventDefault();

    if (creatingUser) {
      return;
    }

    try {
      setCreatingUser(true);
      setError("");

      if (!form.full_name.trim()) {
        throw new Error("Full name is required.");
      }

      if (!form.username.trim()) {
        throw new Error("Username is required.");
      }

      if (!form.email.trim()) {
        throw new Error("Email is required.");
      }

      if (!form.password) {
        throw new Error("Password is required.");
      }

      if (!PASSWORD_REQUIREMENTS.test(form.password)) {
        throw new Error(PASSWORD_REQUIREMENTS_MESSAGE);
      }

      if (!ROLES.includes(form.role)) {
        throw new Error("Invalid user role.");
      }

      if (!form.city_id) {
        throw new Error("Please select a city.");
      }

      console.log("Creating user:", {
        full_name: form.full_name,
        username: form.username,
        email: form.email,
        role: form.role,
        city_id: form.city_id,
      });

      // Verify the current account is still an active administrator.
      await getVerifiedAdminSession();

      // Call Edge Function
      const { data, error: functionError } =
        await supabase.functions.invoke("create-user", {
          body: {
            full_name: form.full_name.trim(),
            username: form.username.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
            role: form.role,
            city_id: form.city_id,
          },
        });

      console.log("Create user response:", data);
      console.log("Create user error:", functionError);

      if (functionError) {
        // Try to read the actual Edge Function response
        let message =
          functionError.message ||
          "Unable to create user.";

        try {
          if (functionError.context) {
            const response = functionError.context;

            if (response instanceof Response) {
              const text = await response.text();

              console.error(
                "Edge Function response:",
                text
              );

              try {
                const json = JSON.parse(text);

                if (json?.error) {
                  message = json.error;
                }

                if (json?.message) {
                  message = json.message;
                }
              } catch {
                if (text) {
                  message = text;
                }
              }
            }
          }
        } catch (readError) {
          console.error(
            "Could not read function error:",
            readError
          );
        }

        throw new Error(message);
      }

      if (!data) {
        throw new Error(
          "The server did not return a response."
        );
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Success
      alert("User created successfully.");

      setForm(EMPTY_FORM);
      setShowPassword(false);
      setShowCreateModal(false);

      await refreshUsers();
    } catch (err) {
      console.error("Error creating user:", err);

      setError(
        err.message || "Unable to create user."
      );
    } finally {
      setCreatingUser(false);
    }
  };

  // =====================================================
  // UPDATE STATUS
  // =====================================================

  const applyReviewedUser = (reviewedUser) => {
    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === reviewedUser.id
          ? { ...user, ...reviewedUser }
          : user
      )
    );

    setSelectedUser((currentUser) =>
      currentUser?.id === reviewedUser.id
        ? { ...currentUser, ...reviewedUser }
        : currentUser
    );
  };

  const reviewUser = async (userId, action, reason = "") => {
    try {
      setProcessingId(userId);
      setError("");

      // Verify the current account before calling the protected Edge Function.
      await getVerifiedAdminSession();

      const { data, error: reviewError } = await supabase.functions.invoke(
        "review-user",
        {
          body: {
            user_id: userId,
            action,
            rejection_reason: reason,
          },
        }
      );

      if (reviewError) {
        throw reviewError;
      }

      if (!data?.user) {
        throw new Error("The review could not be completed.");
      }

      applyReviewedUser(data.user);
      return true;
    } catch (err) {
      console.error(
        "Error updating status:",
        err
      );

      setError(
        err.message ||
          "Unable to update user status."
      );
      return false;
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectionModal = (user) => {
    setRejectionTarget(user);
    setRejectionReason("");
  };

  const submitRejection = async (event) => {
    event.preventDefault();

    const reason = rejectionReason.trim();

    if (!reason) {
      setError("A rejection reason is required.");
      return;
    }

    if (!rejectionTarget) {
      return;
    }

    const rejected = await reviewUser(rejectionTarget.id, "reject", reason);

    if (rejected) {
      setRejectionTarget(null);
      setRejectionReason("");
    }
  };

  // =====================================================
  // OPEN DOCUMENT
  // =====================================================

  const openDocument = async (filePath) => {
    if (!filePath) {
      alert("No document uploaded.");
      return;
    }

    try {
      const { data, error } =
        await supabase.storage
          .from("documents")
          .createSignedUrl(
            filePath,
            60 * 10
          );

      if (error) {
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error(
          "Unable to generate document URL."
        );
      }

      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (err) {
      console.error(
        "Document opening error:",
        err
      );

      alert(
        err.message ||
          "Unable to open this document."
      );
    }
  };

  // =====================================================
  // STATUS STYLE
  // =====================================================

  const getStatusStyle = (status) => {
    switch (status) {
      case "Active":
        return styles.active;

      case "Pending":
        return styles.pending;

      case "Rejected":
        return styles.rejected;

      case "Inactive":
        return styles.inactive;

      default:
        return styles.inactive;
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>
            ⏳
          </div>

          <h2>Loading Users...</h2>

          <p>
            Please wait while we load the users.
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div style={styles.page}>

      {/* HEADER */}

      <div style={styles.header}>

        <div>
          <h1 style={styles.title}>
            User Management
          </h1>

          <p style={styles.subtitle}>
            Create, review and manage system users
          </p>
        </div>

        <div style={styles.headerActions}>

          <button
            onClick={refreshUsers}
            style={styles.refreshButton}
          >
            ↻ Refresh
          </button>

          <button
            onClick={() =>
              setShowCreateModal(true)
            }
            style={styles.addUserButton}
          >
            + Add User
          </button>

        </div>

      </div>

      {/* ERROR */}

      {error && (
        <div style={styles.error}>
          <strong>Error:</strong> {error}

          <button
            onClick={() => setError("")}
            style={styles.errorClose}
          >
            ×
          </button>
        </div>
      )}

      {/* STATISTICS */}

      <div style={styles.statsGrid}>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>
            Total Users
          </span>

          <strong style={styles.statNumber}>
            {users.length}
          </strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>
            Pending
          </span>

          <strong style={styles.statNumber}>
            {
              users.filter(
                (user) =>
                  user.status === "Pending"
              ).length
            }
          </strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>
            Active
          </span>

          <strong style={styles.statNumber}>
            {
              users.filter(
                (user) =>
                  user.status === "Active"
              ).length
            }
          </strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>
            Rejected
          </span>

          <strong style={styles.statNumber}>
            {
              users.filter(
                (user) =>
                  user.status === "Rejected"
              ).length
            }
          </strong>
        </div>

      </div>

      {/* USERS TABLE */}

      <div style={styles.tableCard}>

        <div style={styles.tableHeader}>
          <h2 style={styles.tableTitle}>
            Registered Users
          </h2>

          <span style={styles.userCount}>
            {users.length} users
          </span>
        </div>

        {users.length === 0 ? (
          <div style={styles.empty}>

            <div style={styles.emptyIcon}>
              👤
            </div>

            <h3>No users found</h3>

            <p>
              There are currently no registered
              users.
            </p>

          </div>
        ) : (
          <div style={styles.tableWrapper}>

            <table style={styles.table}>

              <thead>
                <tr>

                  <th style={styles.th}>
                    User
                  </th>

                  <th style={styles.th}>
                    Role
                  </th>

                  <th style={styles.th}>
                    City
                  </th>

                  <th style={styles.th}>
                    Status
                  </th>

                  <th style={styles.th}>
                    Profile
                  </th>

                  <th style={styles.th}>
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody>

                {users.map((user) => (

                  <tr key={user.id}>

                    {/* USER */}

                    <td style={styles.td}>

                      <div style={styles.userCell}>

                        <div style={styles.avatar}>
                          {(
                            user.full_name ||
                            user.username ||
                            "U"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>

                          <strong
                            style={
                              styles.userName
                            }
                          >
                            {user.full_name ||
                              "Unnamed User"}
                          </strong>

                          <span
                            style={
                              styles.username
                            }
                          >
                            @
                            {user.username ||
                              "N/A"}
                          </span>

                        </div>

                      </div>

                    </td>

                    {/* ROLE */}

                    <td style={styles.td}>

                      <span
                        style={
                          styles.roleBadge
                        }
                      >
                        {user.role || "N/A"}
                      </span>

                    </td>

                    {/* CITY */}

                    <td style={styles.td}>
                      {getCityName(
                        user.city_id
                      )}
                    </td>

                    {/* STATUS */}

                    <td style={styles.td}>

                      <span
                        style={{
                          ...styles.statusBadge,
                          ...getStatusStyle(
                            user.status
                          ),
                        }}
                      >
                        {user.status ||
                          "Unknown"}
                      </span>

                    </td>

                    {/* PROFILE */}

                    <td style={styles.td}>

                      <span
                        style={{
                          ...styles.profileBadge,
                          backgroundColor:
                            user.profile_completed
                              ? "#dcfce7"
                              : "#fef3c7",
                          color:
                            user.profile_completed
                              ? "#166534"
                              : "#92400e",
                        }}
                      >
                        {user.profile_completed
                          ? "Completed"
                          : "Incomplete"}
                      </span>

                    </td>

                    {/* ACTIONS */}

                    <td style={styles.td}>

                      <div
                        style={
                          styles.actionGroup
                        }
                      >

                        <button
                          style={
                            styles.viewButton
                          }
                          onClick={() =>
                            setSelectedUser(
                              user
                            )
                          }
                        >
                          View
                        </button>

                        {user.status ===
                          "Pending" && (
                          <>
                            <button
                              disabled={
                                processingId ===
                                user.id
                              }
                              style={
                                styles.approveButton
                              }
                              onClick={() =>
                                reviewUser(
                                  user.id,
                                  "approve"
                                )
                              }
                            >
                              {processingId ===
                              user.id
                                ? "..."
                                : "Approve"}
                            </button>

                            <button
                              disabled={
                                processingId ===
                                user.id
                              }
                              style={
                                styles.rejectButton
                              }
                              onClick={() =>
                                openRejectionModal(user)
                              }
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {user.status ===
                          "Active" && (
                          <button
                            disabled={
                              processingId ===
                              user.id
                            }
                            style={
                              styles.inactiveButton
                            }
                              onClick={() =>
                                reviewUser(
                                  user.id,
                                  "deactivate"
                                )
                            }
                          >
                            Deactivate
                          </button>
                        )}

                        {user.status ===
                          "Inactive" && (
                          <button
                            disabled={
                              processingId ===
                              user.id
                            }
                            style={
                              styles.approveButton
                            }
                            onClick={() =>
                              reviewUser(
                                user.id,
                                "activate"
                              )
                            }
                          >
                            {processingId === user.id ? "..." : "Activate"}
                          </button>
                        )}

                        {user.status ===
                          "Rejected" && (
                          <button
                            disabled={
                              processingId ===
                              user.id
                            }
                            style={
                              styles.approveButton
                            }
                            onClick={() =>
                              reviewUser(
                                user.id,
                                "approve"
                              )
                            }
                          >
                            {processingId === user.id ? "..." : "Re-approve"}
                          </button>
                        )}

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* =================================================
          CREATE USER MODAL
          ================================================= */}

      {showCreateModal && (

        <div
          style={styles.modalOverlay}
          onClick={() =>
            !creatingUser &&
            setShowCreateModal(false)
          }
        >

          <div
            style={styles.createModal}
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div style={styles.modalHeader}>

              <div>

                <h2 style={styles.modalTitle}>
                  Add New User
                </h2>

                <p
                  style={
                    styles.modalSubtitle
                  }
                >
                  Create a new system account
                </p>

              </div>

              <button
                disabled={creatingUser}
                style={styles.closeButton}
                onClick={closeCreateUserModal}
              >
                ×
              </button>

            </div>

            <form
              onSubmit={createUser}
              style={styles.createUserForm}
            >

              {/* FULL NAME */}

              <div style={styles.formField}>
                <label htmlFor="full_name" style={styles.label}>
                  Full Name <span style={styles.requiredMark}>*</span>
                </label>

                <input
                  id="full_name"
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleFormChange}
                  placeholder="Enter full name"
                  style={styles.input}
                  required
                  disabled={creatingUser}
                />
              </div>

              {/* USERNAME */}

              <div style={styles.formField}>
                <label htmlFor="username" style={styles.label}>
                  Username <span style={styles.requiredMark}>*</span>
                </label>

                <input
                  id="username"
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleFormChange}
                  placeholder="Enter username"
                  style={styles.input}
                  required
                  disabled={creatingUser}
                />
              </div>

              {/* EMAIL */}

              <div style={styles.formField}>
                <label htmlFor="email" style={styles.label}>
                  Email <span style={styles.requiredMark}>*</span>
                </label>

                <input
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleFormChange}
                  placeholder="user@example.com"
                  style={styles.input}
                  required
                  disabled={creatingUser}
                />
              </div>

              {/* PASSWORD */}

              <div style={styles.formField}>
                <label htmlFor="password" style={styles.label}>
                  Temporary Password <span style={styles.requiredMark}>*</span>
                </label>

                <div style={styles.passwordInputWrap}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleFormChange}
                    placeholder="Enter temporary password"
                    style={styles.passwordInput}
                    disabled={creatingUser}
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    style={styles.passwordToggle}
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={creatingUser}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    title={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {form.password && (
                  <div style={styles.passwordHint}>
                    <span
                      style={{
                        ...styles.passwordStatus,
                        color: PASSWORD_REQUIREMENTS.test(form.password)
                          ? "#15803d"
                          : "#b45309",
                      }}
                    >
                      {PASSWORD_REQUIREMENTS.test(form.password)
                        ? "✓ Password meets requirements"
                        : "Use at least 8 characters, including a letter and a number"}
                    </span>
                  </div>
                )}

                {!form.password && (
                  <p style={styles.fieldHint}>
                    Minimum 8 characters with at least one letter and one number.
                  </p>
                )}
              </div>

              {/* ROLE */}

              <div style={styles.formField}>
                <label htmlFor="role" style={styles.label}>
                  Role
                </label>

                <select
                  id="role"
                  name="role"
                  value={form.role}
                  onChange={handleFormChange}
                  style={styles.input}
                  disabled={creatingUser}
                  required
                >
                  <option value="" disabled>
                    Select role
                  </option>

                  <option value="admin">
                    Admin
                  </option>

                  <option value="nurse">
                    Nurse
                  </option>

                  <option value="lab_technician">
                    Lab Technician
                  </option>
                </select>

                <p style={styles.fieldHint}>
                  Choose the user's access level.
                </p>
              </div>

              {/* CITY */}

              <div style={styles.formField}>
                <label htmlFor="city_id" style={styles.label}>
                  City <span style={styles.requiredMark}>*</span>
                </label>

                <select
                  id="city_id"
                  required
                  name="city_id"
                  value={form.city_id}
                  onChange={handleFormChange}
                  style={styles.input}
                  disabled={
                    creatingUser ||
                    citiesLoading
                  }
                >

                <option value="">
                  {citiesLoading
                    ? "Loading cities..."
                    : "Select city"}
                </option>

                {cities.map((city) => (
                  <option
                    key={city.id}
                    value={city.id}
                  >
                    {city.name}
                  </option>
                ))}

                </select>
              </div>

              {/* BUTTONS */}

              <div style={styles.formActions}>

                <button
                  type="button"
                  disabled={creatingUser}
                  style={styles.cancelButton}
                  onClick={() =>
                    setShowCreateModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creatingUser}
                  style={styles.createButton}
                >
                  {creatingUser
                    ? "Creating..."
                    : "Create User"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* =================================================
          USER DETAILS MODAL
          ================================================= */}

      {selectedUser && (

        <div
          style={styles.modalOverlay}
          onClick={() =>
            setSelectedUser(null)
          }
        >

          <div
            style={styles.detailsModal}
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div style={styles.modalHeader}>

              <div>

                <h2 style={styles.modalTitle}>
                  User Profile
                </h2>

                <p
                  style={
                    styles.modalSubtitle
                  }
                >
                  Review account information and documents
                </p>

              </div>

              <button
                style={styles.closeButton}
                onClick={() =>
                  setSelectedUser(null)
                }
              >
                ×
              </button>

            </div>

            <div style={styles.userSummary}>
              <div style={styles.detailAvatar}>
                {(selectedUser.full_name || selectedUser.username || "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div style={styles.userSummaryText}>
                <strong style={styles.summaryName}>
                  {selectedUser.full_name || "Unnamed User"}
                </strong>
                <span style={styles.summaryUsername}>
                  @{selectedUser.username || "not-set"}
                </span>
              </div>

              <span
                style={{
                  ...styles.statusBadge,
                  ...getStatusStyle(selectedUser.status),
                }}
              >
                {selectedUser.status || "Unknown"}
              </span>
            </div>

            <div style={styles.detailsContent}>
              <section style={styles.detailsSection}>
                <h3 style={styles.detailsSectionTitle}>
                  Personal Information
                </h3>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>Full Name</span>
                    <strong style={styles.detailValue}>
                      {selectedUser.full_name || "Not provided"}
                    </strong>
                  </div>
                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>Username</span>
                    <strong style={styles.detailValue}>
                      @{selectedUser.username || "Not provided"}
                    </strong>
                  </div>
                </div>
              </section>

              <section style={styles.detailsSection}>
                <h3 style={styles.detailsSectionTitle}>
                  Account Information
                </h3>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>Created</span>
                    <strong style={styles.detailValue}>
                      {selectedUser.created_at
                        ? new Date(selectedUser.created_at).toLocaleString()
                        : "Not available"}
                    </strong>
                  </div>
                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>Last Updated</span>
                    <strong style={styles.detailValue}>
                      {selectedUser.updated_at
                        ? new Date(selectedUser.updated_at).toLocaleString()
                        : "Not available"}
                    </strong>
                  </div>
                </div>
              </section>

              <section style={styles.detailsSection}>
                <h3 style={styles.detailsSectionTitle}>
                  Role &amp; Permissions
                </h3>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>System Role</span>
                    <strong style={styles.roleValue}>
                      {String(selectedUser.role || "Not assigned")
                        .replace(/_/g, " ")}
                    </strong>
                  </div>
                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>Access State</span>
                    <strong style={styles.detailValue}>
                      {selectedUser.status === "Active"
                        ? "Dashboard access enabled"
                        : "Dashboard access restricted"}
                    </strong>
                  </div>
                </div>
              </section>

              <section style={styles.detailsSection}>
                <h3 style={styles.detailsSectionTitle}>
                  Location
                </h3>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>Assigned City</span>
                    <strong style={styles.detailValue}>
                      {getCityName(selectedUser.city_id)}
                    </strong>
                  </div>
                </div>
              </section>

              <section style={styles.detailsSection}>
                <h3 style={styles.detailsSectionTitle}>
                  Account Status
                </h3>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>Current Status</span>
                    <span
                      style={{
                        ...styles.statusBadge,
                        ...getStatusStyle(selectedUser.status),
                      }}
                    >
                      {selectedUser.status || "Unknown"}
                    </span>
                  </div>
                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>Reviewed On</span>
                    <strong style={styles.detailValue}>
                      {selectedUser.approved_at
                        ? new Date(selectedUser.approved_at).toLocaleString()
                        : "Not reviewed"}
                    </strong>
                  </div>
                </div>
                {selectedUser.rejection_reason && (
                  <div style={styles.rejectionReason}>
                    <strong>Rejection reason</strong>
                    <p>{selectedUser.rejection_reason}</p>
                  </div>
                )}
              </section>

              <section style={styles.detailsSection}>
                <h3 style={styles.detailsSectionTitle}>
                  Profile Completion
                </h3>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>Profile Status</span>
                    <strong
                      style={{
                        ...styles.detailValue,
                        color: selectedUser.profile_completed
                          ? "#166534"
                          : "#92400e",
                      }}
                    >
                      {selectedUser.profile_completed
                        ? "Completed"
                        : "Incomplete"}
                    </strong>
                  </div>
                  <div style={styles.detailBox}>
                    <span style={styles.detailLabel}>First Login</span>
                    <strong style={styles.detailValue}>
                      {selectedUser.first_login
                        ? "Profile setup required"
                        : "Setup complete"}
                    </strong>
                  </div>
                </div>
              </section>

              <section style={styles.detailsSection}>
                <h3 style={styles.detailsSectionTitle}>
                  Submitted Documents
                </h3>
                <div style={styles.documents}>

                  <button
                    style={styles.documentButton}
                    disabled={!selectedUser.id_front_url}
                    onClick={() => openDocument(selectedUser.id_front_url)}
                  >
                    📄 ID Document — Front
                  </button>

                  <button
                    style={styles.documentButton}
                    disabled={!selectedUser.id_back_url}
                    onClick={() => openDocument(selectedUser.id_back_url)}
                  >
                    📄 ID Document — Back
                  </button>

                  <button
                    style={styles.documentButton}
                    disabled={!selectedUser.license_degree_url}
                    onClick={() =>
                      openDocument(selectedUser.license_degree_url)
                    }
                  >
                    📜 License / Degree
                  </button>
                </div>
              </section>

            </div>

            {selectedUser.status ===
              "Pending" && (

              <div style={styles.modalActions}>

                <button
                  disabled={
                    processingId ===
                    selectedUser.id
                  }
                  style={
                    styles.largeApproveButton
                  }
                  onClick={() =>
                    reviewUser(
                      selectedUser.id,
                      "approve"
                    )
                  }
                >
                  ✓ Approve User
                </button>

                <button
                  disabled={
                    processingId ===
                    selectedUser.id
                  }
                  style={
                    styles.largeRejectButton
                  }
                  onClick={() =>
                    openRejectionModal(selectedUser)
                  }
                >
                  ✕ Reject User
                </button>

              </div>

            )}

            {selectedUser.status === "Active" && (
              <div style={styles.modalActions}>
                <button
                  disabled={processingId === selectedUser.id}
                  style={styles.largeDeactivateButton}
                  onClick={() =>
                    reviewUser(selectedUser.id, "deactivate")
                  }
                >
                  {processingId === selectedUser.id
                    ? "Processing..."
                    : "Deactivate User"}
                </button>
              </div>
            )}

            {selectedUser.status === "Inactive" && (
              <div style={styles.modalActions}>
                <button
                  disabled={processingId === selectedUser.id}
                  style={styles.largeApproveButton}
                  onClick={() =>
                    reviewUser(selectedUser.id, "activate")
                  }
                >
                  {processingId === selectedUser.id
                    ? "Processing..."
                    : "✓ Activate User"}
                </button>
              </div>
            )}

            {selectedUser.status === "Rejected" && (
              <div style={styles.modalActions}>
                <button
                  disabled={processingId === selectedUser.id}
                  style={styles.largeApproveButton}
                  onClick={() =>
                    reviewUser(selectedUser.id, "approve")
                  }
                >
                  {processingId === selectedUser.id
                    ? "Processing..."
                    : "✓ Re-approve User"}
                </button>
              </div>
            )}

            <button
              type="button"
              style={styles.detailsCloseButton}
              onClick={() => setSelectedUser(null)}
            >
              ← Back to User Management
            </button>

          </div>

        </div>

      )}

      {rejectionTarget && (
        <div
          style={styles.modalOverlay}
          onClick={() => setRejectionTarget(null)}
        >
          <form
            style={styles.modal}
            onSubmit={submitRejection}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>Reject User</h2>
                <p style={styles.modalSubtitle}>
                  Explain what {rejectionTarget.full_name || "this user"} must correct before resubmitting.
                </p>
              </div>
              <button
                type="button"
                style={styles.closeButton}
                onClick={() => setRejectionTarget(null)}
              >
                ×
              </button>
            </div>

            <label htmlFor="rejection-reason" style={styles.label}>
              Rejection reason
            </label>
            <textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              required
              style={styles.textarea}
              placeholder="Describe the correction required."
              disabled={processingId === rejectionTarget.id}
            />

            <div style={styles.formActions}>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={() => setRejectionTarget(null)}
                disabled={processingId === rejectionTarget.id}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={styles.rejectButton}
                disabled={processingId === rejectionTarget.id}
              >
                {processingId === rejectionTarget.id ? "Rejecting..." : "Reject User"}
              </button>
            </div>
          </form>
        </div>
      )}

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
    padding: "35px",
    fontFamily: "Inter, Arial, sans-serif",
    color: "#1e293b",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "700",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  headerActions: {
    display: "flex",
    gap: "10px",
  },

  refreshButton: {
    border: "1px solid #dbe2ea",
    backgroundColor: "#fff",
    borderRadius: "8px",
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: "600",
  },

  addUserButton: {
    border: "none",
    backgroundColor: "#2563eb",
    color: "#fff",
    borderRadius: "8px",
    padding: "10px 18px",
    cursor: "pointer",
    fontWeight: "700",
  },

  error: {
    position: "relative",
    backgroundColor: "#fff1f2",
    color: "#b91c1c",
    padding: "14px 45px 14px 14px",
    borderRadius: "10px",
    marginBottom: "20px",
  },

  errorClose: {
    position: "absolute",
    right: "12px",
    top: "8px",
    border: "none",
    background: "transparent",
    fontSize: "20px",
    cursor: "pointer",
    color: "#b91c1c",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: "18px",
    marginBottom: "25px",
  },

  statCard: {
    backgroundColor: "#fff",
    borderRadius: "14px",
    padding: "20px",
    boxShadow:
      "0 5px 20px rgba(0,0,0,0.05)",
  },

  statLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "13px",
    marginBottom: "8px",
  },

  statNumber: {
    fontSize: "28px",
  },

  tableCard: {
    backgroundColor: "#fff",
    borderRadius: "15px",
    boxShadow:
      "0 5px 25px rgba(0,0,0,0.05)",
    overflow: "hidden",
  },

  tableHeader: {
    padding: "20px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom:
      "1px solid #e2e8f0",
  },

  tableTitle: {
    margin: 0,
  },

  userCount: {
    color: "#64748b",
    fontSize: "13px",
  },

  tableWrapper: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "14px 18px",
    backgroundColor: "#f8fafc",
    color: "#64748b",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },

  td: {
    padding: "16px 18px",
    borderBottom:
      "1px solid #f1f5f9",
    fontSize: "13px",
  },

  userCell: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
  },

  userName: {
    display: "block",
  },

  username: {
    display: "block",
    marginTop: "3px",
    color: "#94a3b8",
    fontSize: "11px",
  },

  roleBadge: {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    padding: "5px 9px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "600",
  },

  statusBadge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "700",
  },

  active: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },

  pending: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },

  rejected: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },

  inactive: {
    backgroundColor: "#e2e8f0",
    color: "#475569",
  },

  profileBadge: {
    padding: "5px 9px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "600",
  },

  actionGroup: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },

  viewButton: {
    border: "1px solid #cbd5e1",
    backgroundColor: "#fff",
    color: "#334155",
    padding: "7px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "600",
  },

  approveButton: {
    border: "none",
    backgroundColor: "#16a34a",
    color: "#fff",
    padding: "7px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "600",
  },

  rejectButton: {
    border: "none",
    backgroundColor: "#dc2626",
    color: "#fff",
    padding: "7px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "600",
  },

  pendingButton: {
    border: "none",
    backgroundColor: "#d97706",
    color: "#fff",
    padding: "7px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "600",
  },

  inactiveButton: {
    border: "none",
    backgroundColor: "#475569",
    color: "#fff",
    padding: "7px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "600",
  },

  empty: {
    padding: "60px 20px",
    textAlign: "center",
    color: "#64748b",
  },

  emptyIcon: {
    fontSize: "40px",
    marginBottom: "10px",
  },

  loadingCard: {
    backgroundColor: "#fff",
    borderRadius: "15px",
    padding: "50px",
    textAlign: "center",
    maxWidth: "400px",
    margin: "100px auto",
  },

  loadingIcon: {
    fontSize: "35px",
    marginBottom: "10px",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor:
      "rgba(15, 23, 42, 0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    zIndex: 1000,
  },

  modal: {
    width: "650px",
    maxWidth: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    backgroundColor: "#fff",
    borderRadius: "16px",
    padding: "28px",
    boxShadow:
      "0 20px 60px rgba(0,0,0,0.2)",
  },

  detailsModal: {
    width: "760px",
    maxWidth: "100%",
    maxHeight: "calc(100dvh - 32px)",
    overflowY: "auto",
    backgroundColor: "#fff",
    borderRadius: "18px",
    padding: "28px",
    boxSizing: "border-box",
    textAlign: "left",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },

  createModal: {
    width: "640px",
    maxWidth: "100%",
    maxHeight: "calc(100dvh - 32px)",
    overflowY: "auto",
    backgroundColor: "#fff",
    borderRadius: "18px",
    padding: "28px",
    boxSizing: "border-box",
    textAlign: "left",
    boxShadow:
      "0 20px 60px rgba(0,0,0,0.2)",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "25px",
  },

  modalTitle: {
    margin: 0,
    fontSize: "22px",
  },

  modalSubtitle: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  closeButton: {
    border: "none",
    backgroundColor: "#f1f5f9",
    width: "35px",
    height: "35px",
    borderRadius: "50%",
    fontSize: "22px",
    cursor: "pointer",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "13px",
    fontWeight: "700",
    color: "#1e3a5f",
    letterSpacing: "0.01em",
  },

  createUserForm: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
  },

  formField: {
    minWidth: 0,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "46px",
    border: "1px solid #b8c7d9",
    borderRadius: "9px",
    padding: "11px 12px",
    fontSize: "14px",
    fontFamily: "inherit",
    lineHeight: "1.4",
    color: "#172033",
    textAlign: "left",
    outline: "none",
    backgroundColor: "#fff",
    colorScheme: "light",
    boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.04)",
  },

  requiredMark: {
    color: "#dc2626",
    fontWeight: "800",
  },

  passwordInputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },

  passwordInput: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "46px",
    border: "1px solid #b8c7d9",
    borderRadius: "9px",
    padding: "11px 72px 11px 12px",
    fontSize: "14px",
    fontFamily: "inherit",
    lineHeight: "1.4",
    color: "#172033",
    outline: "none",
    backgroundColor: "#fff",
    colorScheme: "light",
    boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.04)",
  },

  passwordToggle: {
    position: "absolute",
    right: "8px",
    top: "50%",
    transform: "translateY(-50%)",
    border: "none",
    backgroundColor: "transparent",
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: "800",
    padding: "7px 8px",
    borderRadius: "6px",
    cursor: "pointer",
  },

  passwordHint: {
    marginTop: "7px",
  },

  passwordStatus: {
    fontSize: "12px",
    fontWeight: "700",
  },

  fieldHint: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: "1.4",
  },

  textarea: {
    width: "100%",
    minHeight: "120px",
    boxSizing: "border-box",
    resize: "vertical",
    border: "1px solid #b8c7d9",
    borderRadius: "9px",
    padding: "11px 12px",
    fontSize: "14px",
    fontFamily: "inherit",
    lineHeight: "1.4",
    color: "#172033",
    marginBottom: "18px",
  },

  formActions: {
    display: "flex",
    gap: "10px",
    gridColumn: "1 / -1",
    marginTop: "6px",
  },

  cancelButton: {
    flex: 1,
    border: "1px solid #cbd5e1",
    backgroundColor: "#fff",
    color: "#334155",
    padding: "12px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
  },

  createButton: {
    flex: 1,
    border: "none",
    backgroundColor: "#2563eb",
    color: "#fff",
    padding: "12px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
  },

  userSummary: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "16px",
    marginBottom: "20px",
    border: "1px solid #dbeafe",
    borderRadius: "12px",
    backgroundColor: "#f8fbff",
  },

  detailAvatar: {
    width: "50px",
    height: "50px",
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    fontSize: "20px",
    fontWeight: "800",
  },

  userSummaryText: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "3px",
    flex: 1,
  },

  summaryName: {
    color: "#0f172a",
    fontSize: "17px",
    overflowWrap: "anywhere",
  },

  summaryUsername: {
    color: "#64748b",
    fontSize: "13px",
    overflowWrap: "anywhere",
  },

  detailsContent: {
    display: "grid",
    gap: "16px",
  },

  detailsSection: {
    padding: "16px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    backgroundColor: "#fff",
  },

  detailsSectionTitle: {
    margin: "0 0 12px",
    color: "#1e3a5f",
    fontSize: "14px",
    fontWeight: "800",
  },

  detailBox: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "5px",
    backgroundColor: "#f8fafc",
    padding: "13px",
    borderRadius: "9px",
  },

  detailLabel: {
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.02em",
  },

  detailValue: {
    color: "#172033",
    fontSize: "14px",
    lineHeight: "1.45",
    overflowWrap: "anywhere",
  },

  roleValue: {
    color: "#1d4ed8",
    fontSize: "14px",
    fontWeight: "800",
    textTransform: "capitalize",
  },

  // eslint-disable-next-line no-dupe-keys
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "6px 9px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "800",
    whiteSpace: "nowrap",
  },

  documents: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  sectionTitle: {
    marginTop: "25px",
    marginBottom: "12px",
    fontSize: "16px",
  },

  documentButton: {
    border: "1px solid #cbd5e1",
    backgroundColor: "#fff",
    color: "#334155",
    padding: "11px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    textAlign: "left",
  },

  detailsCloseButton: {
    width: "100%",
    marginTop: "22px",
    border: "1px solid #bfdbfe",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    padding: "12px 16px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "800",
  },

  rejectionReason: {
    marginTop: "16px",
    padding: "14px",
    backgroundColor: "#fff1f2",
    color: "#991b1b",
    borderRadius: "8px",
    fontSize: "13px",
  },

  modalActions: {
    display: "flex",
    gap: "10px",
    marginTop: "25px",
  },

  largeApproveButton: {
    flex: 1,
    border: "none",
    backgroundColor: "#16a34a",
    color: "#fff",
    padding: "13px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
  },

  largeRejectButton: {
    flex: 1,
    border: "none",
    backgroundColor: "#dc2626",
    color: "#fff",
    padding: "13px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
  },

  largeDeactivateButton: {
    flex: 1,
    border: "none",
    backgroundColor: "#475569",
    color: "#fff",
    padding: "13px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
  },

  // eslint-disable-next-line no-dupe-keys
  largeDeactivateButton: {
    flex: 1,
    border: "none",
    backgroundColor: "#475569",
    color: "#fff",
    padding: "13px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
  },
};

export default AdminUserManagement;
