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

  const [requests, setRequests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState("current");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [nurseName, setNurseName] = useState("Nurse");

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

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="nurse-dashboard">
      <div className="nurse-dashboard-page">
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
