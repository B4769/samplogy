import { useState } from "react";
import NurseSidebar from "./NurseSidebar";

function NurseLayout({
  children,
  nurseName = "Nurse",
}) {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="nurse-layout">
      <NurseSidebar
        nurseName={nurseName}
        mobileMenuOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
      />

      <main className="main">
        {/* Mobile top bar */}

        <div className="mobile-topbar">
          <button
            type="button"
            className="mobile-menu-button"
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() =>
              setMobileMenuOpen(true)
            }
          >
            <span />
            <span />
            <span />
          </button>

          <div className="mobile-brand">
            <img
              src="/samplogy-logo.png"
              alt="Samplogy"
            />

            <div>
              <strong>
                Samplogy
              </strong>

              <span>
                Nurse Portal
              </span>
            </div>
          </div>

          <div className="mobile-avatar">
            {nurseName
              ?.charAt(0)
              .toUpperCase() || "N"}
          </div>
        </div>

        {/* Page */}

        {children}
      </main>
    </div>
  );
}

export default NurseLayout;