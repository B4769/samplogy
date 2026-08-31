import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminUsers.css";

function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState(() => {
    const savedUsers = localStorage.getItem("systemUsers");

    if (!savedUsers) {
      return [
        {
          id: 1,
          name: "Administrator",
          username: "admin",
          role: "Admin",
          status: "Active",
        },
        {
          id: 2,
          name: "Nurse User",
          username: "nurse",
          role: "Nurse",
          status: "Active",
        },
        {
          id: 3,
          name: "Laboratory Staff",
          username: "laboratory",
          role: "Laboratory",
          status: "Active",
        },
      ];
    }

    try {
      return JSON.parse(savedUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      return [];
    }
  });

  const [searchTerm, setSearchTerm] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [newUser, setNewUser] = useState({
    name: "",
    username: "",
    role: "Nurse",
  });

  const filteredUsers = users.filter((user) => {
    const search = searchTerm.toLowerCase();

    return (
      user.name.toLowerCase().includes(search) ||
      user.username.toLowerCase().includes(search) ||
      user.role.toLowerCase().includes(search)
    );
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setNewUser((previousUser) => ({
      ...previousUser,
      [name]: value,
    }));
  };

  const handleAddUser = (e) => {
    e.preventDefault();

    if (!newUser.name.trim() || !newUser.username.trim()) {
      alert("Please enter the user's name and username.");
      return;
    }

    const user = {
      id: Date.now(),
      name: newUser.name.trim(),
      username: newUser.username.trim(),
      role: newUser.role,
      status: "Active",
    };

    const updatedUsers = [...users, user];

    setUsers(updatedUsers);

    localStorage.setItem(
      "systemUsers",
      JSON.stringify(updatedUsers)
    );

    setNewUser({
      name: "",
      username: "",
      role: "Nurse",
    });

    setShowForm(false);

    alert("User added successfully.");
  };

  const handleToggleStatus = (id) => {
    const updatedUsers = users.map((user) =>
      user.id === id
        ? {
            ...user,
            status:
              user.status === "Active"
                ? "Inactive"
                : "Active",
          }
        : user
    );

    setUsers(updatedUsers);

    localStorage.setItem(
      "systemUsers",
      JSON.stringify(updatedUsers)
    );
  };

  const handleDeleteUser = (id) => {
    const user = users.find((item) => item.id === id);

    if (!user) {
      return;
    }

    if (user.role === "Admin") {
      alert("The administrator account cannot be deleted.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name}?`
    );

    if (!confirmed) {
      return;
    }

    const updatedUsers = users.filter(
      (item) => item.id !== id
    );

    setUsers(updatedUsers);

    localStorage.setItem(
      "systemUsers",
      JSON.stringify(updatedUsers)
    );
  };

  return (
    <div className="admin-users-page">

      {/* Header */}

      <header className="users-header">

        <div>
          <h1>User Management</h1>

          <p>
            Manage nurses and laboratory staff
          </p>
        </div>

        <button
          className="back-button"
          onClick={() => navigate("/admin")}
        >
          ← Back to Dashboard
        </button>

      </header>


      {/* Statistics */}

      <section className="user-stats">

        <div className="user-stat-card">
          <span className="user-stat-icon">
            👥
          </span>

          <div>
            <p>Total Users</p>
            <h2>{users.length}</h2>
          </div>
        </div>


        <div className="user-stat-card">
          <span className="user-stat-icon">
            👩‍⚕️
          </span>

          <div>
            <p>Nurses</p>

            <h2>
              {
                users.filter(
                  (user) => user.role === "Nurse"
                ).length
              }
            </h2>
          </div>
        </div>


        <div className="user-stat-card">
          <span className="user-stat-icon">
            🧪
          </span>

          <div>
            <p>Laboratory Staff</p>

            <h2>
              {
                users.filter(
                  (user) =>
                    user.role === "Laboratory"
                ).length
              }
            </h2>
          </div>
        </div>


        <div className="user-stat-card">
          <span className="user-stat-icon">
            🟢
          </span>

          <div>
            <p>Active Users</p>

            <h2>
              {
                users.filter(
                  (user) =>
                    user.status === "Active"
                ).length
              }
            </h2>
          </div>
        </div>

      </section>


      {/* User Management */}

      <section className="users-section">

        <div className="users-section-header">

          <div>
            <h2>System Users</h2>

            <p>
              View and manage system accounts
            </p>
          </div>

          <button
            className="add-user-button"
            onClick={() =>
              setShowForm(!showForm)
            }
          >
            + Add User
          </button>

        </div>


        {/* Add User Form */}

        {showForm && (
          <form
            className="add-user-form"
            onSubmit={handleAddUser}
          >

            <div className="form-group">
              <label>Full Name</label>

              <input
                type="text"
                name="name"
                value={newUser.name}
                onChange={handleInputChange}
                placeholder="Enter full name"
              />
            </div>


            <div className="form-group">
              <label>Username</label>

              <input
                type="text"
                name="username"
                value={newUser.username}
                onChange={handleInputChange}
                placeholder="Enter username"
              />
            </div>


            <div className="form-group">
              <label>Role</label>

              <select
                name="role"
                value={newUser.role}
                onChange={handleInputChange}
              >
                <option value="Nurse">
                  Nurse
                </option>

                <option value="Laboratory">
                  Laboratory Staff
                </option>
              </select>
            </div>


            <div className="form-actions">

              <button
                type="submit"
                className="save-user-button"
              >
                Create User
              </button>

              <button
                type="button"
                className="cancel-button"
                onClick={() =>
                  setShowForm(false)
                }
              >
                Cancel
              </button>

            </div>

          </form>
        )}


        {/* Search */}

        <div className="user-search">

          <span>🔎</span>

          <input
            type="text"
            placeholder="Search users by name, username, or role..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
          />

        </div>


        {/* Users Table */}

        {filteredUsers.length === 0 ? (

          <div className="no-users">
            <div>👤</div>

            <h3>No users found</h3>

            <p>
              Try changing your search.
            </p>
          </div>

        ) : (

          <div className="users-table-container">

            <table className="users-table">

              <thead>
                <tr>
                  <th>User</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {filteredUsers.map((user) => (

                  <tr key={user.id}>

                    <td>
                      <div className="user-info">

                        <div className="user-avatar">
                          {user.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <strong>
                          {user.name}
                        </strong>

                      </div>
                    </td>

                    <td>
                      @{user.username}
                    </td>

                    <td>

                      <span
                        className={`role-badge ${
                          user.role === "Nurse"
                            ? "nurse-role"
                            : user.role ===
                              "Laboratory"
                            ? "lab-role"
                            : "admin-role"
                        }`}
                      >
                        {user.role}
                      </span>

                    </td>

                    <td>

                      <span
                        className={`user-status ${
                          user.status === "Active"
                            ? "active-status"
                            : "inactive-status"
                        }`}
                      >
                        ● {user.status}
                      </span>

                    </td>

                    <td>

                      <div className="user-actions">

                        <button
                          className="status-button"
                          onClick={() =>
                            handleToggleStatus(
                              user.id
                            )
                          }
                        >
                          {user.status ===
                          "Active"
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                        {user.role !== "Admin" && (
                          <button
                            className="delete-button"
                            onClick={() =>
                              handleDeleteUser(
                                user.id
                              )
                            }
                          >
                            Delete
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

      </section>


      <footer className="users-footer">
        <span>
          Laboratory Management System
        </span>

        <span>
          Administrator Portal
        </span>
      </footer>

    </div>
  );
}

export default AdminUsers;