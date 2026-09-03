/* =========================================================
   SAMPOLOGY NURSE LAYOUT — RESPONSIVE FIX
   Add this at the VERY BOTTOM of NurseDashboard.css.
   It fixes the shared NurseSidebar/NurseLayout conflict
   without changing Supabase or dashboard business logic.
   ========================================================= */

.nurse-layout {
  width: 100%;
  min-height: 100vh;
  display: flex;
  position: relative;
  background: #f6f9fc;
  overflow-x: hidden;
}

/* ---------- DESKTOP SIDEBAR ---------- */
.nurse-layout .sidebar {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  bottom: 0 !important;
  width: 265px !important;
  max-width: 265px !important;
  min-width: 265px !important;
  height: 100vh !important;
  height: 100dvh !important;
  display: flex !important;
  flex-direction: column !important;
  padding: 20px 16px !important;
  background: #ffffff !important;
  border-right: 1px solid #e4eaf0 !important;
  box-sizing: border-box !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  transform: translateX(0) !important;
  z-index: 10000 !important;
}

.nurse-layout .sidebar-content {
  width: 100% !important;
  flex: 0 0 auto !important;
}

.nurse-layout .logo-container {
  width: 100% !important;
  min-height: 78px !important;
  height: auto !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  padding: 6px 8px 14px !important;
  margin: 0 0 14px !important;
  box-sizing: border-box !important;
  border-bottom: 1px solid #e7edf2 !important;
}

.nurse-layout .logo-container img {
  display: block !important;
  width: 190px !important;
  max-width: 100% !important;
  height: auto !important;
  max-height: 70px !important;
  object-fit: contain !important;
}

.nurse-layout .menu-heading {
  display: block !important;
  width: 100% !important;
  padding: 10px 10px 7px !important;
  margin: 0 !important;
  color: #8190a5 !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: .05em !important;
  box-sizing: border-box !important;
}

.nurse-layout .nav-button {
  width: 100% !important;
  min-width: 0 !important;
  min-height: 44px !important;
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 12px !important;
  padding: 10px 12px !important;
  margin: 0 0 3px !important;
  border: 0 !important;
  border-radius: 10px !important;
  background: transparent !important;
  box-sizing: border-box !important;
  text-align: left !important;
  cursor: pointer !important;
}

.nurse-layout .nav-button:hover {
  background: #f1f7fa !important;
}

.nurse-layout .nav-button.active {
  background: #e7f7f8 !important;
}

.nurse-layout .nav-icon {
  width: 24px !important;
  min-width: 24px !important;
  height: 24px !important;
  flex: 0 0 24px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 20px !important;
  line-height: 1 !important;
}

.nurse-layout .nav-text {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  width: auto !important;
  min-width: 0 !important;
  flex: 1 1 auto !important;
  color: #173d70 !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  line-height: 1.25 !important;
  white-space: normal !important;
  overflow: visible !important;
}

.nurse-layout .sidebar-spacer {
  flex: 1 1 auto !important;
  min-height: 18px !important;
}

.nurse-layout .profile {
  width: 100% !important;
  flex: 0 0 auto !important;
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  padding: 14px 7px 4px !important;
  margin-top: 10px !important;
  border-top: 1px solid #e7edf2 !important;
  box-sizing: border-box !important;
}

.nurse-layout .avatar {
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: #dff6f7 !important;
  color: #087f8c !important;
  font-weight: 700 !important;
}

.nurse-layout .profile-details {
  display: block !important;
  min-width: 0 !important;
}

.nurse-layout .profile-name,
.nurse-layout .profile-role {
  margin: 0 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.nurse-layout .profile-name {
  color: #172b4d !important;
  font-size: 13px !important;
  font-weight: 700 !important;
}

.nurse-layout .profile-role {
  margin-top: 3px !important;
  color: #8a99ad !important;
  font-size: 12px !important;
}

.nurse-layout .mobile-drawer-close,
.nurse-layout .mobile-menu-overlay {
  display: none !important;
}

/* ---------- DESKTOP MAIN ---------- */
.nurse-layout > .main {
  width: calc(100% - 265px) !important;
  min-width: 0 !important;
  margin-left: 265px !important;
  padding: 0 !important;
  box-sizing: border-box !important;
  overflow-x: hidden !important;
}

.nurse-layout > .main > .nurse-dashboard {
  width: 100% !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
}

.nurse-layout .nurse-dashboard-page {
  width: 100% !important;
  max-width: none !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
  padding: 28px 32px 32px !important;
}

.nurse-layout .header,
.nurse-layout .stats,
.nurse-layout .welcome,
.nurse-layout .work-card,
.nurse-layout .footer {
  max-width: 100% !important;
  min-width: 0 !important;
}

.nurse-layout .stats {
  width: 100% !important;
  min-width: 0 !important;
}

.nurse-layout .stat-card,
.nurse-layout .welcome,
.nurse-layout .work-card {
  min-width: 0 !important;
  box-sizing: border-box !important;
}

.nurse-layout .mobile-topbar {
  display: none !important;
}

/* ---------- TABLET / MOBILE ---------- */
@media (max-width: 900px) {
  .nurse-layout .sidebar {
    width: min(310px, 86vw) !important;
    max-width: 310px !important;
    min-width: 0 !important;
    padding: 18px 16px !important;
    transform: translateX(-110%) !important;
    transition: transform .25s ease !important;
    box-shadow: 10px 0 30px rgba(15, 23, 42, .14) !important;
  }

  .nurse-layout .sidebar.mobile-menu-open {
    transform: translateX(0) !important;
  }

  .nurse-layout .mobile-drawer-close {
    display: flex !important;
    position: absolute !important;
    top: 14px !important;
    right: 12px !important;
    width: 36px !important;
    height: 36px !important;
    align-items: center !important;
    justify-content: center !important;
    border: 1px solid #e1e7ed !important;
    border-radius: 9px !important;
    background: #ffffff !important;
    color: #344054 !important;
    font-size: 24px !important;
    line-height: 1 !important;
    cursor: pointer !important;
    z-index: 10001 !important;
  }

  .nurse-layout .logo-container {
    min-height: 82px !important;
    padding: 5px 48px 14px 8px !important;
  }

  .nurse-layout .logo-container img {
    width: 185px !important;
    max-height: 68px !important;
  }

  .nurse-layout .menu-heading {
    display: block !important;
    padding: 9px 10px 7px !important;
    font-size: 9px !important;
  }

  .nurse-layout .nav-button {
    min-height: 46px !important;
    padding: 10px 11px !important;
    gap: 12px !important;
  }

  .nurse-layout .nav-icon {
    width: 25px !important;
    min-width: 25px !important;
    flex-basis: 25px !important;
  }

  .nurse-layout .nav-text {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    font-size: 14px !important;
  }

  .nurse-layout .profile-details {
    display: block !important;
  }

  .nurse-layout > .main {
    width: 100% !important;
    min-width: 0 !important;
    margin-left: 0 !important;
    padding: 0 !important;
  }

  .nurse-layout .nurse-dashboard-page {
    width: 100% !important;
    min-width: 0 !important;
    padding: 16px !important;
  }

  .nurse-layout .mobile-topbar {
    display: flex !important;
    width: 100% !important;
    height: 54px !important;
    margin: 0 0 10px !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 10px !important;
    box-sizing: border-box !important;
  }

  .nurse-layout .mobile-menu-button {
    display: flex !important;
    width: 42px !important;
    height: 42px !important;
    min-width: 42px !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    border: 1px solid #dfe6ed !important;
    border-radius: 10px !important;
    background: #ffffff !important;
    cursor: pointer !important;
  }

  .nurse-layout .mobile-menu-button span {
    display: block !important;
    width: 18px !important;
    height: 2px !important;
    border-radius: 2px !important;
    background: #087f8c !important;
  }

  .nurse-layout .mobile-brand {
    display: flex !important;
    min-width: 0 !important;
    flex: 1 1 auto !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 7px !important;
  }

  .nurse-layout .mobile-brand img {
    display: block !important;
    width: 42px !important;
    height: 42px !important;
    object-fit: contain !important;
    flex: 0 0 auto !important;
  }

  .nurse-layout .mobile-brand > div {
    display: flex !important;
    flex-direction: column !important;
    min-width: 0 !important;
  }

  .nurse-layout .mobile-brand strong {
    color: #173d70 !important;
    font-size: 14px !important;
    line-height: 1.1 !important;
  }

  .nurse-layout .mobile-brand span {
    color: #087f8c !important;
    font-size: 10px !important;
    line-height: 1.2 !important;
  }

  .nurse-layout .mobile-avatar {
    display: flex !important;
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 50% !important;
    background: #1267b1 !important;
    color: #ffffff !important;
    font-weight: 700 !important;
  }

  .nurse-layout .mobile-menu-overlay {
    display: block !important;
    position: fixed !important;
    inset: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    background: rgba(15, 23, 42, .42) !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
    z-index: 9998 !important;
    transition: opacity .25s ease, visibility 0s linear .25s !important;
  }

  .nurse-layout .mobile-menu-overlay.show {
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
    transition: opacity .25s ease !important;
  }

  .nurse-layout .header {
    min-width: 0 !important;
  }

  .nurse-layout .header-actions {
    flex-shrink: 0 !important;
  }

  .nurse-layout .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 12px !important;
  }
}

@media (max-width: 600px) {
  .nurse-layout .nurse-dashboard-page {
    padding: 12px !important;
  }

  .nurse-layout .header {
    width: 100% !important;
    min-width: 0 !important;
  }

  .nurse-layout .header .title,
  .nurse-layout .title {
    font-size: 28px !important;
    line-height: 1.1 !important;
    overflow-wrap: anywhere !important;
  }

  .nurse-layout .header .subtitle,
  .nurse-layout .subtitle {
    font-size: 14px !important;
    line-height: 1.45 !important;
    overflow-wrap: anywhere !important;
  }

  .nurse-layout .header-actions {
    gap: 6px !important;
  }

  .nurse-layout .header-actions .date {
    display: none !important;
  }

  .nurse-layout .stats {
    grid-template-columns: 1fr !important;
  }

  .nurse-layout .stat-card {
    width: 100% !important;
  }

  .nurse-layout .welcome {
    width: 100% !important;
    padding: 22px !important;
    overflow: hidden !important;
  }

  .nurse-layout .welcome p,
  .nurse-layout .welcome h2 {
    overflow-wrap: anywhere !important;
  }

  .nurse-layout .work-card {
    width: 100% !important;
    overflow: hidden !important;
  }

  .nurse-layout .work-header {
    flex-wrap: wrap !important;
    gap: 12px !important;
  }

  .nurse-layout .tabs {
    max-width: 100% !important;
    overflow-x: auto !important;
  }

  .nurse-layout .month-summary {
    max-width: calc(100% - 24px) !important;
    margin-left: 12px !important;
    margin-right: 12px !important;
  }

  .nurse-layout .desktop-request-table {
    display: none !important;
  }

  .nurse-layout .mobile-request-list {
    display: block !important;
  }

  .nurse-layout .footer {
    width: 100% !important;
    flex-wrap: wrap !important;
  }
}

@media (max-width: 380px) {
  .nurse-layout .nurse-dashboard-page {
    padding: 10px !important;
  }

  .nurse-layout .mobile-brand > div {
    display: none !important;
  }

  .nurse-layout .header .title,
  .nurse-layout .title {
    font-size: 24px !important;
  }

  .nurse-layout .stat-card {
    padding: 16px !important;
  }
}
