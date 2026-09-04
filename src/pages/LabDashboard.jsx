import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getTestName } from "./labDashboard.utils";

function LabDashboard() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [selectedNurse, setSelectedNurse] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // =====================================================
  // PATIENT NAME
  // =====================================================

  const getPatientName = (
    patient
  ) => {
    if (!patient) {
      return "Unknown Patient";
    }

    return (
      patient.full_name ||
      patient.fullName ||
      patient.name ||
      "Unknown Patient"
    );
  };

  // =====================================================
  // PATIENT ID
  // =====================================================

  const getPatientId = (
    patient
  ) => {
    if (!patient) {
      return "No Patient ID";
    }

    return (
      patient.patient_id ||
      patient.patientId ||
      patient.id ||
      "No Patient ID"
    );
  };

  // =====================================================
  // TEST ARRAY
  // =====================================================

  const getTests = (
    request
  ) => {
    if (!request) {
      return [];
    }

    const tests =
      request.tests;

    if (Array.isArray(tests)) {
      return tests;
    }

    if (
      typeof tests ===
      "string"
    ) {
      try {
        const parsed =
          JSON.parse(tests);

        if (
          Array.isArray(parsed)
        ) {
          return parsed;
        }

        if (
          parsed &&
          typeof parsed ===
            "object"
        ) {
          return [parsed];
        }

        if (
          typeof parsed ===
          "string"
        ) {
          return [parsed];
        }
      } catch {
        return tests.trim()
          ? [tests]
          : [];
      }
    }

    if (
      tests &&
      typeof tests ===
        "object"
    ) {
      return [tests];
    }

    return [];
  };

  // =====================================================
  // STATUS
  // =====================================================

  const getStatus = (
    status
  ) => {
    switch (status) {
      case "Accepted":
        return {
          label: "Accepted",
          className:
            "accepted",
        };

      case "Collecting":
        return {
          label: "Collecting",
          className:
            "collecting",
        };

      case "Processing":
        return {
          label: "Processing",
          className:
            "processing",
        };

      case "In Transit":
        return {
          label: "In Transit",
          className: "transit",
        };

      case "Delivered":
        return {
          label: "Delivered",
          className:
            "delivered",
        };

      case "Completed":
        return {
          label: "Completed",
          className:
            "completed",
        };

      case "Requested":
      case "Pending":
        return {
          label: "Pending",
          className:
            "pending",
        };

      default:
        return {
          label:
            status || "Pending",
          className:
            "pending",
        };
    }
  };

  // =====================================================
  // DATE
  // =====================================================

  const formatDate = (
    value
  ) => {
    if (!value) {
      return "-";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "-";
    }

    return date.toLocaleDateString(
      "en-US",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData =
    useCallback(
      async () => {
        setLoading(true);
        setErrorMessage("");

        try {
          // =================================================
          // 1. LOAD LABORATORY REQUESTS
          // =================================================

          const {
            data: requestData,
            error: requestError,
          } = await supabase
            .from(
              "laboratory_requests"
            )
            .select("*")
            .order("id", {
              ascending: false,
            });

          if (requestError) {
            throw requestError;
          }

          const safeRequests =
            Array.isArray(
              requestData
            )
              ? requestData
              : [];

          // =================================================
          // 2. GET PATIENT IDS
          // =================================================

          const patientIds = [
            ...new Set(
              safeRequests
                .map(
                  (request) =>
                    request.patient_id
                )
                .filter(
                  (id) =>
                    id !== null &&
                    id !== undefined
                )
            ),
          ];

          // =================================================
          // 3. LOAD PATIENTS
          // =================================================

          let patientData =
            [];

          if (
            patientIds.length >
            0
          ) {
            const {
              data,
              error:
                patientError,
            } =
              await supabase
                .from("patients")
                .select("*")
                .in(
                  "id",
                  patientIds
                );

            if (patientError) {
              console.error(
                "PATIENT LOAD ERROR:",
                patientError
              );
            } else {
              patientData =
                Array.isArray(
                  data
                )
                  ? data
                  : [];
            }
          }

          // =================================================
          // 4. CREATE PATIENT MAP
          // =================================================

          const patientMap =
            {};

          patientData.forEach(
            (patient) => {
              if (
                patient?.id !==
                  null &&
                patient?.id !==
                  undefined
              ) {
                patientMap[
                  String(
                    patient.id
                  )
                ] = patient;
              }
            }
          );

          // =================================================
          // 5. COMBINE REQUEST + PATIENT
          // =================================================

          const combinedRequests =
            safeRequests.map(
              (request) => ({
                ...request,

                patient:
                  patientMap[
                    String(
                      request.patient_id
                    )
                  ] || null,
              })
            );

          // =================================================
          // 6. GET NURSE USER IDS
          //
          // laboratory_requests.requested_by
          //        ↓
          // profiles.id
          // =================================================

          const nurseIds = [
            ...new Set(
              combinedRequests
                .map(
                  (request) =>
                    request.requested_by
                )
                .filter(
                  (id) =>
                    id !== null &&
                    id !== undefined
                )
            ),
          ];

          // =================================================
          // 7. LOAD NURSE PROFILES
          // =================================================

          let profileData =
            [];

          if (
            nurseIds.length >
            0
          ) {
            const {
              data,
              error:
                profileError,
            } =
              await supabase
                .from("profiles")
                .select(
                  "id, full_name, username"
                )
                .in(
                  "id",
                  nurseIds
                );

            if (profileError) {
              console.error(
                "PROFILE LOAD ERROR:",
                profileError
              );

              throw new Error(
                `Unable to load nurse profiles: ${profileError.message}`
              );
            }

            profileData =
              Array.isArray(
                data
              )
                ? data
                : [];
          }

          // =================================================
          // 8. CREATE NURSE MAP
          // =================================================

          const nurseMap =
            {};

          profileData.forEach(
            (profile) => {
              if (
                profile?.id
              ) {
                nurseMap[
                  String(
                    profile.id
                  )
                ] = profile;
              }
            }
          );

          // =================================================
          // 9. ADD NURSE TO EACH REQUEST
          // =================================================

          const requestsWithNurse =
            combinedRequests.map(
              (request) => ({
                ...request,

                nurse:
                  nurseMap[
                    String(
                      request.requested_by
                    )
                  ] || {
                    id:
                      request.requested_by,
                    full_name:
                      "Unknown Nurse",
                    username:
                      "",
                  },
              })
            );

          // =================================================
          // 10. CREATE NURSE GROUPS
          // =================================================

          const nurseGroups =
            {};

          requestsWithNurse.forEach(
            (request) => {
              const nurse =
                request.nurse;

              const nurseId =
                String(
                  nurse?.id ||
                    request.requested_by ||
                    "unknown"
                );

              if (
                !nurseGroups[
                  nurseId
                ]
              ) {
                nurseGroups[
                  nurseId
                ] = {
                  id: nurseId,

                  full_name:
                    nurse?.full_name ||
                    "Unknown Nurse",

                  username:
                    nurse?.username ||
                    "",

                  requests: [],
                };
              }

              nurseGroups[
                nurseId
              ].requests.push(
                request
              );
            }
          );

          const nurseList =
            Object.values(
              nurseGroups
            ).sort(
              (a, b) =>
                a.full_name.localeCompare(
                  b.full_name
                )
            );

          setRequests(
            requestsWithNurse
          );

          setNurses(
            nurseList
          );

          // =================================================
          // DEBUG
          // =================================================

          console.log(
            "LAB REQUESTS:",
            requestsWithNurse
          );

          console.log(
            "NURSE GROUPS:",
            nurseList
          );
        } catch (error) {
          console.error(
            "LAB DASHBOARD ERROR:",
            error
          );

          setRequests([]);
          setNurses([]);

          setErrorMessage(
            error?.message ||
              "Unable to load laboratory requests."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  loadData();
}, [loadData]);
  // =====================================================
  // SELECTED NURSE REQUESTS
  // =====================================================

  const selectedRequests =
    useMemo(() => {
      if (!selectedNurse) {
        return [];
      }

      return requests.filter(
        (request) =>
          String(
            request.requested_by
          ) ===
          String(
            selectedNurse.id
          )
      );
    }, [
      requests,
      selectedNurse,
    ]);

  // =====================================================
  // FILTER SEARCH
  // =====================================================

  const filteredRequests =
    useMemo(() => {
      const search =
        searchTerm
          .toLowerCase()
          .trim();

      if (!search) {
        return selectedRequests;
      }

      return selectedRequests.filter(
        (request) => {
          const patientName =
            getPatientName(
              request.patient
            )
              .toLowerCase();

          const patientId =
            String(
              getPatientId(
                request.patient
              )
            ).toLowerCase();

          const requestId =
            String(
              request.id || ""
            ).toLowerCase();

          const tests =
            getTests(
              request
            )
              .map(
                (test) =>
                  getTestName(
                    test
                  ).toLowerCase()
              )
              .join(" ");

          return (
            patientName.includes(
              search
            ) ||
            patientId.includes(
              search
            ) ||
            requestId.includes(
              search
            ) ||
            tests.includes(
              search
            )
          );
        }
      );
    }, [
      selectedRequests,
      searchTerm,
    ]);

  // =====================================================
  // STATISTICS
  // =====================================================

  const totalRequests =
    requests.length;

  const pendingRequests =
    requests.filter(
      (request) =>
        request.status ===
          "Pending" ||
        request.status ===
          "Requested"
    ).length;

  const processingRequests =
    requests.filter(
      (request) =>
        request.status ===
          "Accepted" ||
        request.status ===
          "Collecting" ||
        request.status ===
          "Processing" ||
        request.status ===
          "In Transit"
    ).length;

  const completedRequests =
    requests.filter(
      (request) =>
        request.status ===
          "Completed" ||
        request.status ===
          "Delivered"
    ).length;

  // =====================================================
  // ACTIVE NURSE COUNT
  // =====================================================

  const getActiveCount = (
    nurse
  ) => {
    return nurse.requests.filter(
      (request) =>
        request.status !==
          "Completed" &&
        request.status !==
          "Delivered"
    ).length;
  };

  // =====================================================
  // OPEN REQUEST
  // =====================================================

  const handleOpenRequest =
    (request) => {
      navigate(
        "/laboratory-process-request",
        {
          state: {
            request,
          },
        }
      );
    };

  // =====================================================
  // BACK TO NURSES
  // =====================================================

  const handleBackToNurses =
    () => {
      setSelectedNurse(null);
      setSearchTerm("");
    };

  // =====================================================
  // SIGN OUT
  // =====================================================

  const handleSignOut =
    async () => {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error(
          "SIGN OUT ERROR:",
          error
        );
      }

      localStorage.removeItem(
        "currentUser"
      );

      navigate("/");
    };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner" />
        <p>
          Loading laboratory
          dashboard...
        </p>

        <style>{`
          .loading-page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #f6f9fb;
            font-family: Inter, Arial, sans-serif;
            color: #667085;
          }

          .loading-spinner {
            width: 45px;
            height: 45px;
            border: 3px solid #dfeff1;
            border-top-color: #087f8c;
            border-radius: 50%;
            animation: labSpin .8s linear infinite;
            margin-bottom: 14px;
          }

          @keyframes labSpin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="lab-dashboard">

      <style>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f6f9fb;
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

        .lab-dashboard {
          min-height: 100vh;
          background: #f6f9fb;
        }

        /* =================================================
           SIDEBAR
        ================================================= */

        .sidebar {
          width: 255px;
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          background: #ffffff;
          border-right: 1px solid #e5ebef;
          padding: 23px 16px;
          display: flex;
          flex-direction: column;
          z-index: 20;
        }

       .logo-container {
  height: 105px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-bottom: 1px solid #edf1f4;
  margin-bottom: 23px;
  padding: 8px 0;
}

.logo {
  width: 185px;
  height: 82px;
  object-fit: contain;
}

        .menu-title {
          padding: 0 11px 10px;
          color: #a0a9b5;
          font-size: 9px;
          font-weight: 750;
          letter-spacing: 1.2px;
        }

        .nav-button {
          width: 100%;
          border: none;
          background: transparent;
          color: #667085;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 13px;
          margin-bottom: 4px;
          border-radius: 9px;
          cursor: pointer;
          text-align: left;
          font-size: 12px;
          font-weight: 550;
          transition: .2s ease;
        }

        .nav-button:hover {
          background: #f1f8fa;
          color: #087f8c;
        }

        .nav-button.active {
          background: #e8f7f8;
          color: #087f8c;
          font-weight: 700;
        }

        .nav-icon {
          width: 21px;
          height: 21px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .sidebar-spacer {
          flex: 1;
        }

        .profile {
          border-top: 1px solid #edf1f4;
          padding: 16px 7px 4px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .profile-avatar {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background:
            linear-gradient(
              135deg,
              #075d87,
              #08a399
            );
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 750;
        }

        .profile-name {
          margin: 0;
          color: #344054;
          font-size: 11px;
          font-weight: 700;
        }

        .profile-role {
          margin: 3px 0 0;
          color: #98a2b3;
          font-size: 9px;
        }

        /* =================================================
           MAIN
        ================================================= */

        .main {
          width: calc(100% - 255px);
          margin-left: 255px;
          padding: 28px 35px 35px;
        }

        /* =================================================
           HEADER
        ================================================= */

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 25px;
        }

        .breadcrumb {
          margin: 0 0 7px;
          color: #98a2b3;
          font-size: 10px;
        }

        .breadcrumb span {
          color: #087f8c;
          font-weight: 650;
        }

        .title {
          margin: 0;
          color: #152238;
          font-size: 27px;
          font-weight: 750;
          letter-spacing: -.7px;
        }

        .subtitle {
          margin: 7px 0 0;
          color: #7c8797;
          font-size: 12px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .date {
          padding: 10px 13px;
          background: white;
          border: 1px solid #e3e8ed;
          border-radius: 9px;
          color: #667085;
          font-size: 10px;
        }

        .refresh-button {
          width: 39px;
          height: 39px;
          border: 1px solid #e3e8ed;
          background: white;
          border-radius: 9px;
          color: #667085;
          cursor: pointer;
          font-size: 16px;
        }

        .refresh-button:hover {
          color: #087f8c;
          background: #f6fbfb;
        }

        .header-avatar {
          width: 39px;
          height: 39px;
          border-radius: 9px;
          background: #087f8c;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 750;
        }

        /* =================================================
           STATS
        ================================================= */

        .stats {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 19px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e4e9ee;
          border-radius: 13px;
          padding: 18px;
          min-height: 112px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-label {
          margin: 0;
          color: #7b8798;
          font-size: 10px;
          font-weight: 600;
        }

        .stat-number {
          margin: 7px 0 4px;
          color: #152238;
          font-size: 27px;
          font-weight: 750;
        }

        .stat-description {
          margin: 0;
          color: #a0a9b7;
          font-size: 8px;
        }

        .stat-icon {
          width: 43px;
          height: 43px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          font-weight: 700;
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

        /* =================================================
           WELCOME
        ================================================= */

        .welcome {
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(
              115deg,
              #07547d,
              #087f8c 62%,
              #0aa399
            );
          border-radius: 14px;
          padding: 23px 26px;
          color: white;
          margin-bottom: 19px;
        }

        .welcome h2 {
          margin: 0;
          font-size: 19px;
          font-weight: 700;
        }

        .welcome-label {
          margin: 0 0 5px;
          color: rgba(
            255,
            255,
            255,
            .7
          );
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 750;
        }

        .welcome p:last-child {
          max-width: 650px;
          margin: 7px 0 0;
          color: rgba(
            255,
            255,
            255,
            .78
          );
          font-size: 10px;
          line-height: 1.5;
        }

        /* =================================================
           ERROR
        ================================================= */

        .error-card {
          background: #fff5f5;
          border: 1px solid #f3c4c4;
          border-radius: 12px;
          padding: 18px;
          color: #b42318;
          margin-bottom: 20px;
          font-size: 11px;
        }

        /* =================================================
           NURSE SECTION
        ================================================= */

        .nurse-section {
          background: white;
          border: 1px solid #e4e9ee;
          border-radius: 14px;
          overflow: hidden;
        }

        .section-header {
          padding: 21px 22px 18px;
          border-bottom: 1px solid #edf1f4;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .section-title {
          margin: 0;
          color: #172033;
          font-size: 16px;
          font-weight: 700;
        }

        .section-subtitle {
          margin: 5px 0 0;
          color: #98a2b3;
          font-size: 10px;
        }

        .nurse-count {
          padding: 7px 11px;
          background: #e9f7f8;
          color: #087f8c;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 750;
        }

        .nurse-grid {
          padding: 20px 22px 22px;
          display: grid;
          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );
          gap: 14px;
        }

        .nurse-card {
          border: 1px solid #e4e9ee;
          border-radius: 12px;
          background: #ffffff;
          padding: 17px;
          cursor: pointer;
          transition: .2s ease;
        }

        .nurse-card:hover {
          transform: translateY(-2px);
          border-color: #b9dfe2;
          box-shadow:
            0 8px 25px
            rgba(
              8,
              127,
              140,
              .08
            );
        }

        .nurse-card-top {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .nurse-avatar {
          width: 43px;
          height: 43px;
          flex: 0 0 43px;
          border-radius: 11px;
          background: #e8f7f8;
          color: #087f8c;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 800;
        }

        .nurse-name {
          margin: 0;
          color: #344054;
          font-size: 12px;
          font-weight: 750;
        }

        .nurse-username {
          margin: 3px 0 0;
          color: #98a2b3;
          font-size: 9px;
        }

        .nurse-card-bottom {
          margin-top: 17px;
          padding-top: 13px;
          border-top: 1px solid #edf1f4;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .request-count {
          color: #667085;
          font-size: 9px;
        }

        .request-count strong {
          color: #087f8c;
          font-size: 15px;
        }

        .view-nurse {
          border: none;
          background: #e9f7f8;
          color: #087f8c;
          border-radius: 7px;
          padding: 7px 10px;
          font-size: 9px;
          font-weight: 700;
          cursor: pointer;
        }

        .view-nurse:hover {
          background: #dff2f3;
        }

        .no-nurses {
          padding: 55px 20px;
          text-align: center;
          color: #98a2b3;
          font-size: 11px;
        }

        /* =================================================
           SELECTED NURSE
        ================================================= */

        .selected-section {
          background: white;
          border: 1px solid #e4e9ee;
          border-radius: 14px;
          overflow: hidden;
        }

        .selected-header {
          padding: 19px 22px;
          border-bottom: 1px solid #edf1f4;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .selected-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .back-nurses {
          border: 1px solid #dfe6eb;
          background: white;
          color: #667085;
          border-radius: 8px;
          padding: 8px 11px;
          cursor: pointer;
          font-size: 9px;
          font-weight: 700;
        }

        .back-nurses:hover {
          background: #f7fafb;
        }

        .selected-avatar {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: #e8f7f8;
          color: #087f8c;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 14px;
        }

        .selected-name {
          margin: 0;
          font-size: 15px;
          font-weight: 750;
          color: #172033;
        }

        .selected-meta {
          margin: 4px 0 0;
          color: #98a2b3;
          font-size: 9px;
        }

        /* =================================================
           SEARCH
        ================================================= */

        .search-area {
          padding: 17px 22px;
          border-bottom: 1px solid #edf1f4;
        }

        .search-box {
          height: 42px;
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
          font-size: 16px;
        }

        .search-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          color: #344054;
          font-size: 11px;
        }

        .clear {
          border: none;
          background: transparent;
          color: #98a2b3;
          cursor: pointer;
          font-size: 15px;
        }

        /* =================================================
           REQUEST TABLE
        ================================================= */

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          min-width: 950px;
          border-collapse: collapse;
        }

        th {
          padding: 12px 17px;
          background: #f8fafc;
          border-bottom: 1px solid #edf1f4;
          text-align: left;
          color: #7b8798;
          font-size: 8px;
          font-weight: 750;
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
          font-size: 10px;
          font-weight: 750;
        }

        .patient {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .patient-avatar {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: #edf7f8;
          color: #087f8c;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 750;
          flex-shrink: 0;
        }

        .patient-name {
          margin: 0;
          color: #344054;
          font-size: 10px;
          font-weight: 700;
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
          max-width: 270px;
        }

        .test {
          padding: 4px 6px;
          background: #f4f6f8;
          color: #667085;
          border-radius: 5px;
          font-size: 8px;
        }

        .more-tests {
          padding: 4px 6px;
          background: #e9f7f8;
          color: #087f8c;
          border-radius: 5px;
          font-size: 8px;
          font-weight: 700;
        }

        .date-text {
          color: #667085;
          font-size: 9px;
        }

        /* =================================================
           STATUS
        ================================================= */

        .status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 8px;
          font-weight: 700;
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

        .status.delivered,
        .status.completed {
          background: #eaf9f1;
          color: #087f4f;
        }

        /* =================================================
           OPEN BUTTON
        ================================================= */

        .open-button {
          border: none;
          background: #e9f7f8;
          color: #087f8c;
          border-radius: 7px;
          padding: 7px 10px;
          cursor: pointer;
          font-size: 9px;
          font-weight: 700;
          white-space: nowrap;
        }

        .open-button:hover {
          background: #dff2f3;
        }

        /* =================================================
           EMPTY
        ================================================= */

        .empty {
          padding: 55px 20px;
          text-align: center;
          color: #98a2b3;
          font-size: 10px;
        }

        .empty-icon {
          width: 55px;
          height: 55px;
          margin: 0 auto 13px;
          border-radius: 14px;
          background: #edf8f8;
          color: #087f8c;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }

        .empty h3 {
          margin: 0 0 6px;
          color: #344054;
          font-size: 14px;
        }

        .empty p {
          margin: 0;
          color: #98a2b3;
          font-size: 9px;
        }

        /* =================================================
           FOOTER
        ================================================= */

        .footer {
          display: flex;
          justify-content: space-between;
          padding: 18px 3px 0;
          color: #a0a9b5;
          font-size: 8px;
        }

        /* =================================================
           RESPONSIVE
        ================================================= */

        @media (max-width: 1150px) {

          .stats {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .nurse-grid {
            grid-template-columns:
              repeat(2, 1fr);
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
            padding: 22px 18px;
          }

          .logo {
            width: 48px;
          }

          .menu-title,
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
        }

        @media (max-width: 600px) {

          .main {
            padding: 18px 13px;
          }

          .header {
            flex-direction: column;
          }

          .date {
            display: none;
          }

          .title {
            font-size: 23px;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .nurse-grid {
            grid-template-columns: 1fr;
          }

          .section-header {
            align-items: flex-start;
          }

          .selected-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .selected-left {
            width: 100%;
            flex-wrap: wrap;
          }

          .footer {
            flex-direction: column;
            gap: 5px;
          }
        }

      `}</style>

      {/* ==================================================
          SIDEBAR
      ================================================== */}

      <aside className="sidebar">

        <div>

          <div className="logo-container">

   <img
  className="logo"
  src={`${import.meta.env.BASE_URL}samplogy-logo.png`}
  alt="Samplogy"
/>
          </div>

          <div className="menu-title">
            WORKSPACE
          </div>

          <button
            type="button"
            className="nav-button active"
            onClick={() =>
              navigate(
                "/laboratory"
              )
            }
          >
            <span className="nav-icon">
              ⌂
            </span>

            <span className="nav-text">
              Dashboard
            </span>
          </button>

          <button
            type="button"
            className="nav-button"
            onClick={() =>
              navigate(
                "/lab-requests"
              )
            }
          >
            <span className="nav-icon">
              ▤
            </span>

            <span className="nav-text">
              Sample Requests
            </span>
          </button>

          <button
            type="button"
            className="nav-button"
            onClick={() =>
              navigate(
                "/laboratory-process-request"
              )
            }
          >
            <span className="nav-icon">
              ◇
            </span>

            <span className="nav-text">
              Processing
            </span>
          </button>

          <button
            type="button"
            className="nav-button"
            onClick={() =>
              navigate(
                "/laboratory-results"
              )
            }
          >
            <span className="nav-icon">
              ✓
            </span>

            <span className="nav-text">
              Laboratory Results
            </span>
          </button>

          <div
            className="menu-title"
            style={{
              marginTop: "20px",
            }}
          >
            ACCOUNT
          </div>

          <button
            type="button"
            className="nav-button"
          >
            <span className="nav-icon">
              ◯
            </span>

            <span className="nav-text">
              My Profile
            </span>
          </button>

          <button
            type="button"
            className="nav-button"
            onClick={
              handleSignOut
            }
          >
            <span className="nav-icon">
              ↪
            </span>

            <span className="nav-text">
              Sign Out
            </span>
          </button>

        </div>

        <div className="sidebar-spacer" />

        <div className="profile">

          <div className="profile-avatar">
            L
          </div>

          <div className="profile-details">

            <p className="profile-name">
              Laboratory Staff
            </p>

            <p className="profile-role">
              Laboratory Portal
            </p>

          </div>

        </div>

      </aside>

      {/* ==================================================
          MAIN
      ================================================== */}

      <main className="main">

        {/* HEADER */}

        <header className="header">

          <div>

            <p className="breadcrumb">
              Samplogy /{" "}
              <span>
                Laboratory Portal
              </span>
            </p>

            <h1 className="title">
              Laboratory Dashboard
            </h1>

            <p className="subtitle">
              Select a nurse to view
              their laboratory requests.
            </p>

          </div>

          <div className="header-actions">

            <div className="date">
              Today ·{" "}
              {new Date().toLocaleDateString(
                "en-US",
                {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }
              )}
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={
                loadData
              }
              title="Refresh"
            >
              ↻
            </button>

            <div className="header-avatar">
              L
            </div>

          </div>

        </header>

        {/* ==================================================
            STATISTICS
        ================================================== */}

        <section className="stats">

          <div className="stat-card">

            <div>

              <p className="stat-label">
                Total Requests
              </p>

              <h2 className="stat-number">
                {totalRequests}
              </h2>

              <p className="stat-description">
                All laboratory requests
              </p>

            </div>

            <div className="stat-icon blue">
              □
            </div>

          </div>

          <div className="stat-card">

            <div>

              <p className="stat-label">
                Pending
              </p>

              <h2 className="stat-number">
                {pendingRequests}
              </h2>

              <p className="stat-description">
                Awaiting laboratory action
              </p>

            </div>

            <div className="stat-icon orange">
              ◷
            </div>

          </div>

          <div className="stat-card">

            <div>

              <p className="stat-label">
                Processing
              </p>

              <h2 className="stat-number">
                {processingRequests}
              </h2>

              <p className="stat-description">
                Currently being processed
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
                Completed laboratory work
              </p>

            </div>

            <div className="stat-icon green">
              ✓
            </div>

          </div>

        </section>

        {/* ==================================================
            WELCOME
        ================================================== */}

        <section className="welcome">

          <p className="welcome-label">
            Samplogy Laboratory
          </p>

          <h2>
            Welcome to the Laboratory Portal
          </h2>

          <p>
            Laboratory requests are
            organized by nurse. Select
            a nurse below to review
            the patients and tests
            they submitted.
          </p>

        </section>

        {/* ==================================================
            ERROR
        ================================================== */}

        {errorMessage && (
          <div className="error-card">
            <strong>
              Unable to load dashboard
            </strong>

            <br />

            {errorMessage}
          </div>
        )}

        {/* ==================================================
            NURSE LIST
        ================================================== */}

        {!selectedNurse ? (

          <section className="nurse-section">

            <div className="section-header">

              <div>

                <h2 className="section-title">
                  Nurses
                </h2>

                <p className="section-subtitle">
                  Select a nurse to view
                  their laboratory requests.
                </p>

              </div>

              <div className="nurse-count">
                {nurses.length}{" "}
                {nurses.length === 1
                  ? "Nurse"
                  : "Nurses"}
              </div>

            </div>

            {nurses.length ===
            0 ? (

              <div className="no-nurses">

                <div
                  style={{
                    fontSize:
                      "28px",
                    marginBottom:
                      "12px",
                  }}
                >
                  👩‍⚕️
                </div>

                <div>
                  No nurses have
                  submitted laboratory
                  requests yet.
                </div>

              </div>

            ) : (

              <div className="nurse-grid">

                {nurses.map(
                  (nurse) => {

                    const activeCount =
                      getActiveCount(
                        nurse
                      );

                    const initial =
                      (
                        nurse.full_name ||
                        "N"
                      )
                        .charAt(0)
                        .toUpperCase();

                    return (

                      <div
                        key={
                          nurse.id
                        }
                        className="nurse-card"
                        onClick={() =>
                          setSelectedNurse(
                            nurse
                          )
                        }
                      >

                        <div className="nurse-card-top">

                          <div className="nurse-avatar">
                            {initial}
                          </div>

                          <div>

                            <p className="nurse-name">
                              {nurse.full_name ||
                                "Unknown Nurse"}
                            </p>

                            {nurse.username && (
                              <p className="nurse-username">
                                @{nurse.username}
                              </p>
                            )}

                          </div>

                        </div>

                        <div className="nurse-card-bottom">

                          <div className="request-count">

                            <strong>
                              {
                                nurse.requests
                                  .length
                              }
                            </strong>

                            <br />

                            Total requests

                          </div>

                          <div className="request-count">

                            <strong>
                              {
                                activeCount
                              }
                            </strong>

                            <br />

                            Active

                          </div>

                          <button
                            type="button"
                            className="view-nurse"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();

                              setSelectedNurse(
                                nurse
                              );
                            }}
                          >
                            View →
                          </button>

                        </div>

                      </div>

                    );
                  }
                )}

              </div>

            )}

          </section>

        ) : (

          /* ==================================================
             SELECTED NURSE REQUESTS
          ================================================== */

          <section className="selected-section">

            <div className="selected-header">

              <div className="selected-left">

                <button
                  type="button"
                  className="back-nurses"
                  onClick={
                    handleBackToNurses
                  }
                >
                  ← Nurses
                </button>

                <div className="selected-avatar">
                  {(
                    selectedNurse.full_name ||
                    "N"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>

                  <h2 className="selected-name">
                    {
                      selectedNurse.full_name
                    }
                  </h2>

                  <p className="selected-meta">

                    {selectedNurse.username
                      ? `@${selectedNurse.username} · `
                      : ""}

                    {
                      selectedRequests.length
                    }{" "}
                    laboratory{" "}
                    {selectedRequests.length ===
                    1
                      ? "request"
                      : "requests"}

                  </p>

                </div>

              </div>

            </div>

            {/* SEARCH */}

            <div className="search-area">

              <div className="search-box">

                <span className="search-icon">
                  ⌕
                </span>

                <input
                  className="search-input"
                  type="text"
                  placeholder="Search patient name, patient ID, request ID or test..."
                  value={
                    searchTerm
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchTerm(
                      event.target
                        .value
                    )
                  }
                />

                {searchTerm && (
                  <button
                    type="button"
                    className="clear"
                    onClick={() =>
                      setSearchTerm(
                        ""
                      )
                    }
                  >
                    ×
                  </button>
                )}

              </div>

            </div>

            {/* REQUESTS */}

            {filteredRequests.length ===
            0 ? (

              <div className="empty">

                <div className="empty-icon">
                  □
                </div>

                <h3>
                  {selectedRequests.length ===
                  0
                    ? "No requests from this nurse"
                    : "No matching requests"}
                </h3>

                <p>
                  {selectedRequests.length ===
                  0
                    ? "Laboratory requests submitted by this nurse will appear here."
                    : "Try another patient name, patient ID, request ID, or test."}
                </p>

              </div>

            ) : (

              <div className="table-wrapper">

                <table>

                  <thead>

                    <tr>

                      <th>
                        Request ID
                      </th>

                      <th>
                        Patient
                      </th>

                      <th>
                        Laboratory Tests
                      </th>

                      <th>
                        Request Date
                      </th>

                      <th>
                        Status
                      </th>

                      <th>
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredRequests.map(
                      (
                        request,
                        index
                      ) => {

                        const patient =
                          request.patient;

                        const patientName =
                          getPatientName(
                            patient
                          );

                        const patientId =
                          getPatientId(
                            patient
                          );

                        const tests =
                          getTests(
                            request
                          );

                        const status =
                          getStatus(
                            request.status
                          );

                        return (

                          <tr
                            key={
                              request.id ??
                              `request-${index}`
                            }
                          >

                            <td>

                              <span className="request-id">

                                LAB-
                                {String(
                                  request.id ??
                                    index +
                                      1
                                ).padStart(
                                  6,
                                  "0"
                                )}

                              </span>

                            </td>

                            <td>

                              <div className="patient">

                                <div className="patient-avatar">

                                  {patientName
                                    .charAt(
                                      0
                                    )
                                    .toUpperCase()}

                                </div>

                                <div>

                                  <p className="patient-name">
                                    {
                                      patientName
                                    }
                                  </p>

                                  <p className="patient-id">
                                    {
                                      patientId
                                    }
                                  </p>

                                </div>

                              </div>

                            </td>

                            <td>

                              <div className="tests">

                                {tests.length ===
                                0 ? (

                                  <span className="test">
                                    Sample Collection
                                  </span>

                                ) : (

                                  <>

                                    {tests
                                      .slice(
                                        0,
                                        3
                                      )
                                      .map(
                                        (
                                          test,
                                          testIndex
                                        ) => {

                                          const name =
                                            getTestName(
                                              test
                                            );

                                          return (
                                            <span
                                              className="test"
                                              key={`${request.id}-${testIndex}`}
                                              title={
                                                name
                                              }
                                            >
                                              {
                                                name
                                              }
                                            </span>
                                          );
                                        }
                                      )}

                                    {tests.length >
                                      3 && (

                                      <span className="more-tests">

                                        +
                                        {tests.length -
                                          3}{" "}
                                        more

                                      </span>

                                    )}

                                  </>

                                )}

                              </div>

                            </td>

                            <td>

                              <span className="date-text">
                                {formatDate(
                                  request.created_at
                                )}
                              </span>

                            </td>

                            <td>

                              <span
                                className={`status ${status.className}`}
                              >

                                <span className="status-dot" />

                                {
                                  status.label
                                }

                              </span>

                            </td>

                            <td>

                              <button
                                type="button"
                                className="open-button"
                                onClick={() =>
                                  handleOpenRequest(
                                    request
                                  )
                                }
                              >
                                Open Request →
                              </button>

                            </td>

                          </tr>

                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </section>

        )}

        {/* ==================================================
            FOOTER
        ================================================== */}

        <footer className="footer">

          <span>
            © 2026 Samplogy
          </span>

          <span>
            Laboratory Management Portal
          </span>

        </footer>

      </main>

    </div>
  );
}

export default LabDashboard;
