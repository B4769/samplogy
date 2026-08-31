import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

// =====================================================
// GLOBAL STYLES
// =====================================================

import "./styles/app.css";

// =====================================================
// PAGES
// =====================================================

import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";

import NurseDashboard from "./pages/NurseDashboard";
import RegisterPatient from "./pages/RegisterPatient";
import LaboratoryRequest from "./pages/LaboratoryRequest";
import LaboratoryRequests from "./pages/LaboratoryRequests";
import LaboratoryRequestDetails from "./pages/LaboratoryRequestDetails";
import LaboratoryResults from "./pages/LaboratoryResults";

import LabDashboard from "./pages/LabDashboard";
import LabRequestList from "./pages/LabRequestList";
import LaboratoryProcessRequest from "./pages/LaboratoryProcessRequest";

import AdminDashboard from "./pages/AdminDashboard";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminLaboratoryWork from "./pages/AdminLaboratoryWork";

import CompleteProfile from "./pages/CompleteProfile";

// =====================================================
// NURSE LAYOUT
// =====================================================

import NurseLayout from "./components/nurse/NurseLayout";

// =====================================================
// SUPABASE
// =====================================================

import { supabase } from "./lib/supabase";
import { Capacitor } from "@capacitor/core";

const isNativeNurseApp = Capacitor.isNativePlatform();


// =====================================================
// SUPABASE SESSION PROTECTION
// =====================================================

function RequireSupabaseSession({ children }) {
  const location = useLocation();

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [hasSession, setHasSession] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const {
          data,
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error(
            "Unable to restore Supabase session:",
            error
          );
        }

        if (cancelled) {
          return;
        }

        const session =
          data?.session || null;

        if (!session) {
          localStorage.removeItem(
            "currentUser"
          );
        }

        setHasSession(
          Boolean(session)
        );

        setCheckingSession(false);

      } catch (error) {

        console.error(
          "Unable to restore Supabase session:",
          error
        );

        if (cancelled) {
          return;
        }

        setHasSession(false);
        setCheckingSession(false);
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // ===================================================
  // CHECKING SESSION
  // ===================================================

  if (checkingSession) {
    return (
      <div className="app-loading">
        Loading...
      </div>
    );
  }

  // ===================================================
  // NO SESSION
  // ===================================================

  if (!hasSession) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  // ===================================================
  // SESSION EXISTS
  // ===================================================

  return children;
}


// =====================================================
// NURSE LAYOUT WRAPPER
// =====================================================
//
// All Nurse pages use the same:
// - Sidebar
// - Mobile navigation
// - Layout
//
// This prevents us from duplicating the sidebar
// inside every Nurse page.
// =====================================================

function NurseProtectedPage({
  children,
}) {
  return (
    <RequireSupabaseSession>
      <NurseLayout>
        {children}
      </NurseLayout>
    </RequireSupabaseSession>
  );
}


// =====================================================
// APP
// =====================================================

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* =================================================
            LOGIN
        ================================================= */}

        <Route
          path="/"
          element={<Login />}
        />


        {/* =================================================
            PASSWORD CHANGE
        ================================================= */}

        <Route
          path="/change-password"
          element={
            <RequireSupabaseSession>
              <ChangePassword />
            </RequireSupabaseSession>
          }
        />


        {/* =================================================
            COMPLETE PROFILE
        ================================================= */}

        <Route
          path="/complete-profile"
          element={
            <RequireSupabaseSession>
              <CompleteProfile />
            </RequireSupabaseSession>
          }
        />


        {/* =================================================
            ================= NURSE ========================
        ================================================= */}


        {/* -------------------------------------------------
            NURSE DASHBOARD
        ------------------------------------------------- */}

        <Route
          path="/nurse-dashboard"
          element={
            <RequireSupabaseSession>
              <NurseDashboard />
            </RequireSupabaseSession>
          }
        />


        {/* -------------------------------------------------
            OLD NURSE URL
            /nurse → /nurse-dashboard
        ------------------------------------------------- */}

        <Route
          path="/nurse"
          element={
            <Navigate
              to="/nurse-dashboard"
              replace
            />
          }
        />


        {/* -------------------------------------------------
            REGISTER PATIENT
        ------------------------------------------------- */}

        <Route
          path="/register-patient"
          element={
            <NurseProtectedPage>
              <RegisterPatient />
            </NurseProtectedPage>
          }
        />


        {/* -------------------------------------------------
            NEW LABORATORY REQUEST
        ------------------------------------------------- */}

        <Route
          path="/laboratory-request"
          element={
            <NurseProtectedPage>
              <LaboratoryRequest />
            </NurseProtectedPage>
          }
        />


        {/* -------------------------------------------------
            MY LABORATORY REQUESTS
        ------------------------------------------------- */}

        <Route
          path="/laboratory-requests"
          element={
            <NurseProtectedPage>
              <LaboratoryRequests />
            </NurseProtectedPage>
          }
        />


        {/* -------------------------------------------------
            REQUEST DETAILS
        ------------------------------------------------- */}

        <Route
          path="/laboratory-request-details"
          element={
            <NurseProtectedPage>
              <LaboratoryRequestDetails />
            </NurseProtectedPage>
          }
        />


        {/* -------------------------------------------------
            LABORATORY RESULTS
        ------------------------------------------------- */}

        <Route
          path="/laboratory-results"
          element={
            <NurseProtectedPage>
              <LaboratoryResults />
            </NurseProtectedPage>
          }
        />


        {/* =================================================
            ================= LABORATORY ====================
        ================================================= */}


        {/* -------------------------------------------------
            LAB DASHBOARD
        ------------------------------------------------- */}

        <Route
          path="/laboratory"
          element={
            isNativeNurseApp ? <Navigate to="/nurse-dashboard" replace /> : <RequireSupabaseSession>
              <LabDashboard />
            </RequireSupabaseSession>
          }
        />


        {/* -------------------------------------------------
            LAB REQUESTS
        ------------------------------------------------- */}

        <Route
          path="/lab-requests"
          element={
            isNativeNurseApp ? <Navigate to="/nurse-dashboard" replace /> : <RequireSupabaseSession>
              <LabRequestList />
            </RequireSupabaseSession>
          }
        />


        {/* -------------------------------------------------
            PROCESS LAB REQUEST
        ------------------------------------------------- */}

        <Route
          path="/laboratory-process-request"
          element={
            isNativeNurseApp ? <Navigate to="/nurse-dashboard" replace /> : <RequireSupabaseSession>
              <LaboratoryProcessRequest />
            </RequireSupabaseSession>
          }
        />


        {/* =================================================
            ================= ADMIN =========================
        ================================================= */}


        {/* -------------------------------------------------
            ADMIN DASHBOARD
        ------------------------------------------------- */}

        <Route
          path="/admin"
          element={
            isNativeNurseApp ? <Navigate to="/nurse-dashboard" replace /> : <RequireSupabaseSession>
              <AdminDashboard />
            </RequireSupabaseSession>
          }
        />


        {/* -------------------------------------------------
            USER MANAGEMENT
        ------------------------------------------------- */}

        <Route
          path="/admin/users"
          element={
            isNativeNurseApp ? <Navigate to="/nurse-dashboard" replace /> : <RequireSupabaseSession>
              <AdminUserManagement />
            </RequireSupabaseSession>
          }
        />


        {/* -------------------------------------------------
            LABORATORY WORK
        ------------------------------------------------- */}

        <Route
          path="/admin/laboratory-work"
          element={
            isNativeNurseApp ? <Navigate to="/nurse-dashboard" replace /> : <RequireSupabaseSession>
              <AdminLaboratoryWork />
            </RequireSupabaseSession>
          }
        />


        {/* =================================================
            FALLBACK
        ================================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;
