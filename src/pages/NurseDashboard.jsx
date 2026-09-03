import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./NurseDashboard.css";


/* =========================================================
   HELPERS
========================================================= */

const TEST_NAMES = {
  cbc: "Complete Blood Count (CBC)",
  "blood-group": "Blood Group",
  "blood-glucose": "Blood Glucose",
  "blood glucose": "Blood Glucose",
  "liver-function": "Liver Function Test",
  "kidney-function": "Kidney Function Test",
  "lipid-profile": "Lipid Profile",
  urinalysis: "Urinalysis",
  "stool-test": "Stool Examination",
  malaria: "Malaria Test",
  hiv: "HIV Test",
  pregnancy: "Pregnancy Test",
  glucose: "Glucose",
  albumin: "Albumin",
  alt: "ALT",
  ast: "AST",
  "alkaline-phosphatase": "Alkaline Phosphatase",
  bilirubin: "Bilirubin",
};

function safeString(value, fallback = "-") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    const text = value
      .map((item) => safeString(item, ""))
      .filter(Boolean)
      .join(", ");

    return text || fallback;
  }

  if (typeof value === "object") {
    const direct =
      value.label ??
      value.name ??
      value.value ??
      value.full_name ??
      value.fullName ??
      value.text;

    if (direct !== null && direct !== undefined && direct !== "") {
      return safeString(direct, fallback);
    }

    return fallback;
  }

  return fallback;
}

function getPatientName(patient) {
  return safeString(
    patient?.full_name ??
      patient?.fullName ??
      patient?.name,
    "Unknown Patient"
  );
}

function getPatientId(patient) {
  return safeString(
    patient?.patient_id ??
      patient?.patientId ??
      patient?.id,
    "No patient ID"
  );
}

function getTests(request) {
  const value = request?.tests;

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") return [parsed];
      if (typeof parsed === "string") return [parsed];
    } catch {
      return value.trim() ? [value] : [];
    }
  }

  if (value && typeof value === "object") {
    return [value];
  }

  return [];
}

function getTestName(test) {
  if (typeof test === "string") {
    return (
      TEST_NAMES[test.toLowerCase()] ||
      test
    );
  }

  if (test && typeof test === "object") {
    const raw =
      test.label ??
      test.name ??
      test.value ??
      test.test_name ??
      test.testName ??
      test.type;

    const text = safeString(raw, "Laboratory Test");

    return TEST_NAMES[text.toLowerCase()] || text;
  }

  return "Laboratory Test";
}

function getStatus(status) {
  switch (status) {
    case "Accepted":
      return { label: "Accepted", className: "accepted" };
    case "Collecting":
      return { label: "Collecting", className: "collecting" };
    case "Processing":
      return { label: "Processing", className: "processing" };
    case "In Transit":
      return { label: "In Transit", className: "transit" };
    case "Delivered":
      return { label: "Delivered", className: "delivered" };
    case "Completed":
      return { label: "Completed", className: "completed" };
    case "Requested":
    case "Pending":
      return { label: "Pending", className: "pending" };
    default:
      return {
        label: status || "Pending",
        className: "pending",
      };
  }
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getMonthKey(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function formatMonth(value) {
  if (!value || value === "Unknown") return "Unknown Month";

  const [year, month] = value.split("-");

  const date = new Date(
    Number(year),
    Number(month) - 1,
    1
  );

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/* =========================================================
   AUTH
========================================================= */

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  if (user) return user;

  try {
    const saved = JSON.parse(
      localStorage.getItem("currentUser") || "null"
    );

    if (saved?.id || saved?.user_id || saved?.uuid) {
      return {
        id: saved.id || saved.user_id || saved.uuid,
        email: saved.email || "",
      };
    }
  } catch {
    // Ignore invalid localStorage data.
  }

  return null;
}

/* =========================================================
   REQUEST LOADING
========================================================= */

async function fetchMyRequests(nurseId) {
  if (!nurseId) {
    throw new Error(
      "No logged-in nurse was found. Please sign in again."
    );
  }

  const { data: requests, error: requestError } =
    await supabase
      .from("laboratory_requests")
      .select("*")
      .eq("requested_by", nurseId)
      .order("id", { ascending: false });

  if (requestError) throw requestError;

  const safeRequests = Array.isArray(requests)
    ? requests
    : [];

  const patientIds = [
    ...new Set(
      safeRequests
        .map((request) => request?.patient_id)
        .filter(
          (id) =>
            id !== null &&
            id !== undefined &&
            id !== ""
        )
    ),
  ];

  let patients = [];

  if (patientIds.length > 0) {
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .in("id", patientIds);

    if (error) {
      console.error("Patient loading error:", error);
    } else {
      patients = Array.isArray(data) ? data : [];
    }
  }

  const patientMap = {};

  patients.forEach((patient) => {
    if (patient?.id !== null && patient?.id !== undefined) {
      patientMap[String(patient.id)] = patient;
    }
  });

  return safeRequests.map((request) => ({
    ...request,
    patient:
      patientMap[String(request.patient_id)] || null,
  }));
}

/* =========================================================
   PAYMENT LOADING
========================================================= */

async function fetchMyPayments(nurseId) {
  if (!nurseId) return [];

  const { data, error } = await supabase
    .from("nurse_payments")
    .select("*")
    .eq("nurse_id", nurseId)
    .order("payment_month", { ascending: false });

  if (error) {
    console.error("Payment history loading error:", error);

    // The dashboard can still work if no payment rows exist yet.
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/* =========================================================
   COMPONENT
========================================================= */

function NurseDashboard() {
  const navigate = useNavigate();
  // Styling now lives in NurseDashboard.css. This preserves the old inline CSS
  // temporarily without rendering it, so it can be removed safely in a later cleanup.
  const legacyStylesEnabled = false;

  const [requests, setRequests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState("current");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [nurseName, setNurseName] = useState("Nurse");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* =======================================================
     LOAD DATA
     IMPORTANT:
     No synchronous setState is called directly inside
     useEffect. The effect only starts the async operation.
  ======================================================= */

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const user = await getCurrentUser();

      if (!user?.id) {
        throw new Error(
          "You are not logged in. Please sign in again."
        );
      }

      const [requestData, paymentData] = await Promise.all([
        fetchMyRequests(user.id),
        fetchMyPayments(user.id),
      ]);

      let displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Nurse";

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, username")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.full_name) {
          displayName = profile.full_name;
        } else if (profile?.username) {
          displayName = profile.username;
        }
      } catch {
        // Profile lookup is optional.
      }

      setRequests(requestData);
      setPayments(paymentData);
      setNurseName(displayName);

      console.log("LOGGED-IN NURSE ID:", user.id);
      console.log("MY REQUESTS:", requestData);
      console.log("MY PAYMENTS:", paymentData);
    } catch (error) {
      console.error("Nurse dashboard error:", error);

      setRequests([]);
      setPayments([]);
      setErrorMessage(
        error?.message ||
          "Unable to load your nurse dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const start = async () => {
      if (!active) return;
      await loadDashboard();
    };

    start();

    return () => {
      active = false;
    };
  }, [loadDashboard]);

  /* =======================================================
     PAYMENT MAP
  ======================================================= */

  const paymentMap = useMemo(() => {
    const map = {};

    payments.forEach((payment) => {
      if (payment?.id !== null && payment?.id !== undefined) {
        map[String(payment.id)] = payment;
      }
    });

    return map;
  }, [payments]);

  /* =======================================================
     CURRENT / PAID REQUESTS

     A request is considered paid only when its payment_id
     points to a nurse_payments row whose status is Paid.

     This means:
     - unpaid/current work stays visible
     - paid work leaves the current list
     - paid work remains in history
  ======================================================= */

  const currentRequests = useMemo(() => {
    return requests.filter((request) => {
      const paymentId = request?.payment_id;

      if (
        paymentId === null ||
        paymentId === undefined ||
        paymentId === ""
      ) {
        return true;
      }

      const payment = paymentMap[String(paymentId)];

      return payment?.payment_status !== "Paid";
    });
  }, [requests, paymentMap]);

  const paidRequests = useMemo(() => {
    return requests.filter((request) => {
      const paymentId = request?.payment_id;

      if (
        paymentId === null ||
        paymentId === undefined ||
        paymentId === ""
      ) {
        return false;
      }

      const payment = paymentMap[String(paymentId)];

      return payment?.payment_status === "Paid";
    });
  }, [requests, paymentMap]);

  /* =======================================================
     CURRENT MONTH
  ======================================================= */

  const currentMonthKey = useMemo(() => {
    const now = new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
  }, []);

  const currentMonthRequests = useMemo(() => {
    return currentRequests.filter((request) => {
      const date =
        request.request_date ||
        request.created_at;

      return getMonthKey(date) === currentMonthKey;
    });
  }, [currentRequests, currentMonthKey]);

  const currentMonthPayment = useMemo(() => {
    return payments.find(
      (payment) =>
        payment.payment_month?.slice(0, 7) ===
        currentMonthKey
    );
  }, [payments, currentMonthKey]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const displayedRequests = useMemo(() => {
    const source =
      view === "history"
        ? paidRequests
        : currentRequests;

    const search = searchTerm
      .toLowerCase()
      .trim();

    if (!search) return source;

    return source.filter((request) => {
      const patientName = getPatientName(
        request.patient
      ).toLowerCase();

      const patientId = getPatientId(
        request.patient
      ).toLowerCase();

      const requestId = safeString(
        request.id,
        ""
      ).toLowerCase();

      const tests = getTests(request)
        .map((test) =>
          getTestName(test).toLowerCase()
        )
        .join(" ");

      return (
        patientName.includes(search) ||
        patientId.includes(search) ||
        requestId.includes(search) ||
        tests.includes(search)
      );
    });
  }, [
    view,
    currentRequests,
    paidRequests,
    searchTerm,
  ]);

  /* =======================================================
     STATISTICS
  ======================================================= */

  const totalRequests = currentRequests.length;

  const pendingRequests = currentRequests.filter(
    (request) =>
      request.status === "Pending" ||
      request.status === "Requested"
  ).length;

  const inProgressRequests = currentRequests.filter(
    (request) =>
      request.status === "Accepted" ||
      request.status === "Collecting" ||
      request.status === "Processing" ||
      request.status === "In Transit"
  ).length;

  const completedRequests = currentRequests.filter(
    (request) =>
      request.status === "Completed" ||
      request.status === "Delivered"
  ).length;

  /* =======================================================
     GROUP PAID HISTORY BY MONTH
  ======================================================= */

  const historyByMonth = useMemo(() => {
    const groups = {};

    paidRequests.forEach((request) => {
      const date =
        request.request_date ||
        request.created_at;

      const key = getMonthKey(date);

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(request);
    });

    return Object.entries(groups).sort(
      ([a], [b]) => b.localeCompare(a)
    );
  }, [paidRequests]);

  /* =======================================================
     OPEN REQUEST
  ======================================================= */

  const handleOpenRequest = (request) => {
    navigate(
      "/laboratory-results",
      {
        state: {
          request,
        },
      }
    );
  };

  /* =======================================================
     SIGN OUT
  ======================================================= */

  const handleSignOut = async () => {
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

    localStorage.removeItem("currentUser");
    navigate("/");
  };

  /* =======================================================
     RETRY
  ======================================================= */

  const handleRetry = () => {
    loadDashboard();
  };

  /* =======================================================
     TODAY
  ======================================================= */

  const today = new Date().toLocaleDateString(
    "en-US",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );

  const closeMobileMenu = () => setMobileMenuOpen(false);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="nurse-dashboard">
      {legacyStylesEnabled && <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f7f9fc;
          color: #172033;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Arial,
            sans-serif;
        }

        button,
        input {
          font-family: inherit;
        }

        .nurse-dashboard {
          min-height: 100vh;
          display: flex;
          background: #f7f9fc;
        }

        /* ================= SIDEBAR ================= */

        .sidebar {
          width: 265px;
          position: fixed;
          inset: 0 auto 0 0;
          background: #fff;
          border-right: 1px solid #e7edf3;
          padding: 24px 17px;
          display: flex;
          flex-direction: column;
          z-index: 20;
        }

        .logo-container {
          height: 82px;
          padding: 0 10px 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid #eef1f4;
          margin-bottom: 23px;
        }

        .logo {
          width: 190px;
          max-height: 75px;
          object-fit: contain;
        }

        .menu-heading {
          padding: 0 12px 10px;
          color: #9aa4b2;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
        }

        .nav-button {
          width: 100%;
          border: 0;
          background: transparent;
          color: #667085;
          padding: 12px 13px;
          margin-bottom: 4px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 13px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 550;
          text-align: left;
          transition: .2s ease;
        }

        .nav-button:hover {
          background: #f1f8fa;
          color: #087f8c;
        }

        .nav-button.active {
          background: #e8f7f8;
          color: #087f8c;
          font-weight: 750;
        }

        .nav-icon {
          width: 21px;
          height: 21px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          flex-shrink: 0;
        }

        .sidebar-spacer {
          flex: 1;
        }

        .profile {
          border-top: 1px solid #edf0f4;
          padding: 17px 7px 4px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(
            135deg,
            #0b5cab,
            #08a7a1
          );
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .profile-name {
          margin: 0;
          color: #273449;
          font-size: 12px;
          font-weight: 750;
        }

        .profile-role {
          margin: 3px 0 0;
          color: #98a2b3;
          font-size: 10px;
        }

        /* ================= MAIN ================= */

        .main {
          width: calc(100% - 265px);
          margin-left: 265px;
          padding: 27px 35px 35px;
        }

        .mobile-topbar,
        .mobile-menu-overlay,
        .mobile-drawer-close {
          display: none;
        }

        .header {
          max-width: 1180px;
          margin: 0 auto 25px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .breadcrumb {
          margin: 0 0 8px;
          color: #98a2b3;
          font-size: 12px;
        }

        .breadcrumb span {
          color: #087f8c;
          font-weight: 700;
        }

        .title {
          margin: 0;
          color: #152238;
          font-size: 32px;
          line-height: 1.1;
          font-weight: 800;
          letter-spacing: -.7px;
        }

        .subtitle {
          margin: 8px 0 0;
          color: #7c8797;
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .date {
          padding: 12px 15px;
          background: #fff;
          border: 1px solid #e3e8ed;
          border-radius: 10px;
          color: #667085;
          font-size: 11px;
        }

        .refresh-button,
        .header-avatar {
          width: 42px;
          height: 42px;
          border-radius: 10px;
        }

        .refresh-button {
          border: 1px solid #e3e8ed;
          background: #fff;
          color: #667085;
          cursor: pointer;
          font-size: 18px;
        }

        .refresh-button:hover {
          color: #087f8c;
          background: #f6fbfb;
        }

        .header-avatar {
          background: #0b62b2;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }

        /* ================= STATS ================= */

        .stats {
          max-width: 1180px;
          margin: 0 auto 20px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
        }

        .stat-card {
          background: #fff;
          border: 1px solid #e4e9ee;
          border-radius: 14px;
          padding: 20px;
          min-height: 125px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-label {
          margin: 0;
          color: #7b8798;
          font-size: 12px;
          font-weight: 650;
        }

        .stat-number {
          margin: 8px 0 5px;
          color: #152238;
          font-size: 32px;
          font-weight: 800;
        }

        .stat-description {
          margin: 0;
          color: #a0a9b7;
          font-size: 9px;
        }

        .stat-icon {
          width: 47px;
          height: 47px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          font-weight: 800;
        }

        .blue {
          color: #0b5cab;
          background: #edf5ff;
        }

        .orange {
          color: #c77a00;
          background: #fff5e6;
        }

        .purple {
          color: #7056c9;
          background: #f2efff;
        }

        .green {
          color: #087f4f;
          background: #eaf9f1;
        }

        /* ================= WELCOME ================= */

        .welcome {
          max-width: 1180px;
          margin: 0 auto 20px;
          position: relative;
          overflow: hidden;
          background: linear-gradient(
            115deg,
            #07547d,
            #087f8c 62%,
            #0aa399
          );
          border-radius: 15px;
          padding: 25px 28px;
          color: #fff;
        }

        .welcome-label {
          margin: 0 0 6px;
          color: rgba(255,255,255,.72);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .welcome h2 {
          margin: 0;
          font-size: 21px;
          font-weight: 800;
        }

        .welcome p {
          margin: 8px 0 0;
          color: rgba(255,255,255,.8);
          font-size: 12px;
          line-height: 1.55;
        }

        /* ================= WORK CARD ================= */

        .work-card {
          max-width: 1180px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #e4e9ee;
          border-radius: 15px;
          overflow: hidden;
        }

        .work-header {
          padding: 21px 23px 16px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .work-title {
          margin: 0;
          font-size: 18px;
          color: #172033;
          font-weight: 800;
        }

        .work-subtitle {
          margin: 5px 0 0;
          color: #98a2b3;
          font-size: 11px;
        }

        .view-tabs {
          display: flex;
          gap: 6px;
          background: #f5f7f9;
          padding: 4px;
          border-radius: 9px;
        }

        .tab-button {
          border: 0;
          background: transparent;
          color: #667085;
          padding: 8px 12px;
          border-radius: 7px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 700;
        }

        .tab-button.active {
          background: #fff;
          color: #087f8c;
          box-shadow: 0 1px 4px rgba(20,40,70,.08);
        }

        .month-summary {
          margin: 0 23px 17px;
          padding: 15px 17px;
          background: #f5fbfb;
          border: 1px solid #dff0f1;
          border-radius: 11px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .month-summary strong {
          display: block;
          color: #087f8c;
          font-size: 12px;
        }

        .month-summary span {
          display: block;
          margin-top: 4px;
          color: #7b8798;
          font-size: 10px;
        }

        .payment-badge {
          padding: 7px 11px;
          border-radius: 20px;
          background: #fff5e6;
          color: #b76d00;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .payment-badge.paid {
          background: #eaf9f1;
          color: #087f4f;
        }

        .search-area {
          padding: 0 23px 17px;
        }

        .search-box {
          height: 43px;
          display: flex;
          align-items: center;
          background: #fafbfc;
          border: 1px solid #e0e6eb;
          border-radius: 9px;
          padding: 0 12px;
        }

        .search-icon {
          color: #98a2b3;
          margin-right: 8px;
        }

        .search-input {
          flex: 1;
          border: 0;
          outline: 0;
          background: transparent;
          color: #344054;
          font-size: 11px;
        }

        .clear {
          border: 0;
          background: transparent;
          color: #98a2b3;
          cursor: pointer;
          font-size: 16px;
        }

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          min-width: 850px;
          border-collapse: collapse;
        }

        th {
          padding: 12px 17px;
          background: #f8fafc;
          border-top: 1px solid #edf1f4;
          border-bottom: 1px solid #edf1f4;
          text-align: left;
          color: #7b8798;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .6px;
          text-transform: uppercase;
        }

        td {
          padding: 14px 17px;
          border-bottom: 1px solid #f0f2f5;
          vertical-align: middle;
          font-size: 10px;
        }

        tbody tr:hover {
          background: #fbfdfd;
        }

        .request-id {
          color: #087f8c;
          font-weight: 800;
        }

        .patient {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .patient-avatar {
          width: 35px;
          height: 35px;
          border-radius: 9px;
          background: #edf7f8;
          color: #087f8c;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          flex-shrink: 0;
        }

        .patient-name {
          margin: 0;
          color: #344054;
          font-weight: 750;
        }

        .patient-id {
          margin: 3px 0 0;
          color: #98a2b3;
          font-size: 8px;
        }

        .tests {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          max-width: 280px;
        }

        .test {
          padding: 4px 7px;
          background: #f4f6f8;
          color: #667085;
          border-radius: 5px;
          font-size: 8px;
        }

        .more-tests {
          padding: 4px 7px;
          background: #e9f7f8;
          color: #087f8c;
          border-radius: 5px;
          font-size: 8px;
          font-weight: 800;
        }

        .status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 8px;
          font-weight: 800;
          white-space: nowrap;
        }

        .status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
        }

        .status.pending {
          background: #fff6e7;
          color: #c77a00;
        }

        .status.accepted {
          background: #edf5ff;
          color: #0b5cab;
        }

        .status.collecting {
          background: #f3efff;
          color: #7357d9;
        }

        .status.processing {
          background: #eef1ff;
          color: #6654c7;
        }

        .status.transit {
          background: #eaf8fc;
          color: #087fa9;
        }

        .status.completed {
          background: #eaf9f1;
          color: #087f4f;
        }

        .open-button {
          border: 0;
          background: #e9f7f8;
          color: #087f8c;
          border-radius: 7px;
          padding: 8px 10px;
          cursor: pointer;
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
        }

        .open-button:hover {
          background: #dff2f3;
        }

        /* ================= HISTORY ================= */

        .history {
          padding: 0 23px 23px;
        }

        .history-month {
          border: 1px solid #e6ebef;
          border-radius: 11px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .history-month-header {
          padding: 13px 15px;
          background: #f8fafc;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .history-month-header strong {
          color: #344054;
          font-size: 12px;
        }

        .history-month-header span {
          color: #087f4f;
          font-size: 9px;
          font-weight: 800;
        }

        .history-row {
          padding: 12px 15px;
          border-top: 1px solid #edf1f4;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .history-patient {
          color: #344054;
          font-size: 10px;
          font-weight: 750;
        }

        .history-meta {
          margin-top: 3px;
          color: #98a2b3;
          font-size: 8px;
        }

        /* ================= STATES ================= */

        .loading,
        .error-state,
        .empty {
          padding: 60px 20px;
          text-align: center;
          color: #98a2b3;
          font-size: 11px;
        }

        .loading-icon {
          width: 44px;
          height: 44px;
          margin: 0 auto 12px;
          border-radius: 50%;
          border: 3px solid #e5f2f3;
          border-top-color: #087f8c;
          animation: spin .8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-title,
        .empty-title {
          margin: 0 0 7px;
          color: #344054;
          font-size: 14px;
        }

        .error-message,
        .empty-text {
          margin: 0 auto 15px;
          max-width: 500px;
          color: #98a2b3;
          line-height: 1.5;
          font-size: 10px;
        }

        .retry-button {
          border: 0;
          background: #087f8c;
          color: #fff;
          padding: 9px 15px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
        }

        .footer {
          max-width: 1180px;
          margin: 17px auto 0;
          display: flex;
          justify-content: space-between;
          color: #a0a9b5;
          font-size: 8px;
        }


        @media (max-width: 1100px) {
          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .main {
            padding: 25px;
          }
        }

        @media (max-width: 850px) {
          .sidebar {
            width: 75px;
            padding: 20px 9px;
          }

          .main {
            width: calc(100% - 75px);
            margin-left: 75px;
            padding: 20px 16px;
          }

          .logo {
            width: 48px;
          }

          .menu-heading,
          .nav-text,
          .profile-details {
            display: none;
          }

          .nav-button {
            justify-content: center;
            padding: 12px;
          }

          .profile {
            justify-content: center;
          }

          .header {
            flex-direction: column;
          }
        }

        @media (max-width: 600px) {
          .stats {
            grid-template-columns: 1fr;
          }

          .main {
            padding: 16px 12px;
          }

          .title {
            font-size: 25px;
          }

          .date {
            display: none;
          }

          .work-header {
            flex-direction: column;
          }

          .month-summary {
            align-items: flex-start;
            flex-direction: column;
          }

          .view-tabs {
            width: 100%;
          }

          .tab-button {
            flex: 1;
          }

          .footer {
            flex-direction: column;
            gap: 5px;
          }
        }
        /* ================= MOBILE REQUEST CARDS ================= */

        .mobile-request-list {
          display: none;
        }

        .mobile-request-card {
          background: #fff;
          border: 1px solid #e4e9ee;
          border-radius: 14px;
          margin: 0 14px 12px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, .03);
        }

        .mobile-request-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 16px;
        }

        .mobile-request-id {
          color: #087f8c;
          font-size: 11px;
          font-weight: 800;
        }

        .mobile-patient {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 17px;
        }

        .mobile-patient-avatar {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: #eaf8f9;
          color: #087f8c;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .mobile-patient-info {
          min-width: 0;
        }

        .mobile-patient-name {
          margin: 0;
          color: #111827;
          font-size: 12px;
          font-weight: 750;
          word-break: break-word;
        }

        .mobile-patient-id {
          margin: 4px 0 0;
          color: #9ca3af;
          font-size: 9px;
        }

        .mobile-test-section {
          margin-bottom: 15px;
        }

        .mobile-label {
          margin: 0 0 7px;
          color: #9ca3af;
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .5px;
        }

        .mobile-tests {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .mobile-test {
          background: #f3f6f8;
          color: #4b5563;
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 8px;
          line-height: 1.2;
        }

        .mobile-request-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding: 13px 0;
          border-top: 1px solid #eef0f4;
          border-bottom: 1px solid #eef0f4;
        }

        .mobile-meta-item {
          min-width: 0;
        }

        .mobile-meta-value {
          color: #374151;
          font-size: 9px;
          font-weight: 650;
          word-break: break-word;
        }

        .mobile-request-footer {
          padding-top: 12px;
        }

        .mobile-open-button {
          width: 100%;
          border: 0;
          background: #087f8c;
          color: #fff;
          border-radius: 8px;
          padding: 11px 12px;
          font-size: 10px;
          font-weight: 750;
          cursor: pointer;
        }

        .mobile-open-button:hover {
          background: #066d78;
        }

        @media (max-width: 600px) {
          .nurse-dashboard {
            display: block;
            min-height: 100vh;
          }

          /* ================= MOBILE DRAWER ================= */

          .sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: auto !important;
            bottom: 0 !important;
            width: min(300px, 86vw) !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            margin: 0 !important;
            padding: 16px 14px 18px !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            background: #ffffff !important;
            border-right: 1px solid #e7edf3 !important;
            border-top: 0 !important;
            transform: translate3d(-110%, 0, 0) !important;
            visibility: hidden !important;
            pointer-events: none !important;
            transition: transform .25s ease, visibility 0s linear .25s !important;
            box-shadow: 10px 0 35px rgba(15, 23, 42, .14) !important;
            z-index: 1000 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -webkit-overflow-scrolling: touch;
          }

          .sidebar.mobile-menu-open {
            transform: translate3d(0, 0, 0) !important;
            visibility: visible !important;
            pointer-events: auto !important;
            transition: transform .25s ease !important;
          }

          .sidebar > div:first-child {
            width: 100%;
            height: auto;
            display: block;
          }

          .logo-container {
            height: 74px;
            padding: 0 8px 15px;
            margin-bottom: 18px;
          }

          .logo {
            width: 150px;
            max-height: 62px;
          }

          .mobile-drawer-close {
            display: flex;
            position: absolute;
            top: 18px;
            right: 14px;
            width: 34px;
            height: 34px;
            align-items: center;
            justify-content: center;
            border: 1px solid #e5e7eb;
            background: #ffffff;
            color: #475467;
            border-radius: 9px;
            font-size: 22px;
            line-height: 1;
            cursor: pointer;
            z-index: 2;
          }

          .mobile-drawer-close:hover {
            background: #f5f7fa;
          }

          .menu-heading {
            display: block;
            padding: 0 11px 8px;
            margin-top: 14px !important;
            font-size: 9px;
          }

          .nav-text {
            display: block;
            max-width: none;
            overflow: visible;
            text-overflow: clip;
            white-space: normal;
            font-size: 13px;
          }

          .nav-button {
            width: 100%;
            height: 45px;
            margin-bottom: 4px;
            padding: 10px 12px;
            justify-content: flex-start;
            flex-direction: row;
            gap: 13px;
            border-radius: 10px;
            text-align: left;
          }

          .nav-icon {
            width: 22px;
            height: 22px;
            font-size: 16px;
          }

          .sidebar-spacer {
            display: block;
            flex: 1;
            min-height: 15px;
          }

          .profile {
            display: flex;
            justify-content: flex-start;
            padding: 14px 7px 4px;
          }

          .profile-details {
            display: block;
          }

          .mobile-menu-overlay {
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
            border: 0;
            padding: 0;
            margin: 0;
            background: rgba(15, 23, 42, .38);
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transition: opacity .25s ease, visibility .25s ease;
            z-index: 990;
          }

          .mobile-menu-overlay.show {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
          }

          /* ================= MOBILE TOP BAR ================= */

          .mobile-topbar {
            position: relative;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            height: 52px;
            margin-bottom: 12px;
          }

          .mobile-menu-button {
            width: 42px;
            height: 42px;
            border: 1px solid #e1e7ed;
            background: #ffffff;
            border-radius: 10px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            flex-shrink: 0;
          }

          .mobile-menu-button span {
            display: block;
            width: 17px;
            height: 2px;
            border-radius: 2px;
            background: #344054;
          }

          .mobile-brand {
            min-width: 0;
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
          }

          .mobile-brand img {
            width: 39px;
            height: 39px;
            object-fit: contain;
          }

          .mobile-brand div {
            min-width: 0;
            display: flex;
            flex-direction: column;
          }

          .mobile-brand strong {
            color: #172033;
            font-size: 12px;
            line-height: 1.1;
          }

          .mobile-brand span {
            color: #98a2b3;
            font-size: 8px;
            margin-top: 2px;
          }

          .mobile-avatar {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            background: linear-gradient(135deg, #0b5cab, #08a7a1);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 800;
            flex-shrink: 0;
          }

          /* ================= MAIN ================= */

          .main {
            width: 100%;
            margin-left: 0;
            padding: 12px 12px 28px;
          }

          .header {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
            margin-bottom: 16px;
          }

          .breadcrumb {
            font-size: 9px;
          }

          .title {
            font-size: 24px;
            line-height: 1.15;
          }

          .subtitle {
            font-size: 11px;
            line-height: 1.45;
          }

          .header-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .date {
            display: flex;
            flex: 1;
            justify-content: center;
            align-items: center;
          }

          .stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 9px;
          }

          .stat-card {
            min-height: 104px;
            padding: 13px;
          }

          .stat-number {
            font-size: 25px;
          }

          .stat-icon {
            width: 36px;
            height: 36px;
            font-size: 15px;
          }

          .welcome {
            padding: 18px;
          }

          .work-header {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .view-tabs {
            width: 100%;
          }

          .tab-button {
            flex: 1;
          }

          .month-summary {
            align-items: stretch;
            flex-direction: column;
            gap: 9px;
          }

          .payment-badge {
            width: 100%;
            text-align: center;
          }

          .search-area {
            padding-left: 14px;
            padding-right: 14px;
          }

          .desktop-request-table {
            display: none !important;
          }

          .mobile-request-list {
            display: block;
          }

          .history {
            padding-left: 12px;
            padding-right: 12px;
          }

          .history-row {
            align-items: flex-start;
            gap: 10px;
          }

          .footer {
            flex-direction: column;
            gap: 5px;
            text-align: center;
          }
        }

        @media (max-width: 380px) {
          .main {
            padding-left: 9px;
            padding-right: 9px;
          }

          .title {
            font-size: 22px;
          }

          .stats {
            gap: 7px;
          }

          .stat-card {
            min-height: 96px;
            padding: 10px;
          }

          .stat-description {
            display: none;
          }

          .stat-number {
            font-size: 22px;
          }

          .mobile-request-card {
            margin-left: 10px;
            margin-right: 10px;
            padding: 13px;
          }

          .mobile-request-meta {
            gap: 8px;
          }
        }


        /* =====================================================
           FINAL MOBILE DRAWER OVERRIDES
           These rules intentionally come last so they win over
           all earlier tablet/mobile sidebar rules.
        ===================================================== */

        @media screen and (max-width: 900px) {
          html,
          body {
            width: 100%;
            min-width: 0;
            overflow-x: hidden;
          }

          .nurse-dashboard {
            width: 100%;
            min-height: 100vh;
            overflow-x: hidden;
          }

          .nurse-dashboard .main {
            width: 100% !important;
            margin-left: 0 !important;
            padding: 12px !important;
          }

          /* Mobile sidebar: hidden until the React state adds the class */
          .nurse-dashboard .sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: auto !important;
            bottom: auto !important;
            width: min(290px, 84vw) !important;
            height: 100vh !important;
            height: 100dvh !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 16px 14px 20px !important;
            display: flex !important;
            flex-direction: column !important;
            background: #ffffff !important;
            border: 0 !important;
            border-right: 1px solid #e5e7eb !important;
            box-shadow: 14px 0 35px rgba(15,23,42,.16) !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
            transform: translateX(-105%) !important;
            opacity: 1 !important;
            visibility: hidden !important;
            pointer-events: none !important;
            transition: transform .25s ease, visibility 0s linear .25s !important;
            z-index: 9999 !important;
          }

          .nurse-dashboard .sidebar.mobile-menu-open {
            transform: translateX(0) !important;
            visibility: visible !important;
            pointer-events: auto !important;
            transition: transform .25s ease !important;
          }

          .nurse-dashboard .sidebar > div:first-child {
            width: 100% !important;
            height: auto !important;
            display: block !important;
            flex: 0 0 auto !important;
          }

          .nurse-dashboard .mobile-drawer-close {
            display: flex !important;
            position: absolute !important;
            top: 14px !important;
            right: 12px !important;
            width: 36px !important;
            height: 36px !important;
            align-items: center !important;
            justify-content: center !important;
            border: 1px solid #e5e7eb !important;
            background: #fff !important;
            border-radius: 9px !important;
            color: #344054 !important;
            font-size: 22px !important;
            cursor: pointer !important;
            z-index: 10000 !important;
          }

          .nurse-dashboard .logo-container {
            height: 72px !important;
            margin-bottom: 16px !important;
            padding: 0 45px 12px 8px !important;
          }

          .nurse-dashboard .logo {
            width: 145px !important;
            max-height: 58px !important;
          }

          .nurse-dashboard .menu-heading {
            display: block !important;
            padding: 0 10px 8px !important;
            margin-top: 14px !important;
            font-size: 9px !important;
          }

          .nurse-dashboard .nav-button {
            display: flex !important;
            width: 100% !important;
            height: 44px !important;
            padding: 9px 11px !important;
            margin: 0 0 3px !important;
            flex-direction: row !important;
            justify-content: flex-start !important;
            align-items: center !important;
            gap: 12px !important;
            border-radius: 9px !important;
          }

          .nurse-dashboard .nav-text {
            display: block !important;
            font-size: 12px !important;
            white-space: normal !important;
          }

          .nurse-dashboard .nav-icon {
            display: flex !important;
            width: 22px !important;
            height: 22px !important;
            flex-shrink: 0 !important;
          }

          .nurse-dashboard .sidebar-spacer {
            display: block !important;
            flex: 1 1 auto !important;
            min-height: 18px !important;
          }

          .nurse-dashboard .profile {
            display: flex !important;
            padding: 13px 6px 3px !important;
            flex-shrink: 0 !important;
          }

          .nurse-dashboard .profile-details {
            display: block !important;
          }

          /* Overlay must be behind drawer but above page */
          .nurse-dashboard .mobile-menu-overlay {
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
            transition: opacity .25s ease, visibility 0s linear .25s !important;
          }

          .nurse-dashboard .mobile-menu-overlay.show {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
            transition: opacity .25s ease !important;
          }

          .nurse-dashboard .mobile-topbar {
            display: flex !important;
            position: relative !important;
            width: 100% !important;
            height: 52px !important;
            margin: 0 0 12px !important;
            align-items: center !important;
            justify-content: space-between !important;
            z-index: 1 !important;
          }

          .nurse-dashboard .mobile-menu-button {
            display: flex !important;
            width: 42px !important;
            height: 42px !important;
            flex-shrink: 0 !important;
            align-items: center !important;
            justify-content: center !important;
            flex-direction: column !important;
            gap: 4px !important;
            border: 1px solid #e1e7ed !important;
            background: #fff !important;
            border-radius: 10px !important;
            cursor: pointer !important;
          }

          .nurse-dashboard .mobile-brand {
            display: flex !important;
            flex: 1 !important;
            min-width: 0 !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .nurse-dashboard .mobile-avatar {
            display: flex !important;
            width: 38px !important;
            height: 38px !important;
            flex-shrink: 0 !important;
          }

          /* Request cards also switch at tablet/mobile widths */
          .nurse-dashboard .desktop-request-table {
            display: none !important;
          }

          .nurse-dashboard .mobile-request-list {
            display: block !important;
          }
        }

      `}</style>}

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside className={`sidebar ${mobileMenuOpen ? "mobile-menu-open" : ""}`}>
        <div>
          <div className="logo-container">
            <img
              src="/samplogy-logo.png"
              alt="Samplogy Sample Delivery"
              className="logo"
            />
          </div>

          <button
            type="button"
            className="mobile-drawer-close"
            aria-label="Close navigation menu"
            onClick={closeMobileMenu}
          >
            ×
          </button>

          <div className="menu-heading">
            WORKSPACE
          </div>

          <button
            type="button"
            className="nav-button active"
            onClick={() => { closeMobileMenu(); navigate("/nurse"); }}
          >
            <span className="nav-icon">⌂</span>
            <span className="nav-text">Dashboard</span>
          </button>

          <button
            type="button"
            className="nav-button"
            onClick={() => { closeMobileMenu(); navigate("/register-patient"); }}
          >
            <span className="nav-icon">＋</span>
            <span className="nav-text">Register Patient</span>
          </button>

          <button
            type="button"
            className="nav-button"
            onClick={() => { closeMobileMenu(); navigate("/laboratory-request"); }}
          >
            <span className="nav-icon">◇</span>
            <span className="nav-text">New Sample Request</span>
          </button>

          <button
            type="button"
            className="nav-button"
            onClick={() => { closeMobileMenu(); navigate("/sample-tracking"); }}
          >
            <span className="nav-icon">↗</span>
            <span className="nav-text">Sample Tracking</span>
          </button>

          <button
            type="button"
            className="nav-button"
            onClick={() => { closeMobileMenu(); setView("history"); }}
          >
            <span className="nav-icon">▤</span>
            <span className="nav-text">Laboratory Results</span>
          </button>

          <div
            className="menu-heading"
            style={{ marginTop: "20px" }}
          >
            HISTORY
          </div>

          <button
            type="button"
            className="nav-button"
            onClick={() => { closeMobileMenu(); setView("history"); }}
          >
            <span className="nav-icon">▣</span>
            <span className="nav-text">My Work History</span>
          </button>

          <div
            className="menu-heading"
            style={{ marginTop: "5px" }}
          >
            ACCOUNT
          </div>
 <button
            type="button"
            className="nav-button"
            onClick={() => { closeMobileMenu(); handleSignOut(); }}
          >
            <span className="nav-icon">↪</span>
            <span className="nav-text">Sign Out</span>
          </button>

          <button
            type="button"
            className="nav-button"
            onClick={() => { closeMobileMenu(); navigate("/nurse-profile"); }}
          >
            <span className="nav-icon">○</span>
            <span className="nav-text">My Profile</span>
          </button>

         
        </div>

        <div className="sidebar-spacer" />

        <div className="profile">
          <div className="avatar">
            {nurseName.charAt(0).toUpperCase()}
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

      <button
        type="button"
        className={`mobile-menu-overlay ${mobileMenuOpen ? "show" : ""}`}
        aria-label="Close navigation menu"
        onClick={closeMobileMenu}
      />

      {/* ===================================================
          MAIN
      =================================================== */}

     <div className="nurse-dashboard-page">
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
              src="/samplogy-logo.png"
              alt="Samplogy"
            />
            <div>
              <strong>Samplogy</strong>
              <span>Nurse Portal</span>
            </div>
          </div>

          <div className="mobile-avatar">
            {nurseName.charAt(0).toUpperCase()}
          </div>
        </div>

        <header className="header">
          <div>
            <p className="breadcrumb">
              Samplogy /{" "}
              <span>Nurse Portal</span>
            </p>

            <h1 className="title">
              Nurse Dashboard
            </h1>

            <p className="subtitle">
              Coordinate patient samples and monitor
              your laboratory requests.
            </p>
          </div>

          <div className="header-actions">
            <div className="date">
              Today · {today}
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={handleRetry}
              title="Refresh"
            >
              ↻
            </button>

            <div className="header-avatar">
              {nurseName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* =================================================
            STATISTICS
        ================================================= */}

        <section className="stats">
          <div className="stat-card">
            <div>
              <p className="stat-label">
                Current Requests
              </p>

              <h2 className="stat-number">
                {totalRequests}
              </h2>

              <p className="stat-description">
                Unpaid/current nurse work
              </p>
            </div>

            <div className="stat-icon blue">
              □
            </div>
          </div>

          <div className="stat-card">
            <div>
              <p className="stat-label">
                Pending Samples
              </p>

              <h2 className="stat-number">
                {pendingRequests}
              </h2>

              <p className="stat-description">
                Awaiting action
              </p>
            </div>

            <div className="stat-icon orange">
              ◷
            </div>
          </div>

          <div className="stat-card">
            <div>
              <p className="stat-label">
                In Progress
              </p>

              <h2 className="stat-number">
                {inProgressRequests}
              </h2>

              <p className="stat-description">
                Active laboratory work
              </p>
            </div>

            <div className="stat-icon purple">
              ↗
            </div>
          </div>

          <div className="stat-card">
            <div>
              <p className="stat-label">
                Completed
              </p>

              <h2 className="stat-number">
                {completedRequests}
              </h2>

              <p className="stat-description">
                Awaiting payment settlement
              </p>
            </div>

            <div className="stat-icon green">
              ✓
            </div>
          </div>
        </section>

        {/* =================================================
            WELCOME
        ================================================= */}

        <section className="welcome">
          <p className="welcome-label">
            SAMPLOGY SAMPLE DELIVERY
          </p>

          <h2>
            Welcome, {nurseName}
          </h2>

          <p>
            Your dashboard shows your own requests only.
            When admin marks a month's work as paid, those
            requests leave the current list but remain
            available in your history.
          </p>
        </section>

        {/* =================================================
            WORK / HISTORY CARD
        ================================================= */}

        <section className="work-card">
          <div className="work-header">
            <div>
              <h2 className="work-title">
                {view === "current"
                  ? "My Current Work"
                  : "My Work History"}
              </h2>

              <p className="work-subtitle">
                {view === "current"
                  ? "Requests that have not yet been settled by admin."
                  : "Paid requests remain available here permanently."}
              </p>
            </div>

            <div className="view-tabs">
              <button
                type="button"
                className={`tab-button ${
                  view === "current"
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  setView("current");
                  setSearchTerm("");
                }}
              >
                Current Work
              </button>

              <button
                type="button"
                className={`tab-button ${
                  view === "history"
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  setView("history");
                  setSearchTerm("");
                }}
              >
                Work History
              </button>
            </div>
          </div>

          {/* CURRENT MONTH SUMMARY */}

          {view === "current" && (
            <div className="month-summary">
              <div>
                <strong>
                  {formatMonth(currentMonthKey)}
                </strong>

                <span>
                  {currentMonthRequests.length} current
                  request
                  {currentMonthRequests.length === 1
                    ? ""
                    : "s"}
                </span>
              </div>

              {currentMonthPayment?.payment_status ===
              "Paid" ? (
                <div className="payment-badge paid">
                  ✓ PAID
                </div>
              ) : (
                <div className="payment-badge">
                  PAYMENT PENDING
                </div>
              )}
            </div>
          )}

          {/* SEARCH */}

          <div className="search-area">
            <div className="search-box">
              <span className="search-icon">
                ⌕
              </span>

              <input
                className="search-input"
                type="text"
                placeholder={
                  view === "current"
                    ? "Search patient, patient ID, request ID or test..."
                    : "Search your paid work history..."
                }
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
              />

              {searchTerm && (
                <button
                  type="button"
                  className="clear"
                  onClick={() => setSearchTerm("")}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* =================================================
              CONTENT
          ================================================= */}

          {loading ? (
            <div className="loading">
              <div className="loading-icon" />
              Loading your dashboard...
            </div>
          ) : errorMessage ? (
            <div className="error-state">
              <h3 className="error-title">
                Unable to load dashboard
              </h3>

              <p className="error-message">
                {errorMessage}
              </p>

              <button
                type="button"
                className="retry-button"
                onClick={handleRetry}
              >
                Try Again
              </button>
            </div>
          ) : view === "history" ? (
            historyByMonth.length === 0 ? (
              <div className="empty">
                <h3 className="empty-title">
                  No paid work history yet
                </h3>

                <p className="empty-text">
                  Once admin marks your monthly work as
                  paid, it will appear here.
                </p>
              </div>
            ) : displayedRequests.length === 0 ? (
              <div className="empty">
                <h3 className="empty-title">
                  No matching history
                </h3>

                <p className="empty-text">
                  Try another patient name, request ID,
                  patient ID, or test.
                </p>
              </div>
            ) : (
              <div className="history">
                {historyByMonth.map(
                  ([month, monthRequests]) => {
                    const visibleMonthRequests =
                      monthRequests.filter((request) =>
                        displayedRequests.some(
                          (item) =>
                            String(item.id) ===
                            String(request.id)
                        )
                      );

                    if (
                      visibleMonthRequests.length ===
                      0
                    ) {
                      return null;
                    }

                    const payment =
                      payments.find(
                        (item) =>
                          item.payment_month?.slice(
                            0,
                            7
                          ) === month
                      );

                    return (
                      <div
                        className="history-month"
                        key={month}
                      >
                        <div className="history-month-header">
                          <strong>
                            {formatMonth(month)}
                          </strong>

                          <span>
                            ✓{" "}
                            {payment?.payment_status ||
                              "PAID"}
                            {payment?.total_amount
                              ? ` · ${payment.total_amount} ETB`
                              : ""}
                          </span>
                        </div>

                        {visibleMonthRequests.map(
                          (request) => (
                            <div
                              className="history-row"
                              key={request.id}
                            >
                              <div>
                                <div className="history-patient">
                                  {getPatientName(
                                    request.patient
                                  )}
                                </div>

                                <div className="history-meta">
                                  LAB-
                                  {String(
                                    request.id
                                  ).padStart(
                                    6,
                                    "0"
                                  )}{" "}
                                  ·{" "}
                                  {formatDate(
                                    request.created_at
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                className="open-button"
                                onClick={() =>
                                  handleOpenRequest(
                                    request
                                  )
                                }
                              >
                                View Results →
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )
          ) : displayedRequests.length === 0 ? (
            <div className="empty">
              <h3 className="empty-title">
                {currentRequests.length === 0
                  ? "No current requests"
                  : "No matching requests"}
              </h3>

              <p className="empty-text">
                {currentRequests.length === 0
                  ? "Your current list is clear. Paid work remains available in Work History."
                  : "Try another patient name, patient ID, request ID, or test."}
              </p>
            </div>
          ) : (
            <>
              <div className="table-wrapper desktop-request-table">
                <table>
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Patient</th>
                      <th>Laboratory Tests</th>
                      <th>Request Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {displayedRequests.map((request, index) => {
                      const patient = request.patient || {};
                      const patientName = getPatientName(patient);
                      const patientId = getPatientId(patient);
                      const requestTests = getTests(request);
                      const status = getStatus(request.status);

                      return (
                        <tr
                          key={request.id ?? `request-${index}`}
                        >
                          <td>
                            <span className="request-id">
                              LAB-{String(request.id ?? index + 1).padStart(6, "0")}
                            </span>
                          </td>

                          <td>
                            <div className="patient">
                              <div className="patient-avatar">
                                {patientName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="patient-name">{patientName}</p>
                                <p className="patient-id">{patientId}</p>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="tests">
                              {requestTests.length === 0 ? (
                                <span className="test">Sample Collection</span>
                              ) : (
                                <>
                                  {requestTests.slice(0, 3).map((test, testIndex) => (
                                    <span
                                      className="test"
                                      key={`${request.id}-${testIndex}`}
                                    >
                                      {getTestName(test)}
                                    </span>
                                  ))}
                                  {requestTests.length > 3 && (
                                    <span className="more-tests">
                                      +{requestTests.length - 3} more
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </td>

                          <td>
                            {formatDate(request.request_date || request.created_at)}
                          </td>

                          <td>
                            <span className={`status ${status.className}`}>
                              <span className="status-dot" />
                              {status.label}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="open-button"
                              onClick={() => handleOpenRequest(request)}
                            >
                              {request.status === "Completed" || request.status === "Delivered"
                                ? "View Results →"
                                : "Open Request →"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mobile-request-list">
                {displayedRequests.map((request, index) => {
                  const patient = request.patient || {};
                  const patientName = getPatientName(patient);
                  const patientId = getPatientId(patient);
                  const requestTests = getTests(request);
                  const status = getStatus(request.status);
                  const isCompleted =
                    request.status === "Completed" ||
                    request.status === "Delivered";

                  return (
                    <article
                      className="mobile-request-card"
                      key={request.id ?? `mobile-request-${index}`}
                    >
                      <div className="mobile-request-top">
                        <span className="mobile-request-id">
                          LAB-{String(request.id ?? index + 1).padStart(6, "0")}
                        </span>
                        <span className={`status ${status.className}`}>
                          <span className="status-dot" />
                          {status.label}
                        </span>
                      </div>

                      <div className="mobile-patient">
                        <div className="mobile-patient-avatar">
                          {patientName.charAt(0).toUpperCase()}
                        </div>
                        <div className="mobile-patient-info">
                          <p className="mobile-patient-name">
                            {patientName}
                          </p>
                          <p className="mobile-patient-id">
                            Patient ID: {patientId}
                          </p>
                        </div>
                      </div>

                      <div className="mobile-test-section">
                        <p className="mobile-label">Laboratory Tests</p>
                        <div className="mobile-tests">
                          {requestTests.length === 0 ? (
                            <span className="mobile-test">
                              Sample Collection
                            </span>
                          ) : (
                            requestTests.map((test, testIndex) => (
                              <span
                                className="mobile-test"
                                key={`${request.id}-mobile-${testIndex}`}
                              >
                                {getTestName(test)}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="mobile-request-meta">
                        <div className="mobile-meta-item">
                          <p className="mobile-label">Request Date</p>
                          <div className="mobile-meta-value">
                            {formatDate(
                              request.request_date || request.created_at
                            )}
                          </div>
                        </div>

                        <div className="mobile-meta-item">
                          <p className="mobile-label">Status</p>
                          <div className="mobile-meta-value">
                            {status.label}
                          </div>
                        </div>
                      </div>

                      <div className="mobile-request-footer">
                        <button
                          type="button"
                          className="mobile-open-button"
                          onClick={() => handleOpenRequest(request)}
                        >
                          {isCompleted
                            ? "View Results →"
                            : "Open Request →"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <footer className="footer">
          <span>© 2026 Samplogy</span>
          <span>Nurse Management Portal</span>
        </footer>
      </div>
    </div>
  );
}

export default NurseDashboard;
