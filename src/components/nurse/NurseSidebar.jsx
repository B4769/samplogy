import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

/* =========================================================
   MENU ITEM
   Keep this OUTSIDE NurseSidebar.
========================================================= */

function MenuItem({
  path,
  icon,
  children,
  onClose,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const active =
    location.pathname === path;

  const handleClick = () => {
    onClose();
    navigate(path);
  };

  return (
    <button
      type="button"
      className={`nav-button ${
        active ? "active" : ""
      }`}
      onClick={handleClick}
    >
      <span className="nav-icon">
        {icon}
      </span>

      <span className="nav-text">
        {children}
      </span>
    </button>
  );
}


/* =========================================================
   NURSE SIDEBAR
========================================================= */

function NurseSidebar({
  nurseName = "Nurse",
  mobileMenuOpen = false,
  onClose = () => {},
}) {
  const navigate = useNavigate();

  /* =======================================================
     ESC KEY
  ======================================================= */

  useEffect(() => {
    if (!mobileMenuOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [mobileMenuOpen, onClose]);


  /* =======================================================
     SIGN OUT
  ======================================================= */

  const handleSignOut = async () => {
    onClose();

    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "Supabase sign out error:",
          error
        );
      }
    } catch (error) {
      console.error(
        "Sign out error:",
        error
      );
    }

    localStorage.removeItem(
      "currentUser"
    );

    navigate("/");
  };


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside
        className={`sidebar ${
          mobileMenuOpen
            ? "mobile-menu-open"
            : ""
        }`}
      >

        <div className="sidebar-content">

          {/* =================================================
              LOGO
          ================================================= */}

          <div className="logo-container">
            <img
              src="/samplogy-logo.png"
              alt="Samplogy Sample Delivery"
              className="logo"
            />
          </div>


          {/* =================================================
              MOBILE CLOSE
          ================================================= */}

          <button
            type="button"
            className="mobile-drawer-close"
            aria-label="Close navigation menu"
            onClick={onClose}
          >
            ×
          </button>


          {/* =================================================
              WORKSPACE
          ================================================= */}

          <div className="menu-heading">
            WORKSPACE
          </div>

          <MenuItem
            path="/nurse-dashboard"
            icon="⌂"
            onClose={onClose}
          >
            Dashboard
          </MenuItem>


          {/* =================================================
              PATIENT
          ================================================= */}

          <div className="menu-heading">
            PATIENT
          </div>

          <MenuItem
            path="/register-patient"
            icon="＋"
            onClose={onClose}
          >
            Register Patient
          </MenuItem>


          {/* =================================================
              LABORATORY
          ================================================= */}

          <div className="menu-heading">
            LABORATORY
          </div>

          <MenuItem
            path="/laboratory-request"
            icon="◇"
            onClose={onClose}
          >
            New Sample Request
          </MenuItem>

          <MenuItem
            path="/laboratory-requests"
            icon="▤"
            onClose={onClose}
          >
            My Requests
          </MenuItem>

          <MenuItem
            path="/laboratory-results"
            icon="✓"
            onClose={onClose}
          >
            Laboratory Results
          </MenuItem>


          {/* =================================================
              HISTORY
          ================================================= */}

          <div className="menu-heading">
            HISTORY
          </div>

          <MenuItem
            path="/laboratory-requests"
            icon="◷"
            onClose={onClose}
          >
            Work History
          </MenuItem>


          {/* =================================================
              ACCOUNT
          ================================================= */}

          <div className="menu-heading">
            ACCOUNT
          </div>

          <button
            type="button"
            className="nav-button"
            onClick={() => {
              onClose();
              navigate("/nurse-profile");
            }}
          >
            <span className="nav-icon">
              ○
            </span>

            <span className="nav-text">
              My Profile
            </span>
          </button>


          {/* =================================================
              SIGN OUT
          ================================================= */}

          <button
            type="button"
            className="nav-button"
            onClick={handleSignOut}
          >
            <span className="nav-icon">
              ↪
            </span>

            <span className="nav-text">
              Sign Out
            </span>
          </button>

        </div>


        {/* ===================================================
            SPACER
        =================================================== */}

        <div className="sidebar-spacer" />


        {/* ===================================================
            USER PROFILE
        =================================================== */}

        <div className="profile">

          <div className="avatar">
            {nurseName
              ?.charAt(0)
              .toUpperCase() || "N"}
          </div>

          <div className="profile-details">

            <p className="profile-name">
              {nurseName}
            </p>

            <p className="profile-role">
              Nurse Portal
            </p>

          </div>

        </div>

      </aside>


      {/* ===================================================
          MOBILE OVERLAY
      =================================================== */}

      <button
        type="button"
        className={`mobile-menu-overlay ${
          mobileMenuOpen
            ? "show"
            : ""
        }`}
        aria-label="Close navigation menu"
        onClick={onClose}
      />

    </>
  );
}

export default NurseSidebar;