import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  getCurrentMonth,
  getStatusStyle,
  formatDate,
  formatMonth,
  normalizeTests,
  PAYMENT_RATE,
  TEST_NAME_BY_VALUE,
  TEST_OPTIONS,
} from "./adminDashboard.utils";

function AdminDashboard() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());

  const [expandedNurses, setExpandedNurses] = useState({});
  const [editingRequest, setEditingRequest] = useState(null);

  const [editDate, setEditDate] = useState("");
  const [editTests, setEditTests] = useState([]);
  const [editNotes, setEditNotes] = useState("");

  const [paymentMessage, setPaymentMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [
        profilesResult,
        patientsResult,
        requestsResult,
        paymentsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, username, role, status, city_id"
          ),

        supabase
          .from("patients")
          .select(
            "id, patient_id, full_name, gender, phone, city, region, facility"
          ),

        supabase
          .from("laboratory_requests")
          .select(
            "id, patient_id, requested_by, processed_by, status, notes, created_at, completed_at, tests, request_date, results, laboratory_notes, completed_date, payment_id"
          )
          .order("created_at", { ascending: false }),

        supabase
          .from("nurse_payments")
          .select(
            "id, nurse_id, payment_month, request_count, total_amount, payment_status, paid_at, paid_by, notes, created_at"
          )
          .order("created_at", { ascending: false }),
      ]);

      if (profilesResult.error) {
        throw new Error(
          `Profiles: ${profilesResult.error.message}`
        );
      }

      if (patientsResult.error) {
        throw new Error(
          `Patients: ${patientsResult.error.message}`
        );
      }

      if (requestsResult.error) {
        throw new Error(
          `Laboratory requests: ${requestsResult.error.message}`
        );
      }

      /*
       * nurse_payments may still have an RLS policy problem in
       * your Supabase project. The dashboard continues to work
       * for requests if this query fails, but payment history
       * will be unavailable until the policy is fixed.
       */
      if (paymentsResult.error) {
        console.warn(
          "Nurse payments could not be loaded:",
          paymentsResult.error.message
        );
      }

      const profileRows = profilesResult.data || [];
      const patientRows = patientsResult.data || [];
      const requestRows = requestsResult.data || [];
      const paymentRows = paymentsResult.error
        ? []
        : paymentsResult.data || [];

      const profileMap = new Map(
        profileRows.map((profile) => [
          profile.id,
          profile,
        ])
      );

      const patientMap = new Map(
        patientRows.map((patient) => [
          patient.id,
          patient,
        ])
      );

      const enrichedRequests = requestRows.map(
        (request) => ({
          ...request,
          patient:
            patientMap.get(request.patient_id) || null,
          nurse:
            profileMap.get(request.requested_by) ||
            null,
          processedBy:
            profileMap.get(request.processed_by) ||
            null,
        })
      );

      setProfiles(profileRows);
      setRequests(enrichedRequests);
      setPayments(paymentRows);
    } catch (error) {
      console.error("Admin dashboard error:", error);

      setErrorMessage(
        error?.message ||
          "Unable to load the admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!active) return;
      await loadDashboard();
    };

    load();

    return () => {
      active = false;
    };
  }, [loadDashboard]);

  const nurses = useMemo(
    () =>
      profiles.filter(
        (profile) =>
          profile.role === "nurse" &&
          profile.status !== "Rejected"
      ),
    [profiles]
  );

  const nurseMap = useMemo(
    () =>
      new Map(
        nurses.map((nurse) => [
          nurse.id,
          nurse,
        ])
      ),
    [nurses]
  );

  const totalPatients = useMemo(() => {
    return new Set(
      requests
        .map((request) => request.patient_id)
        .filter(Boolean)
    ).size;
  }, [requests]);

  const totalRequests = requests.length;

  const pendingRequests = requests.filter(
    (request) => request.status === "Pending"
  ).length;

  const processingRequests = requests.filter(
    (request) => request.status === "Processing"
  ).length;

  const completedRequests = requests.filter(
    (request) => request.status === "Completed"
  ).length;

  const cancelledRequests = requests.filter(
    (request) => request.status === "Cancelled"
  ).length;

  const completedUnpaidRequests = requests.filter(
    (request) =>
      request.status === "Completed" &&
      !request.payment_id
  );

  const selectedMonthPrefix =
    selectedMonth.slice(0, 7);

  const monthlyPayableRequests =
    completedUnpaidRequests.filter((request) => {
      const date =
        request.request_date ||
        request.completed_date ||
        request.created_at;

      return date?.slice(0, 7) === selectedMonthPrefix;
    });

  const monthlyPaymentRows = useMemo(() => {
    const rows = new Map();

    monthlyPayableRequests.forEach((request) => {
      const nurseId = request.requested_by;

      if (!nurseId) return;

      const nurse = nurseMap.get(nurseId);

      const key = nurseId;

      if (!rows.has(key)) {
        rows.set(key, {
          nurseId,
          nurseName:
            nurse?.full_name ||
            "Unknown Nurse",
          username:
            nurse?.username || "-",
          requestCount: 0,
          totalAmount: 0,
          requests: [],
        });
      }

      const row = rows.get(key);

      row.requestCount += 1;
      row.totalAmount += PAYMENT_RATE;
      row.requests.push(request);
    });

    return Array.from(rows.values()).sort(
      (a, b) =>
        a.nurseName.localeCompare(b.nurseName)
    );
  }, [
    monthlyPayableRequests,
    nurseMap,
  ]);

  const monthlyTotalRequests =
    monthlyPaymentRows.reduce(
      (sum, row) => sum + row.requestCount,
      0
    );

  const monthlyTotalAmount =
    monthlyPaymentRows.reduce(
      (sum, row) => sum + row.totalAmount,
      0
    );

  const monthlyAlreadyPaid = payments.filter(
    (payment) =>
      payment.payment_month?.slice(0, 7) ===
        selectedMonthPrefix &&
      payment.payment_status === "Paid"
  );

  const filteredRequests = useMemo(() => {
    const search =
      searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      const nurseName =
        request.nurse?.full_name
          ?.toLowerCase() || "";

      const nurseUsername =
        request.nurse?.username
          ?.toLowerCase() || "";

      const patientName =
        request.patient?.full_name
          ?.toLowerCase() || "";

      const patientId =
        request.patient?.patient_id
          ?.toLowerCase() || "";

      const requestId =
        String(request.id || "")
          .toLowerCase();

      const matchesSearch =
        !search ||
        nurseName.includes(search) ||
        nurseUsername.includes(search) ||
        patientName.includes(search) ||
        patientId.includes(search) ||
        requestId.includes(search);

      const matchesStatus =
        statusFilter === "All" ||
        request.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    requests,
    searchTerm,
    statusFilter,
  ]);

  const groupedRequests = useMemo(() => {
    const groups = new Map();

    filteredRequests.forEach((request) => {
      const nurseId =
        request.requested_by ||
        "unknown-nurse";

      if (!groups.has(nurseId)) {
        groups.set(nurseId, {
          nurseId,
          nurse:
            request.nurse || null,
          requests: [],
        });
      }

      groups.get(nurseId).requests.push(
        request
      );
    });

    return Array.from(groups.values()).sort(
      (a, b) =>
        (a.nurse?.full_name ||
          "Unknown Nurse"
        ).localeCompare(
          b.nurse?.full_name ||
            "Unknown Nurse"
        )
    );
  }, [filteredRequests]);

  const toggleNurse = (nurseId) => {
    setExpandedNurses((current) => ({
      ...current,
      [nurseId]: !current[nurseId],
    }));
  };

  const openEdit = (request) => {
    setEditingRequest(request);
    setEditDate(
      request.request_date ||
        new Date().toISOString().slice(0, 10)
    );
    setEditTests(
      normalizeTests(request.tests)
    );
    setEditNotes(request.notes || "");
    setErrorMessage("");
  };

  const closeEdit = () => {
    if (actionLoading) return;

    setEditingRequest(null);
    setEditDate("");
    setEditTests([]);
    setEditNotes("");
  };

  const addTest = () => {
    setEditTests((current) => [
      ...current,
      TEST_OPTIONS[0],
    ]);
  };

  const updateTest = (index, value) => {
    const option =
      TEST_OPTIONS.find(
        (test) => test.value === value
      ) || {
        value,
        label:
          TEST_NAME_BY_VALUE[value] || value,
      };

    setEditTests((current) =>
      current.map((test, testIndex) =>
        testIndex === index
          ? option
          : test
      )
    );
  };

  const removeTest = (index) => {
    setEditTests((current) =>
      current.filter(
        (_, testIndex) =>
          testIndex !== index
      )
    );
  };

  const saveEdit = async () => {
    if (!editingRequest) return;

    if (!editDate) {
      setErrorMessage(
        "Please select a request date."
      );
      return;
    }

    if (editTests.length === 0) {
      setErrorMessage(
        "Please add at least one laboratory test."
      );
      return;
    }

    setActionLoading(true);
    setErrorMessage("");

    try {
      const testsToSave = editTests.map(
        (test) => ({
          value: test.value,
          label:
            test.label ||
            TEST_NAME_BY_VALUE[test.value] ||
            test.value,
        })
      );

      const { error } = await supabase
        .from("laboratory_requests")
        .update({
          request_date: editDate,
          tests: testsToSave,
          notes: editNotes.trim() || null,
        })
        .eq("id", editingRequest.id);

      if (error) {
        throw new Error(
          `Unable to save request: ${error.message}`
        );
      }

      closeEdit();
      await loadDashboard();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error?.message ||
          "Unable to save the request."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const processAllMonthlyPayments =
    async () => {
      if (monthlyPaymentRows.length === 0) {
        setPaymentMessage(
          "There are no completed and unpaid requests for this month."
        );
        return;
      }

      const confirmed = window.confirm(
        `Process ${monthlyTotalRequests} completed request(s) for ${formatMonth(
          selectedMonth
        )}?\n\nTotal payment: ${monthlyTotalAmount.toLocaleString()} ETB\n\nOnly completed and unpaid requests will be included.`
      );

      if (!confirmed) return;

      setActionLoading(true);
      setPaymentMessage("");
      setErrorMessage("");

      try {
        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw new Error(
            `Unable to identify admin: ${authError.message}`
          );
        }

        const adminId =
          authData?.user?.id || null;

        if (!adminId) {
          throw new Error(
            "Your session has expired. Please log in again."
          );
        }

        /*
         * Create/update one payment record per nurse.
         * The unique constraint on (nurse_id, payment_month)
         * prevents duplicate monthly records.
         */
        const paymentIdByNurse = new Map();

        for (const row of monthlyPaymentRows) {
          const { data, error } = await supabase
            .from("nurse_payments")
            .upsert(
              {
                nurse_id: row.nurseId,
                payment_month: selectedMonth,
                request_count:
                  row.requestCount,
                total_amount:
                  row.totalAmount,
                payment_status: "Paid",
                paid_at: new Date().toISOString(),
                paid_by: adminId,
              },
              {
                onConflict:
                  "nurse_id,payment_month",
              }
            )
            .select("id")
            .single();

          if (error) {
            throw new Error(
              `Payment for ${
                row.nurseName
              }: ${error.message}`
            );
          }

          paymentIdByNurse.set(
            row.nurseId,
            data.id
          );
        }

        /*
         * Link every completed request to its
         * nurse's monthly payment.
         */
        for (const row of monthlyPaymentRows) {
          const paymentId =
            paymentIdByNurse.get(
              row.nurseId
            );

          if (!paymentId) {
            throw new Error(
              `No payment record was created for ${row.nurseName}.`
            );
          }

          const requestIds =
            row.requests.map(
              (request) => request.id
            );

          const { error } = await supabase
            .from("laboratory_requests")
            .update({
              payment_id: paymentId,
            })
            .in("id", requestIds);

          if (error) {
            throw new Error(
              `Unable to mark ${
                row.nurseName
              } requests as paid: ${error.message}`
            );
          }
        }

        setPaymentMessage(
          `${monthlyTotalRequests} completed request(s) were paid for ${formatMonth(
            selectedMonth
          )}. Total: ${monthlyTotalAmount.toLocaleString()} ETB.`
        );

        await loadDashboard();
      } catch (error) {
        console.error(
          "Monthly payment error:",
          error
        );

        setErrorMessage(
          error?.message ||
            "Unable to process monthly payments."
        );
      } finally {
        setActionLoading(false);
      }
    };

  const printMonthlyPayments = () => {
    if (monthlyPaymentRows.length === 0) {
      window.alert(
        "There are no unpaid completed requests to print for this month."
      );
      return;
    }

    const rowsHtml =
      monthlyPaymentRows
        .map(
          (row, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(
                row.nurseName
              )}</td>
              <td>${escapeHtml(
                row.username
              )}</td>
              <td>${row.requestCount}</td>
              <td>${PAYMENT_RATE.toLocaleString()} ETB</td>
              <td>${row.totalAmount.toLocaleString()} ETB</td>
            </tr>
          `
        )
        .join("");

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1000,height=800"
      );

    if (!printWindow) {
      window.alert(
        "Please allow pop-ups to print the monthly report."
      );
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Samplogy Nurse Payment Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #172554;
            }
            h1 {
              margin-bottom: 6px;
            }
            p {
              color: #64748b;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 30px;
            }
            th, td {
              border: 1px solid #dbe2ea;
              padding: 12px;
              text-align: left;
            }
            th {
              background: #f1f5f9;
            }
            .total {
              margin-top: 24px;
              font-size: 18px;
              font-weight: bold;
            }
            .footer {
              margin-top: 50px;
              color: #64748b;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <h1>Samplogy</h1>
          <p>Monthly Nurse Payment Report</p>
          <h2>${escapeHtml(
            formatMonth(selectedMonth)
          )}</h2>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nurse</th>
                <th>Username</th>
                <th>Completed Requests</th>
                <th>Rate</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="total">
            Total Requests:
            ${monthlyTotalRequests}
            &nbsp;&nbsp;|&nbsp;&nbsp;
            Total Amount:
            ${monthlyTotalAmount.toLocaleString()} ETB
          </div>

          <div class="footer">
            Generated by Samplogy Laboratory Management System
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("currentUser");
    navigate("/");
  };

  const viewRequest = (request) => {
    if (request.status === "Completed") {
      navigate("/laboratory-results", {
        state: { request },
      });
    } else {
      navigate(
        "/laboratory-process-request",
        {
          state: { request },
        }
      );
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingSpinner}>
          ⏳
        </div>
        <h3>Loading Admin Dashboard...</h3>
        <p>
          Please wait while we load the
          laboratory data.
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .admin-dashboard-root { width: 100%; min-height: 100vh; }
        .admin-dashboard-main { min-width: 0; }

        @media (min-width: 1440px) {
          .admin-dashboard-root aside { width: 270px !important; }
          .admin-dashboard-main {
            margin-left: 270px !important;
            width: calc(100% - 270px) !important;
            padding: 36px 42px 48px !important;
          }
        }

        @media (max-width: 1100px) and (min-width: 761px) {
          .admin-dashboard-root aside {
            width: 220px !important;
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
          .admin-dashboard-main {
            margin-left: 220px !important;
            width: calc(100% - 220px) !important;
            padding: 24px 20px 36px !important;
          }
        }

        @media (max-width: 760px) {
          .admin-dashboard-root { display: block !important; }
          .admin-dashboard-root aside {
            position: relative !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            border-right: 0 !important;
            border-bottom: 1px solid #e5e7eb !important;
            padding: 14px 12px !important;
          }
          .admin-dashboard-root aside nav {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 6px !important;
          }
          .admin-dashboard-main {
            margin-left: 0 !important;
            width: 100% !important;
            padding: 18px 12px 28px !important;
          }
          .admin-dashboard-main header {
            align-items: flex-start !important;
            flex-direction: column !important;
            gap: 14px !important;
          }
          .admin-dashboard-main table {
            min-width: 850px;
          }
        }

        @media (max-width: 430px) {
          .admin-dashboard-root aside nav {
            grid-template-columns: 1fr !important;
          }
          .admin-dashboard-main {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }
        }
      `}</style>

      <div className="admin-dashboard-root" style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.logoArea}>
          <img
  src={`${import.meta.env.BASE_URL}samplogy-logo.png`}
  alt="Samplogy"
/>
          <div>
            <h2 style={styles.logoTitle}>
              Samplogy
            </h2>
            <p style={styles.logoSubtitle}>
              Laboratory Management
            </p>
          </div>
        </div>

        <nav style={styles.navigation}>
          <NavButton
            active
            icon="📊"
            label="Dashboard"
          />

          <NavButton
            icon="👤"
            label="Patients"
            onClick={() =>
              navigate("/register-patient")
            }
          />

          <NavButton
            icon="🧪"
            label="Laboratory Requests"
            onClick={() =>
              navigate("/laboratory")
            }
          />

          <NavButton
            icon="🔬"
            label="Laboratory Work"
            onClick={() =>
              navigate("/admin/laboratory-work")
            }
          />

          <NavButton
            icon="👩‍⚕️"
            label="Nurses"
            onClick={() =>
              navigate("/nurse")
            }
          />

          <NavButton
            icon="👥"
            label="Users"
            onClick={() =>
              navigate("/admin/users")
            }
          />

          <NavButton
            icon="💰"
            label="Nurse Payments"
            onClick={() =>
              document
                .getElementById(
                  "nurse-payments"
                )
                ?.scrollIntoView({
                  behavior: "smooth",
                })
            }
          />

          <NavButton
            icon="🏥"
            label="Facilities"
          />

          <NavButton
            icon="📄"
            label="Reports"
          />
        </nav>

        <div style={styles.sidebarBottom}>
          <NavButton
            icon="⚙️"
            label="Settings"
          />

          <button
            type="button"
            style={styles.logoutButton}
            onClick={handleLogout}
          >
            <span style={styles.navIcon}>
              ↪
            </span>
            Logout
          </button>
        </div>
      </aside>

      <main className="admin-dashboard-main" style={styles.main}>
        <header style={styles.header}>
          <div>
            <p style={styles.breadcrumb}>
              Dashboard / Administration
            </p>

            <h1 style={styles.title}>
              Admin Dashboard
            </h1>

            <p style={styles.subtitle}>
              Manage laboratory requests and
              monthly nurse payments.
            </p>
          </div>

          <div style={styles.headerRight}>
            <button
              type="button"
              style={styles.refreshButton}
              onClick={loadDashboard}
              disabled={loading || actionLoading}
            >
              ↻ Refresh
            </button>

            <div style={styles.adminProfile}>
              <div style={styles.avatar}>
                A
              </div>
              <div>
                <strong style={styles.adminName}>
                  Administrator
                </strong>
                <p style={styles.profileRole}>
                  System Admin
                </p>
              </div>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div style={styles.errorBox}>
            <div style={styles.errorIcon}>
              !
            </div>

            <div style={{ flex: 1 }}>
              <strong>
                Unable to complete operation
              </strong>
              <p>{errorMessage}</p>
            </div>

            <button
              type="button"
              style={styles.retryButton}
              onClick={() => {
                setErrorMessage("");
                loadDashboard();
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {paymentMessage && (
          <div style={styles.successBox}>
            <strong>Payment completed</strong>
            <p>{paymentMessage}</p>
            <button
              type="button"
              style={styles.closeMessage}
              onClick={() =>
                setPaymentMessage("")
              }
            >
              ×
            </button>
          </div>
        )}

        <section style={styles.statsGrid}>
          <StatCard
            label="Total Patients"
            value={totalPatients}
            info="Patients connected to requests"
            icon="👤"
            iconBackground="#eff6ff"
          />

          <StatCard
            label="Total Requests"
            value={totalRequests}
            info="All laboratory requests"
            icon="🧪"
            iconBackground="#f5f3ff"
          />

          <StatCard
            label="Pending"
            value={pendingRequests}
            info="Awaiting processing"
            icon="⏳"
            iconBackground="#fff7ed"
            valueColor="#d97706"
          />

          <StatCard
            label="Processing"
            value={processingRequests}
            info="Currently processing"
            icon="🔬"
            iconBackground="#eef2ff"
            valueColor="#4f46e5"
          />

          <StatCard
            label="Completed"
            value={completedRequests}
            info="Results available"
            icon="✓"
            iconBackground="#ecfdf5"
            valueColor="#059669"
          />

          <StatCard
            label="Cancelled"
            value={cancelledRequests}
            info="Cancelled requests"
            icon="×"
            iconBackground="#fff1f2"
            valueColor="#dc2626"
          />
        </section>

        <section
          id="nurse-payments"
          style={styles.paymentCard}
        >
          <div style={styles.paymentHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Monthly Nurse Payments
              </h2>
              <p style={styles.sectionSubtitle}>
                Pay all nurses together using
                completed and unpaid requests only.
              </p>
            </div>

            <div style={styles.paymentRule}>
              <strong>
                {PAYMENT_RATE} ETB
              </strong>
              <span>per completed request</span>
            </div>
          </div>

          <div style={styles.monthToolbar}>
            <div>
              <label
                htmlFor="payment-month"
                style={styles.fieldLabel}
              >
                Payment Month
              </label>

              <input
                id="payment-month"
                type="month"
                value={selectedMonth.slice(
                  0,
                  7
                )}
                onChange={(event) => {
                  const value =
                    event.target.value;

                  setSelectedMonth(
                    `${value}-01`
                  );
                  setPaymentMessage("");
                }}
                style={styles.monthInput}
              />
            </div>

            <div style={styles.monthSummary}>
              <div>
                <span>
                  Payable Requests
                </span>
                <strong>
                  {monthlyTotalRequests}
                </strong>
              </div>

              <div>
                <span>
                  Total Amount
                </span>
                <strong style={{ color: "#059669" }}>
                  {monthlyTotalAmount.toLocaleString()} ETB
                </strong>
              </div>
            </div>
          </div>

          {monthlyAlreadyPaid.length > 0 && (
            <div style={styles.infoBox}>
              ℹ️{" "}
              {monthlyAlreadyPaid.length} nurse
              payment record(s) are already marked
              Paid for this month. The table below
              shows only new completed and unpaid
              requests.
            </div>
          )}

          {monthlyPaymentRows.length === 0 ? (
            <div style={styles.paymentEmpty}>
              <div style={styles.emptyIcon}>
                💰
              </div>
              <strong>
                No payable requests
              </strong>
              <p>
                There are no completed and unpaid
                laboratory requests for{" "}
                {formatMonth(selectedMonth)}.
              </p>
            </div>
          ) : (
            <>
              <div style={styles.paymentTableWrapper}>
                <table style={styles.paymentTable}>
                  <thead>
                    <tr>
                      <th>Nurse</th>
                      <th>Completed Requests</th>
                      <th>Rate</th>
                      <th>Total Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {monthlyPaymentRows.map(
                      (row) => (
                        <tr key={row.nurseId}>
                          <td>
                            <div style={styles.nurseCell}>
                              <div
                                style={
                                  styles.nurseAvatar
                                }
                              >
                                {row.nurseName
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <strong>
                                  {row.nurseName}
                                </strong>
                                <span>
                                  @{row.username}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <strong>
                              {row.requestCount}
                            </strong>
                          </td>

                          <td>
                            {PAYMENT_RATE} ETB
                          </td>

                          <td>
                            <strong
                              style={{
                                color: "#059669",
                              }}
                            >
                              {row.totalAmount.toLocaleString()}{" "}
                              ETB
                            </strong>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div style={styles.paymentActions}>
                <button
                  type="button"
                  style={styles.printButton}
                  onClick={
                    printMonthlyPayments
                  }
                  disabled={actionLoading}
                >
                  🖨️ Print Monthly List
                </button>

                <button
                  type="button"
                  style={
                    styles.processPaymentButton
                  }
                  onClick={
                    processAllMonthlyPayments
                  }
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? "Processing..."
                    : "💰 Process All Nurse Payments"}
                </button>
              </div>
            </>
          )}
        </section>

        <section style={styles.requestCard}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Laboratory Requests by Nurse
              </h2>
              <p style={styles.sectionSubtitle}>
                Every request is grouped under
                the nurse who submitted it.
              </p>
            </div>

            <div style={styles.countBadge}>
              {groupedRequests.length}{" "}
              nurse
              {groupedRequests.length !== 1
                ? "s"
                : ""}
            </div>
          </div>

          <div style={styles.toolbar}>
            <div style={styles.searchBox}>
              <span>🔍</span>

              <input
                type="text"
                placeholder="Search nurse, patient or request..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                style={styles.searchInput}
              />

              {searchTerm && (
                <button
                  type="button"
                  style={styles.clearButton}
                  onClick={() =>
                    setSearchTerm("")
                  }
                >
                  ×
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              style={styles.filterSelect}
            >
              <option value="All">
                All Status
              </option>
              <option value="Pending">
                Pending
              </option>
              <option value="Processing">
                Processing
              </option>
              <option value="Completed">
                Completed
              </option>
              <option value="Cancelled">
                Cancelled
              </option>
            </select>
          </div>

          {groupedRequests.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                📋
              </div>
              <h3>
                No requests found
              </h3>
              <p>
                {requests.length === 0
                  ? "Laboratory requests submitted by nurses will appear here."
                  : "No requests match your current search or filter."}
              </p>
            </div>
          ) : (
            <div>
              {groupedRequests.map((group) => {
                const nurseName =
                  group.nurse?.full_name ||
                  "Unknown Nurse";

                const nurseUsername =
                  group.nurse?.username ||
                  "-";

                const isExpanded =
                  expandedNurses[
                    group.nurseId
                  ] ?? true;

                const pending =
                  group.requests.filter(
                    (request) =>
                      request.status ===
                      "Pending"
                  ).length;

                const processing =
                  group.requests.filter(
                    (request) =>
                      request.status ===
                      "Processing"
                  ).length;

                const completed =
                  group.requests.filter(
                    (request) =>
                      request.status ===
                      "Completed"
                  ).length;

                return (
                  <div
                    key={group.nurseId}
                    style={styles.nurseGroup}
                  >
                    <button
                      type="button"
                      style={
                        styles.nurseGroupHeader
                      }
                      onClick={() =>
                        toggleNurse(
                          group.nurseId
                        )
                      }
                    >
                      <div
                        style={
                          styles.nurseIdentity
                        }
                      >
                        <div
                          style={
                            styles.largeNurseAvatar
                          }
                        >
                          {nurseName
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong
                            style={
                              styles.nurseName
                            }
                          >
                            {nurseName}
                          </strong>

                          <span
                            style={
                              styles.nurseUsername
                            }
                          >
                            @{nurseUsername}
                          </span>
                        </div>
                      </div>

                      <div
                        style={
                          styles.nurseStats
                        }
                      >
                        <span
                          style={{
                            ...styles.miniStat,
                            color: "#c2410c",
                          }}
                        >
                          {pending} Pending
                        </span>

                        <span
                          style={{
                            ...styles.miniStat,
                            color: "#4f46e5",
                          }}
                        >
                          {processing} Processing
                        </span>

                        <span
                          style={{
                            ...styles.miniStat,
                            color: "#047857",
                          }}
                        >
                          {completed} Completed
                        </span>

                        <span
                          style={
                            styles.requestCount
                          }
                        >
                          {group.requests.length}{" "}
                          Requests
                        </span>

                        <span
                          style={
                            styles.chevron
                          }
                        >
                          {isExpanded
                            ? "⌃"
                            : "⌄"}
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div
                        style={
                          styles.requestList
                        }
                      >
                        {group.requests.map(
                          (request) => {
                            const statusStyle =
                              getStatusStyle(
                                request.status
                              );

                            const isPaid =
                              Boolean(
                                request.payment_id
                              );

                            return (
                              <div
                                key={request.id}
                                style={
                                  styles.requestRow
                                }
                              >
                                <div
                                  style={
                                    styles.requestId
                                  }
                                >
                                  LAB-
                                  {request.id}
                                </div>

                                <div
                                  style={
                                    styles.patientInfo
                                  }
                                >
                                  <div
                                    style={
                                      styles.patientAvatar
                                    }
                                  >
                                    {request.patient?.full_name
                                      ?.charAt(
                                        0
                                      )
                                      ?.toUpperCase() ||
                                      "P"}
                                  </div>

                                  <div>
                                    <strong>
                                      {request.patient
                                        ?.full_name ||
                                        "Unknown Patient"}
                                    </strong>

                                    <span>
                                      {request.patient
                                        ?.patient_id ||
                                        "-"}
                                    </span>
                                  </div>
                                </div>

                                <div
                                  style={
                                    styles.testsList
                                  }
                                >
                                  {normalizeTests(
                                    request.tests
                                  )
                                    .slice(0, 4)
                                    .map(
                                      (
                                        test,
                                        index
                                      ) => (
                                        <span
                                          key={`${request.id}-${test.value}-${index}`}
                                          style={
                                            styles.testBadge
                                          }
                                        >
                                          {
                                            test.label
                                          }
                                        </span>
                                      )
                                    )}

                                  {normalizeTests(
                                    request.tests
                                  ).length > 4 && (
                                    <span
                                      style={
                                        styles.moreBadge
                                      }
                                    >
                                      +
                                      {normalizeTests(
                                        request.tests
                                      ).length -
                                        4}{" "}
                                      more
                                    </span>
                                  )}
                                </div>

                                <div
                                  style={
                                    styles.dateCell
                                  }
                                >
                                  {formatDate(
                                    request.request_date
                                  )}
                                </div>

                                <div>
                                  <span
                                    style={{
                                      ...styles.statusBadge,
                                      background:
                                        statusStyle.background,
                                      color:
                                        statusStyle.color,
                                    }}
                                  >
                                    ●{" "}
                                    {
                                      request.status
                                    }
                                  </span>

                                  {isPaid && (
                                    <span
                                      style={
                                        styles.paidBadge
                                      }
                                    >
                                      ✓ Paid
                                    </span>
                                  )}
                                </div>

                                <div
                                  style={
                                    styles.actionCell
                                  }
                                >
                                  <button
                                    type="button"
                                    style={
                                      styles.editButton
                                    }
                                    onClick={() =>
                                      openEdit(
                                        request
                                      )
                                    }
                                  >
                                    ✏️ Edit
                                  </button>

                                  <button
                                    type="button"
                                    style={
                                      styles.viewButton
                                    }
                                    onClick={() =>
                                      viewRequest(
                                        request
                                      )
                                    }
                                  >
                                    {request.status ===
                                    "Completed"
                                      ? "View Results"
                                      : "View"}
                                  </button>

                                  {request.status ===
                                    "Completed" &&
                                    !isPaid && (
                                      <span
                                        style={
                                          styles.unpaidBadge
                                        }
                                      >
                                        Unpaid
                                      </span>
                                    )}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section style={styles.historyCard}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Recent Payment History
              </h2>
              <p style={styles.sectionSubtitle}>
                Monthly payment records already
                saved by the system.
              </p>
            </div>
          </div>

          {payments.length === 0 ? (
            <div style={styles.historyEmpty}>
              No payment records yet.
            </div>
          ) : (
            <div style={styles.paymentTableWrapper}>
              <table style={styles.paymentTable}>
                <thead>
                  <tr>
                    <th>Nurse</th>
                    <th>Month</th>
                    <th>Requests</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Paid At</th>
                  </tr>
                </thead>

                <tbody>
                  {payments
                    .slice(0, 20)
                    .map((payment) => {
                      const nurse =
                        nurseMap.get(
                          payment.nurse_id
                        );

                      return (
                        <tr
                          key={payment.id}
                        >
                          <td>
                            <strong>
                              {nurse?.full_name ||
                                "Unknown Nurse"}
                            </strong>
                          </td>

                          <td>
                            {formatMonth(
                              payment.payment_month
                            )}
                          </td>

                          <td>
                            {payment.request_count}
                          </td>

                          <td>
                            {Number(
                              payment.total_amount ||
                                0
                            ).toLocaleString()}{" "}
                            ETB
                          </td>

                          <td>
                            <span
                              style={
                                styles.paidBadge
                              }
                            >
                              ✓{" "}
                              {
                                payment.payment_status
                              }
                            </span>
                          </td>

                          <td>
                            {payment.paid_at
                              ? new Date(
                                  payment.paid_at
                                ).toLocaleDateString()
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer style={styles.footer}>
          <span>© 2026 Samplogy</span>
          <span>
            Laboratory Management System
          </span>
        </footer>
      </main>

      {editingRequest && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <p style={styles.modalEyebrow}>
                  Correct request before laboratory
                  processing
                </p>

                <h2 style={styles.modalTitle}>
                  Edit LAB-
                  {editingRequest.id}
                </h2>
              </div>

              <button
                type="button"
                style={styles.modalClose}
                onClick={closeEdit}
                disabled={actionLoading}
              >
                ×
              </button>
            </div>

            <div style={styles.requestMeta}>
              <MetaItem
                label="Patient"
                value={
                  editingRequest.patient
                    ?.full_name ||
                  "Unknown Patient"
                }
              />

              <MetaItem
                label="Patient ID"
                value={
                  editingRequest.patient
                    ?.patient_id || "-"
                }
              />

              <MetaItem
                label="Nurse"
                value={
                  editingRequest.nurse
                    ?.full_name ||
                  "Unknown Nurse"
                }
              />

              <MetaItem
                label="Status"
                value={
                  editingRequest.status
                }
              />
            </div>

            <div style={styles.formField}>
              <label style={styles.fieldLabel}>
                Request Date
              </label>

              <input
                type="date"
                value={editDate}
                onChange={(event) =>
                  setEditDate(
                    event.target.value
                  )
                }
                style={styles.formInput}
              />
            </div>

            <div style={styles.formField}>
              <div
                style={styles.testHeader}
              >
                <label
                  style={styles.fieldLabel}
                >
                  Laboratory Tests
                </label>

                <button
                  type="button"
                  style={
                    styles.addTestButton
                  }
                  onClick={addTest}
                >
                  + Add Test
                </button>
              </div>

              {editTests.map(
                (test, index) => (
                  <div
                    key={`${test.value}-${index}`}
                    style={
                      styles.editTestRow
                    }
                  >
                    <select
                      value={test.value}
                      onChange={(event) =>
                        updateTest(
                          index,
                          event.target.value
                        )
                      }
                      style={
                        styles.formInput
                      }
                    >
                      {TEST_OPTIONS.map(
                        (option) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>

                    <button
                      type="button"
                      style={
                        styles.removeTestButton
                      }
                      onClick={() =>
                        removeTest(index)
                      }
                    >
                      Remove
                    </button>
                  </div>
                )
              )}

              {editTests.length === 0 && (
                <p style={styles.warningText}>
                  Add at least one laboratory
                  test.
                </p>
              )}
            </div>

            <div style={styles.formField}>
              <label style={styles.fieldLabel}>
                Nurse Notes
              </label>

              <textarea
                value={editNotes}
                onChange={(event) =>
                  setEditNotes(
                    event.target.value
                  )
                }
                placeholder="Add or correct notes..."
                rows={4}
                style={styles.textarea}
              />
            </div>

            {errorMessage && (
              <div style={styles.modalError}>
                {errorMessage}
              </div>
            )}

            <div style={styles.modalActions}>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={closeEdit}
                disabled={actionLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                style={styles.saveButton}
                onClick={saveEdit}
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function NavButton({
  active = false,
  icon,
  label,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.navButton,
        ...(active
          ? styles.activeNavButton
          : {}),
      }}
    >
      <span style={styles.navIcon}>
        {icon}
      </span>
      {label}
    </button>
  );
}

function StatCard({
  label,
  value,
  info,
  icon,
  iconBackground,
  valueColor,
}) {
  return (
    <div style={styles.statCard}>
      <div>
        <p style={styles.statLabel}>
          {label}
        </p>

        <h2
          style={{
            ...styles.statValue,
            ...(valueColor
              ? { color: valueColor }
              : {}),
          }}
        >
          {value}
        </h2>

        <span style={styles.statInfo}>
          {info}
        </span>
      </div>

      <div
        style={{
          ...styles.statIcon,
          backgroundColor: iconBackground,
        }}
      >
        {icon}
      </div>
    </div>
  );
}

function MetaItem({ label, value }) {
  return (
    <div style={styles.metaItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    backgroundColor: "#f5f7fb",
    color: "#1f2937",
    fontFamily:
      "Inter, Arial, Helvetica, sans-serif",
  },

  sidebar: {
    width: "250px",
    backgroundColor: "#fff",
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    padding: "24px 16px",
    position: "fixed",
    inset: "0 auto 0 0",
    boxSizing: "border-box",
    zIndex: 20,
  },

  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "0 10px 30px",
  },

  logoImage: {
    width: "46px",
    height: "46px",
    objectFit: "contain",
    flexShrink: 0,
  },

  logoTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "20px",
  },

  logoSubtitle: {
    margin: "3px 0 0",
    color: "#94a3b8",
    fontSize: "10px",
  },

  navigation: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  navButton: {
    width: "100%",
    border: "none",
    background: "transparent",
    padding: "12px 14px",
    borderRadius: "9px",
    textAlign: "left",
    fontSize: "14px",
    color: "#64748b",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "11px",
  },

  activeNavButton: {
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    fontWeight: "600",
  },

  navIcon: {
    width: "22px",
    textAlign: "center",
  },

  sidebarBottom: {
    marginTop: "auto",
  },

  logoutButton: {
    width: "100%",
    border: "none",
    background: "#fff1f2",
    color: "#e11d48",
    padding: "12px 14px",
    borderRadius: "9px",
    textAlign: "left",
    fontSize: "14px",
    cursor: "pointer",
    marginTop: "8px",
    display: "flex",
    alignItems: "center",
    gap: "11px",
  },

  main: {
    marginLeft: "250px",
    width: "calc(100% - 250px)",
    padding: "32px",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "28px",
  },

  breadcrumb: {
    margin: "0 0 7px",
    color: "#94a3b8",
    fontSize: "11px",
  },

  title: {
    margin: 0,
    color: "#172554",
    fontSize: "30px",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },

  refreshButton: {
    border: "1px solid #dbeafe",
    background: "#fff",
    color: "#2563eb",
    padding: "10px 15px",
    borderRadius: "9px",
    fontWeight: "600",
    cursor: "pointer",
  },

  adminProfile: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  avatar: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    background: "#dbeafe",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "18px",
  },

  adminName: {
    color: "#334155",
    fontSize: "13px",
  },

  profileRole: {
    margin: "3px 0 0",
    color: "#94a3b8",
    fontSize: "11px",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: "18px",
    marginBottom: "22px",
  },

  statCard: {
    minHeight: "145px",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "22px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxSizing: "border-box",
  },

  statLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  statValue: {
    margin: "8px 0",
    color: "#172554",
    fontSize: "30px",
  },

  statInfo: {
    color: "#94a3b8",
    fontSize: "11px",
  },

  statIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
  },

  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    color: "#be123c",
    padding: "14px 18px",
    borderRadius: "12px",
    marginBottom: "20px",
  },

  errorIcon: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "#ffe4e6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
  },

  errorBoxP: {
    margin: "4px 0 0",
  },

  retryButton: {
    border: "none",
    background: "#e11d48",
    color: "#fff",
    padding: "9px 13px",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "600",
  },

  successBox: {
    position: "relative",
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    color: "#047857",
    padding: "15px 45px 15px 18px",
    borderRadius: "12px",
    marginBottom: "20px",
  },

  successBoxP: {
    margin: "4px 0 0",
  },

  closeMessage: {
    position: "absolute",
    right: "12px",
    top: "12px",
    border: "none",
    background: "transparent",
    color: "#047857",
    fontSize: "20px",
    cursor: "pointer",
  },

  paymentCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    marginBottom: "22px",
    overflow: "hidden",
  },

  paymentHeader: {
    padding: "23px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    margin: 0,
    color: "#172554",
    fontSize: "19px",
  },

  sectionSubtitle: {
    margin: "6px 0 0",
    color: "#94a3b8",
    fontSize: "12px",
  },

  paymentRule: {
    background: "#ecfdf5",
    borderRadius: "10px",
    padding: "10px 15px",
    textAlign: "right",
    color: "#047857",
  },

  paymentRuleStrong: {
    display: "block",
    fontSize: "17px",
  },

  paymentRuleSpan: {
    fontSize: "10px",
  },

  monthToolbar: {
    padding: "0 24px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    gap: "20px",
  },

  fieldLabel: {
    display: "block",
    marginBottom: "7px",
    color: "#334155",
    fontWeight: "600",
    fontSize: "12px",
  },

  monthInput: {
    height: "42px",
    border: "1px solid #dbe2ea",
    borderRadius: "8px",
    padding: "0 12px",
    color: "#334155",
    background: "#fff",
    outline: "none",
  },

  monthSummary: {
    display: "flex",
    gap: "12px",
  },

  monthSummaryItem: {
    background: "#f8fafc",
    borderRadius: "10px",
    padding: "11px 16px",
    minWidth: "150px",
  },

  infoBox: {
    margin: "0 24px 16px",
    padding: "11px 14px",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: "8px",
    fontSize: "11px",
  },

  paymentTableWrapper: {
    overflowX: "auto",
  },

  paymentTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
  },

  paymentTableHeader: {
    textAlign: "left",
    padding: "12px 20px",
    background: "#f8fafc",
    color: "#64748b",
    borderTop: "1px solid #eef2f7",
    borderBottom: "1px solid #e2e8f0",
    fontSize: "10px",
    textTransform: "uppercase",
  },

  paymentTableCell: {
    padding: "14px 20px",
    borderBottom: "1px solid #f1f5f9",
  },

  nurseCell: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  nurseAvatar: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
  },

  nurseCellSubtext: {
    display: "block",
    marginTop: "3px",
    color: "#94a3b8",
    fontSize: "10px",
  },

  paymentActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    padding: "18px 24px",
    borderTop: "1px solid #f1f5f9",
  },

  printButton: {
    border: "1px solid #dbeafe",
    background: "#eff6ff",
    color: "#2563eb",
    padding: "10px 15px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  processPaymentButton: {
    border: "none",
    background: "#059669",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
  },

  paymentEmpty: {
    textAlign: "center",
    padding: "45px 20px",
    borderTop: "1px solid #f1f5f9",
    color: "#64748b",
  },

  emptyIcon: {
    fontSize: "38px",
    marginBottom: "10px",
  },

  requestCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    overflow: "hidden",
    marginBottom: "22px",
  },

  sectionHeader: {
    padding: "23px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  countBadge: {
    background: "#eff6ff",
    color: "#2563eb",
    padding: "8px 13px",
    borderRadius: "20px",
    fontWeight: "600",
    fontSize: "11px",
  },

  toolbar: {
    display: "flex",
    gap: "12px",
    padding: "0 24px 20px",
  },

  searchBox: {
    flex: 1,
    height: "44px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    border: "1px solid #dbe2ea",
    borderRadius: "9px",
    padding: "0 12px",
    background: "#f8fafc",
  },

  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: "12px",
  },

  clearButton: {
    border: "none",
    background: "transparent",
    fontSize: "19px",
    color: "#94a3b8",
    cursor: "pointer",
  },

  filterSelect: {
    height: "44px",
    border: "1px solid #dbe2ea",
    borderRadius: "9px",
    padding: "0 12px",
    background: "#fff",
    color: "#475569",
  },

  nurseGroup: {
    borderTop: "1px solid #eef2f7",
  },

  nurseGroupHeader: {
    width: "100%",
    border: "none",
    background: "#fff",
    padding: "16px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    textAlign: "left",
  },

  nurseIdentity: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  largeNurseAvatar: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
  },

  nurseName: {
    display: "block",
    color: "#172554",
    fontSize: "14px",
  },

  nurseUsername: {
    display: "block",
    marginTop: "3px",
    color: "#94a3b8",
    fontSize: "10px",
  },

  nurseStats: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  miniStat: {
    background: "#f8fafc",
    padding: "7px 9px",
    borderRadius: "7px",
    fontSize: "10px",
    fontWeight: "600",
  },

  requestCount: {
    background: "#eff6ff",
    color: "#2563eb",
    padding: "8px 11px",
    borderRadius: "20px",
    fontSize: "10px",
    fontWeight: "700",
  },

  chevron: {
    color: "#64748b",
    fontSize: "18px",
  },

  requestList: {
    background: "#fbfdff",
  },

  requestRow: {
    display: "grid",
    gridTemplateColumns:
      "90px 190px minmax(180px, 1fr) 105px 125px 230px",
    gap: "12px",
    alignItems: "center",
    padding: "15px 24px",
    borderTop: "1px solid #f1f5f9",
  },

  requestId: {
    color: "#2563eb",
    fontWeight: "700",
    fontSize: "12px",
  },

  patientInfo: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
  },

  patientAvatar: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    flexShrink: 0,
  },

  patientInfoName: {
    display: "block",
    color: "#334155",
    fontSize: "11px",
  },

  patientInfoId: {
    display: "block",
    marginTop: "3px",
    color: "#94a3b8",
    fontSize: "9px",
  },

  testsList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px",
  },

  testBadge: {
    background: "#f1f5f9",
    color: "#475569",
    padding: "6px 8px",
    borderRadius: "6px",
    fontSize: "9px",
  },

  moreBadge: {
    background: "#e2e8f0",
    color: "#475569",
    padding: "6px 8px",
    borderRadius: "6px",
    fontSize: "9px",
  },

  dateCell: {
    color: "#64748b",
    fontSize: "10px",
  },

  statusBadge: {
    display: "inline-block",
    padding: "6px 9px",
    borderRadius: "20px",
    fontSize: "9px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },

  paidBadge: {
    display: "inline-block",
    marginLeft: "5px",
    background: "#ecfdf5",
    color: "#047857",
    padding: "6px 9px",
    borderRadius: "20px",
    fontSize: "9px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },

  unpaidBadge: {
    display: "inline-block",
    marginTop: "5px",
    background: "#f8fafc",
    color: "#64748b",
    padding: "5px 8px",
    borderRadius: "15px",
    fontSize: "9px",
  },

  actionCell: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    alignItems: "center",
  },

  editButton: {
    border: "1px solid #fcd34d",
    background: "#fffbeb",
    color: "#a16207",
    padding: "7px 9px",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "10px",
    fontWeight: "700",
  },

  viewButton: {
    border: "1px solid #dbeafe",
    background: "#eff6ff",
    color: "#2563eb",
    padding: "7px 9px",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "10px",
    fontWeight: "700",
  },

  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    borderTop: "1px solid #f1f5f9",
    color: "#94a3b8",
  },

  historyCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    overflow: "hidden",
    marginBottom: "22px",
  },

  historyEmpty: {
    textAlign: "center",
    padding: "45px",
    color: "#94a3b8",
    borderTop: "1px solid #f1f5f9",
    fontSize: "12px",
  },

  footer: {
    display: "flex",
    justifyContent: "space-between",
    color: "#94a3b8",
    fontSize: "10px",
    padding: "18px 4px",
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f7fb",
    color: "#172554",
  },

  loadingSpinner: {
    fontSize: "35px",
    marginBottom: "10px",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 100,
  },

  modal: {
    width: "min(760px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#fff",
    borderRadius: "16px",
    boxShadow:
      "0 25px 70px rgba(15,23,42,.25)",
    padding: "24px",
    boxSizing: "border-box",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    alignItems: "flex-start",
  },

  modalEyebrow: {
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
  },

  modalTitle: {
    margin: "5px 0 0",
    color: "#172554",
    fontSize: "24px",
  },

  modalClose: {
    width: "42px",
    height: "42px",
    border: "none",
    background: "#f1f5f9",
    color: "#64748b",
    borderRadius: "10px",
    fontSize: "25px",
    cursor: "pointer",
  },

  requestMeta: {
    margin: "22px 0",
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "15px",
    display: "grid",
    gridTemplateColumns:
      "repeat(2, 1fr)",
    gap: "14px",
  },

  metaItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  formField: {
    marginBottom: "20px",
  },

  formInput: {
    width: "100%",
    height: "44px",
    boxSizing: "border-box",
    border: "1px solid #dbe2ea",
    borderRadius: "9px",
    padding: "0 12px",
    outline: "none",
    color: "#334155",
    background: "#fff",
  },

  testHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "9px",
  },

  addTestButton: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#2563eb",
    padding: "8px 11px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  editTestRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "8px",
  },

  removeTestButton: {
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#dc2626",
    padding: "0 13px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #dbe2ea",
    borderRadius: "9px",
    padding: "11px 12px",
    resize: "vertical",
    outline: "none",
    fontFamily: "inherit",
  },

  warningText: {
    background: "#fff7ed",
    color: "#c2410c",
    padding: "10px",
    borderRadius: "8px",
    fontSize: "11px",
  },

  modalError: {
    background: "#fff1f2",
    color: "#be123c",
    border: "1px solid #fecdd3",
    padding: "10px 12px",
    borderRadius: "8px",
    marginBottom: "15px",
    fontSize: "11px",
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    borderTop: "1px solid #f1f5f9",
    paddingTop: "18px",
  },

  cancelButton: {
    border: "1px solid #dbe2ea",
    background: "#fff",
    color: "#64748b",
    padding: "10px 15px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  saveButton: {
    border: "none",
    background: "#2563eb",
    color: "#fff",
    padding: "10px 17px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
  },
};

export default AdminDashboard;
