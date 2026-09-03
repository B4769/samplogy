import { useState } from "react";
import NurseSidebar from "./NurseSidebar";

function NurseLayout({ children, nurseName = "Nurse" }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="nurse-layout">
      <style>{`
        .nurse-layout,
        .nurse-layout * { box-sizing: border-box; }
        .nurse-layout {
          width: 100%;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          position: relative;
          overflow-x: hidden;
          background: #f6f9fc;
        }
        .nurse-layout > .sidebar {
          position: fixed !important;
          inset: 0 auto 0 0 !important;
          width: 265px !important;
          min-width: 265px !important;
          max-width: 265px !important;
          height: 100vh !important;
          height: 100dvh !important;
          z-index: 10000 !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          background: #fff !important;
          transform: translateX(0) !important;
        }
        .nurse-layout > .main {
          width: calc(100% - 265px) !important;
          min-width: 0 !important;
          margin-left: 265px !important;
          padding: 0 !important;
          overflow-x: hidden !important;
        }
        .nurse-layout .nurse-dashboard {
          width: 100% !important;
          min-width: 0 !important;
          overflow-x: hidden !important;
        }
        .nurse-layout .nurse-dashboard-page {
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          padding: 28px 32px 32px !important;
        }
        .nurse-layout .mobile-topbar { display: none !important; }
        .nurse-layout .nav-text {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        .nurse-layout .nav-button {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: flex-start !important;
          width: 100% !important;
          min-width: 0 !important;
        }
        @media (max-width: 900px) {
          .nurse-layout > .sidebar {
            width: min(310px, 86vw) !important;
            min-width: 0 !important;
            max-width: 310px !important;
            transform: translateX(-110%) !important;
            transition: transform .25s ease !important;
            box-shadow: 10px 0 30px rgba(15,23,42,.16) !important;
          }
          .nurse-layout > .sidebar.mobile-menu-open {
            transform: translateX(0) !important;
          }
          .nurse-layout > .main {
            width: 100% !important;
            margin-left: 0 !important;
          }
          .nurse-layout .nurse-dashboard-page {
            padding: 12px 14px 24px !important;
          }
          .nurse-layout .mobile-topbar {
            display: flex !important;
            width: 100% !important;
            height: 54px !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 10px !important;
            margin-bottom: 10px !important;
          }
          .nurse-layout .mobile-menu-button {
            display: flex !important;
            flex: 0 0 42px !important;
            width: 42px !important;
            height: 42px !important;
            align-items: center !important;
            justify-content: center !important;
            flex-direction: column !important;
            gap: 4px !important;
            border: 1px solid #dfe6ed !important;
            border-radius: 10px !important;
            background: #fff !important;
          }
          .nurse-layout .mobile-menu-button span {
            display: block !important;
            width: 18px !important;
            height: 2px !important;
            background: #087f8c !important;
            border-radius: 2px !important;
          }
          .nurse-layout .mobile-brand {
            display: flex !important;
            flex: 1 !important;
            min-width: 0 !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 7px !important;
          }
          .nurse-layout .mobile-brand img {
            width: 42px !important;
            height: 42px !important;
            object-fit: contain !important;
          }
          .nurse-layout .mobile-brand > div {
            display: flex !important;
            flex-direction: column !important;
            min-width: 0 !important;
          }
          .nurse-layout .mobile-brand strong { font-size: 14px !important; color: #173d70 !important; }
          .nurse-layout .mobile-brand span { font-size: 10px !important; color: #087f8c !important; }
          .nurse-layout .mobile-avatar {
            display: flex !important;
            flex: 0 0 40px !important;
            width: 40px !important;
            height: 40px !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 50% !important;
            background: #1267b1 !important;
            color: #fff !important;
            font-weight: 700 !important;
          }
          .nurse-layout > .sidebar .nav-text {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            white-space: normal !important;
            font-size: 14px !important;
          }
          .nurse-layout > .sidebar .menu-heading { display: block !important; }
          .nurse-layout > .sidebar .profile-details { display: block !important; }
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
            background: #fff !important;
            color: #344054 !important;
            font-size: 24px !important;
            z-index: 10001 !important;
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
            background: rgba(15,23,42,.42) !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
            z-index: 9998 !important;
          }
          .nurse-layout .mobile-menu-overlay.show {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
          }
          .nurse-layout .header,
          .nurse-layout .stats,
          .nurse-layout .welcome,
          .nurse-layout .work-card,
          .nurse-layout .footer { min-width: 0 !important; max-width: 100% !important; }
          .nurse-layout .stats { grid-template-columns: 1fr !important; }
          .nurse-layout .stat-card,
          .nurse-layout .welcome,
          .nurse-layout .work-card { width: 100% !important; }
          .nurse-layout .desktop-request-table { display: none !important; }
          .nurse-layout .mobile-request-list { display: block !important; }
        }
        @media (max-width: 480px) {
          .nurse-layout .nurse-dashboard-page { padding: 8px 10px 20px !important; }
          .nurse-layout .mobile-brand > div { display: none !important; }
          .nurse-layout .title { font-size: 25px !important; }
          .nurse-layout .welcome { padding: 20px !important; }
        }
      `}</style>

      <NurseSidebar
        nurseName={nurseName}
        mobileMenuOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
      />

      <main className="main">
        <div className="mobile-topbar">
          <button
            type="button"
            className="mobile-menu-button"
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
<div className="mobile-brand">
  <img
    src={`${import.meta.env.BASE_URL}samplogy-logo.png`}
    alt="Samplogy"
  />
</div>

          <div className="mobile-avatar">
            {nurseName?.charAt(0).toUpperCase() || "N"}
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}

export default NurseLayout;
