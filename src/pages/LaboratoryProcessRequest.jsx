import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function LaboratoryProcessRequest() {
  const location = useLocation();
  const navigate = useNavigate();

  const requestFromState = location.state?.request || null;

  const [request, setRequest] = useState(requestFromState);
  const [patient, setPatient] = useState(
    requestFromState?.patient || null
  );

  const [loading, setLoading] = useState(!requestFromState);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [results, setResults] = useState(
    requestFromState?.results &&
    typeof requestFromState.results === "object" &&
    !Array.isArray(requestFromState.results)
      ? requestFromState.results
      : {}
  );

  const [notes, setNotes] = useState(
    typeof requestFromState?.laboratory_notes === "string"
      ? requestFromState.laboratory_notes
      : typeof requestFromState?.notes === "string"
      ? requestFromState.notes
      : ""
  );

  // =========================================================
  // TEST NAME MAP
  // =========================================================

  const testNames = {
    cbc: "Complete Blood Count",
    "blood-group": "Blood Group",
    "blood-glucose": "Blood Glucose",
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
    creatinine: "Creatinine",
    urea: "Urea",
    hemoglobin: "Hemoglobin",
    hematocrit: "Hematocrit",
    platelets: "Platelets",
    wbc: "White Blood Cells",
    rbc: "Red Blood Cells",
    cholesterol: "Cholesterol",
    triglycerides: "Triglycerides",
  };

  // =========================================================
  // TEST DEFINITIONS
  // =========================================================

  const testDefinitions = {
    cbc: {
      name: "Complete Blood Count",
      parameters: [
        {
          key: "hemoglobin",
          label: "Hemoglobin",
          unit: "g/dL",
          reference: "12.0 - 17.5",
        },
        {
          key: "wbc",
          label: "White Blood Cells",
          unit: "10³/µL",
          reference: "4.0 - 11.0",
        },
        {
          key: "rbc",
          label: "Red Blood Cells",
          unit: "10⁶/µL",
          reference: "4.0 - 6.0",
        },
        {
          key: "hematocrit",
          label: "Hematocrit",
          unit: "%",
          reference: "36 - 54",
        },
        {
          key: "platelets",
          label: "Platelets",
          unit: "10³/µL",
          reference: "150 - 450",
        },
      ],
    },

    "blood-glucose": {
      name: "Blood Glucose",
      parameters: [
        {
          key: "glucose",
          label: "Glucose",
          unit: "mg/dL",
          reference: "70 - 100",
        },
      ],
    },

    glucose: {
      name: "Glucose",
      parameters: [
        {
          key: "glucose",
          label: "Glucose",
          unit: "mg/dL",
          reference: "70 - 100",
        },
      ],
    },

    albumin: {
      name: "Albumin",
      parameters: [
        {
          key: "albumin",
          label: "Albumin",
          unit: "g/dL",
          reference: "3.5 - 5.0",
        },
      ],
    },

    alt: {
      name: "ALT",
      parameters: [
        {
          key: "alt",
          label: "ALT",
          unit: "U/L",
          reference: "7 - 56",
        },
      ],
    },

    ast: {
      name: "AST",
      parameters: [
        {
          key: "ast",
          label: "AST",
          unit: "U/L",
          reference: "10 - 40",
        },
      ],
    },

    "alkaline-phosphatase": {
      name: "Alkaline Phosphatase",
      parameters: [
        {
          key: "alkaline-phosphatase",
          label: "Alkaline Phosphatase",
          unit: "U/L",
          reference: "44 - 147",
        },
      ],
    },

    bilirubin: {
      name: "Bilirubin",
      parameters: [
        {
          key: "bilirubin",
          label: "Bilirubin",
          unit: "mg/dL",
          reference: "0.1 - 1.2",
        },
      ],
    },

    "liver-function": {
      name: "Liver Function Test",
      parameters: [
        {
          key: "alt",
          label: "ALT",
          unit: "U/L",
          reference: "7 - 56",
        },
        {
          key: "ast",
          label: "AST",
          unit: "U/L",
          reference: "10 - 40",
        },
        {
          key: "albumin",
          label: "Albumin",
          unit: "g/dL",
          reference: "3.5 - 5.0",
        },
        {
          key: "bilirubin",
          label: "Bilirubin",
          unit: "mg/dL",
          reference: "0.1 - 1.2",
        },
        {
          key: "alkaline-phosphatase",
          label: "Alkaline Phosphatase",
          unit: "U/L",
          reference: "44 - 147",
        },
      ],
    },

    creatinine: {
      name: "Creatinine",
      parameters: [
        {
          key: "creatinine",
          label: "Creatinine",
          unit: "mg/dL",
          reference: "0.6 - 1.3",
        },
      ],
    },

    urea: {
      name: "Urea",
      parameters: [
        {
          key: "urea",
          label: "Urea",
          unit: "mg/dL",
          reference: "15 - 45",
        },
      ],
    },

    "kidney-function": {
      name: "Kidney Function Test",
      parameters: [
        {
          key: "creatinine",
          label: "Creatinine",
          unit: "mg/dL",
          reference: "0.6 - 1.3",
        },
        {
          key: "urea",
          label: "Urea",
          unit: "mg/dL",
          reference: "15 - 45",
        },
      ],
    },

    "lipid-profile": {
      name: "Lipid Profile",
      parameters: [
        {
          key: "cholesterol",
          label: "Total Cholesterol",
          unit: "mg/dL",
          reference: "< 200",
        },
        {
          key: "triglycerides",
          label: "Triglycerides",
          unit: "mg/dL",
          reference: "< 150",
        },
      ],
    },

    cholesterol: {
      name: "Cholesterol",
      parameters: [
        {
          key: "cholesterol",
          label: "Total Cholesterol",
          unit: "mg/dL",
          reference: "< 200",
        },
      ],
    },

    triglycerides: {
      name: "Triglycerides",
      parameters: [
        {
          key: "triglycerides",
          label: "Triglycerides",
          unit: "mg/dL",
          reference: "< 150",
        },
      ],
    },

    "blood-group": {
      name: "Blood Group",
      parameters: [
        {
          key: "blood-group",
          label: "Blood Group",
          unit: "",
          reference: "A, B, AB, or O",
        },
      ],
    },

    urinalysis: {
      name: "Urinalysis",
      parameters: [
        {
          key: "appearance",
          label: "Appearance",
          unit: "",
          reference: "Clear",
        },
        {
          key: "protein",
          label: "Protein",
          unit: "",
          reference: "Negative",
        },
        {
          key: "glucose",
          label: "Glucose",
          unit: "",
          reference: "Negative",
        },
      ],
    },

    malaria: {
      name: "Malaria Test",
      parameters: [
        {
          key: "malaria",
          label: "Malaria Result",
          unit: "",
          reference: "Negative",
        },
      ],
    },

    hiv: {
      name: "HIV Test",
      parameters: [
        {
          key: "hiv",
          label: "HIV Result",
          unit: "",
          reference: "Non-reactive",
        },
      ],
    },

    pregnancy: {
      name: "Pregnancy Test",
      parameters: [
        {
          key: "pregnancy",
          label: "Pregnancy Result",
          unit: "",
          reference: "Negative",
        },
      ],
    },

    "stool-test": {
      name: "Stool Examination",
      parameters: [
        {
          key: "stool",
          label: "Stool Examination",
          unit: "",
          reference: "Normal",
        },
      ],
    },
  };

  // =========================================================
  // SAFE STRING
  // =========================================================

  const safeString = (value, fallback = "") => {
    if (value === null || value === undefined) {
      return fallback;
    }

    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number") {
      return String(value);
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    return fallback;
  };

  // =========================================================
  // SAFE PATIENT NAME
  // =========================================================

  const getPatientName = (patientData) => {
    if (!patientData) {
      return "Unknown Patient";
    }

    return safeString(
      patientData.full_name ||
        patientData.fullName ||
        patientData.name,
      "Unknown Patient"
    );
  };

  // =========================================================
  // SAFE PATIENT ID
  // =========================================================

  const getPatientId = (patientData) => {
    if (!patientData) {
      return "No Patient ID";
    }

    return safeString(
      patientData.patient_id ||
        patientData.patientId ||
        patientData.id,
      "No Patient ID"
    );
  };

  // =========================================================
  // NORMALIZE TEST
  //
  // IMPORTANT:
  // Your Supabase tests can look like:
  //
  // {
  //   type,
  //   label,
  //   value,
  //   sample,
  //   parameters
  // }
  //
  // We NEVER render this object directly.
  // =========================================================

  const normalizeTest = (test, index = 0) => {
    if (typeof test === "string") {
      const definition =
        testDefinitions[test] || {};

      return {
        id: `${test}-${index}`,
        key: test,
        name:
          definition.name ||
          testNames[test] ||
          test,
        label:
          definition.name ||
          testNames[test] ||
          test,
        sample: "",
        parameters:
          Array.isArray(
            definition.parameters
          )
            ? definition.parameters
            : [],
        original: test,
      };
    }

    if (
      test &&
      typeof test === "object"
    ) {
      const rawKey =
        safeString(test.value) ||
        safeString(test.type) ||
        safeString(test.key) ||
        `test-${index}`;

      const key = String(rawKey);

      const definition =
        testDefinitions[key] || {};

      let parameters = [];

      if (
        Array.isArray(test.parameters) &&
        test.parameters.length > 0
      ) {
        parameters = test.parameters;
      } else if (
        Array.isArray(definition.parameters)
      ) {
        parameters = definition.parameters;
      }

      return {
        id: `${String(key)}-${index}`,
        key: String(key),
        name:
          safeString(test.label) ||
          safeString(test.name) ||
          safeString(definition.name) ||
          safeString(testNames[key]) ||
          "Laboratory Test",
        label:
          safeString(test.label) ||
          safeString(test.name) ||
          safeString(definition.name) ||
          safeString(testNames[key]) ||
          "Laboratory Test",
        sample: safeString(
          test.sample,
          ""
        ),
        parameters,
        original: test,
      };
    }

    return {
      id: `test-${index}`,
      key: `test-${index}`,
      name: "Laboratory Test",
      label: "Laboratory Test",
      sample: "",
      parameters: [],
      original: test,
    };
  };

  // =========================================================
  // GET TESTS
  // =========================================================

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getTests = (requestData) => {
    if (!requestData) {
      return [];
    }

    let rawTests = requestData.tests;

    if (typeof rawTests === "string") {
      try {
        rawTests = JSON.parse(rawTests);
      } catch {
        rawTests = [rawTests];
      }
    }

    if (!Array.isArray(rawTests)) {
      return [];
    }

    return rawTests.map(
      (test, index) =>
        normalizeTest(test, index)
    );
  };

  // =========================================================
  // GET REFERENCE TEXT
  // =========================================================

  // =========================================================
  // GET RESULT FLAG
  //
  // FIXED:
  // reference.match() is ONLY called on a string.
  // =========================================================

  // =========================================================
  // GET STATUS
  // =========================================================

  const getStatus = (status) => {
    switch (status) {
      case "Accepted":
        return {
          label: "Accepted",
          className: "accepted",
        };

      case "Collecting":
        return {
          label: "Collecting",
          className: "collecting",
        };

      case "Processing":
        return {
          label: "Processing",
          className: "processing",
        };

      case "In Transit":
        return {
          label: "In Transit",
          className: "transit",
        };

      case "Delivered":
        return {
          label: "Delivered",
          className: "delivered",
        };

      case "Completed":
        return {
          label: "Completed",
          className: "completed",
        };

      case "Requested":
      case "Pending":
      default:
        return {
          label: "Pending",
          className: "pending",
        };
    }
  };

  // =========================================================
  // LOAD REQUEST
  // =========================================================

  useEffect(() => {
    if (requestFromState) {
      return;
    }

    const requestId =
      location.state?.requestId;

    if (!requestId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      setErrorMessage(
        "No laboratory request was selected."
      );
      return;
    }

    let cancelled = false;

    async function fetchRequest() {
      try {
        const {
          data,
          error,
        } = await supabase
          .from("laboratory_requests")
          .select("*")
          .eq("id", requestId)
          .single();

        if (error) {
          throw error;
        }

        if (cancelled) {
          return;
        }

        setRequest(data);

        if (
          data?.results &&
          typeof data.results === "object" &&
          !Array.isArray(data.results)
        ) {
          setResults(data.results);
        }

        if (typeof data?.laboratory_notes === "string") {
          setNotes(data.laboratory_notes);
        } else if (typeof data?.notes === "string") {
          setNotes(data.notes);
        }

        if (data?.patient_id) {
          const {
            data: patientData,
            error:
              patientError,
          } = await supabase
            .from("patients")
            .select("*")
            .eq(
              "id",
              data.patient_id
            )
            .single();

          if (!patientError) {
            setPatient(
              patientData
            );
          }
        }

        setLoading(false);
      } catch (error) {
        console.error(
          "Error loading request:",
          error
        );

        if (!cancelled) {
          setErrorMessage(
            error?.message ||
              "Unable to load laboratory request."
          );

          setLoading(false);
        }
      }
    }

    fetchRequest();

    return () => {
      cancelled = true;
    };
  }, [requestFromState, location.state?.requestId]);

  // =========================================================
  // NORMALIZED TESTS
  // =========================================================

  const tests = useMemo(
    () => getTests(request),
    [getTests, request]
  );

  // =========================================================
  // RESULT CHANGE
  // =========================================================

  const handleResultChange = (
    testKey,
    parameterKey,
    value
  ) => {
    const key = `${testKey}.${parameterKey}`;

    setResults(
      (previous) => ({
        ...previous,
        [key]: value,
      })
    );
  };

  // =========================================================
  // GET RESULT
  // =========================================================

  const getResultValue = (
    testKey,
    parameterKey
  ) => {
    const key = `${testKey}.${parameterKey}`;

    return results[key] ?? "";
  };

  // =========================================================
  // START PROCESSING / COMPLETE REQUEST
  // =========================================================

  const handleWorkflowAction = async () => {
    if (!request?.id || isCompleted) return;

    try {
      setSaving(true);
      setErrorMessage("");

      const { data: { user }, error: userError } =
        await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        throw new Error("Your session has expired. Please log in again.");
      }

      if (isPending) {
        const { data, error } = await supabase
          .from("laboratory_requests")
          .update({ status: "Processing", processed_by: user.id })
          .eq("id", request.id)
          .eq("status", "Pending")
          .select("*")
          .single();

        if (error) throw error;
        setRequest(data);
        return;
      }

      if (isProcessing) {
        const missingResults = tests.some((test) =>
          test.parameters.some((parameter, parameterIndex) => {
            const safeParameter = parameter && typeof parameter === "object"
              ? parameter
              : { key: `parameter-${parameterIndex}` };
            const parameterKey = safeString(
              safeParameter.key,
              safeString(safeParameter.value, `parameter-${parameterIndex}`)
            );
            return String(getResultValue(test.key, parameterKey) ?? "").trim() === "";
          })
        );

        if (missingResults) {
          throw new Error("Please enter all laboratory results before completing the request.");
        }

        const now = new Date();
        const updateData = {
          status: "Completed",
          results,
          laboratory_notes: notes.trim() || null,
          completed_at: now.toISOString(),
          completed_date: now.toISOString().slice(0, 10),
          processed_by: user.id,
        };

        const { data, error } = await supabase
          .from("laboratory_requests")
          .update(updateData)
          .eq("id", request.id)
          .eq("status", "Processing")
          .select("*")
          .single();

        if (error) throw error;
        setRequest(data);
        navigate("/laboratory");
      }
    } catch (error) {
      console.error("Laboratory workflow error:", error);
      setErrorMessage(error?.message || "Unable to update laboratory request.");
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // BACK
  // =========================================================

  const handleBack = () => {
    navigate("/laboratory");
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="page-center">
        <div className="loader" />
        <p>
          Loading laboratory request...
        </p>

        <style>{`
          .page-center {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: #f6f9fb;
            color: #667085;
            font-family: Inter, Arial, sans-serif;
          }

          .loader {
            width: 45px;
            height: 45px;
            border: 4px solid #e5f2f3;
            border-top-color: #087f8c;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 14px;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  // =========================================================
  // NO REQUEST
  // =========================================================

  if (!request) {
    return (
      <div className="page-center">
        <div className="error-box">
          <div className="error-icon">
            !
          </div>

          <h2>
            Laboratory Request Not Found
          </h2>

          <p>
            {errorMessage ||
              "No laboratory request was selected."}
          </p>

          <button
            type="button"
            onClick={handleBack}
          >
            ← Back to Laboratory
          </button>
        </div>

        <style>{`
          .page-center {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #f6f9fb;
            font-family: Inter, Arial, sans-serif;
          }

          .error-box {
            width: min(500px, 90%);
            background: white;
            border: 1px solid #e4e9ee;
            border-radius: 15px;
            padding: 35px;
            text-align: center;
          }

          .error-icon {
            width: 50px;
            height: 50px;
            margin: 0 auto 15px;
            border-radius: 12px;
            background: #fff1f1;
            color: #d64545;
            display: flex;
            justify-content: center;
            align-items: center;
            font-weight: 800;
          }

          .error-box h2 {
            margin: 0 0 8px;
            color: #344054;
          }

          .error-box p {
            color: #98a2b3;
            font-size: 13px;
            line-height: 1.5;
          }

          .error-box button {
            margin-top: 12px;
            border: none;
            background: #087f8c;
            color: white;
            border-radius: 8px;
            padding: 11px 18px;
            cursor: pointer;
            font-weight: 700;
          }
        `}</style>
      </div>
    );
  }

  const status = getStatus(
    request.status
  );

  const patientName =
    getPatientName(patient);

  const patientId =
    getPatientId(patient);

  const requestNumber =
    `LAB-${String(
      request.id
    ).padStart(6, "0")}`;

  const isCompleted = request.status === "Completed";
  const isPending = request.status === "Pending";
  const isProcessing = request.status === "Processing";

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="process-page">

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
        input,
        textarea {
          font-family: inherit;
        }

        .process-page {
          min-height: 100vh;
          background: #f6f9fb;
        }

        /* =========================================
           TOP BAR
        ========================================= */

        .topbar {
          min-height: 72px;
          background: #ffffff;
          border-bottom: 1px solid #e5ebef;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 38px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .logo {
          width: 145px;
          max-height: 55px;
          object-fit: contain;
        }

        .divider {
          width: 1px;
          height: 27px;
          background: #e3e8ec;
        }

        .portal {
          color: #667085;
          font-size: 11px;
          font-weight: 650;
        }

        .back-button {
          border: 1px solid #dfe6eb;
          background: white;
          color: #536173;
          border-radius: 8px;
          padding: 9px 14px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 700;
        }

        .back-button:hover {
          background: #f7fafb;
        }

        /* =========================================
           CONTENT
        ========================================= */

        .content {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 30px 0 45px;
        }

        .breadcrumb {
          color: #98a2b3;
          font-size: 10px;
          margin-bottom: 8px;
        }

        .breadcrumb span {
          color: #087f8c;
          font-weight: 700;
        }

        .title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 20px;
        }

        .title {
          margin: 0;
          font-size: 27px;
          color: #172033;
          font-weight: 750;
          letter-spacing: -0.6px;
        }

        .subtitle {
          margin: 7px 0 0;
          color: #7c8797;
          font-size: 12px;
        }

        .request-badge {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 7px;
        }

        .request-number {
          color: #087f8c;
          font-size: 11px;
          font-weight: 750;
        }

        .status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 20px;
          font-size: 9px;
          font-weight: 750;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .pending {
          background: #fff6e7;
          color: #c77a00;
        }

        .accepted {
          background: #edf5ff;
          color: #0b5cab;
        }

        .collecting {
          background: #f3efff;
          color: #7357d9;
        }

        .processing {
          background: #eef1ff;
          color: #6654c7;
        }

        .transit {
          background: #eaf8fc;
          color: #087fa9;
        }

        .completed,
        .delivered {
          background: #eaf9f1;
          color: #087f4f;
        }

        /* =========================================
           PATIENT CARD
        ========================================= */

        .patient-card {
          background: white;
          border: 1px solid #e4e9ee;
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 18px;
          display: grid;
          grid-template-columns: auto 1fr repeat(4, minmax(120px, 1fr));
          align-items: center;
          gap: 18px;
        }

        .patient-avatar {
          width: 54px;
          height: 54px;
          border-radius: 13px;
          background: #e9f7f8;
          color: #087f8c;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          font-weight: 800;
        }

        .patient-main h2 {
          margin: 0;
          color: #344054;
          font-size: 14px;
        }

        .patient-main p {
          margin: 4px 0 0;
          color: #98a2b3;
          font-size: 9px;
        }

        .patient-info {
          min-width: 0;
        }

        .patient-info-label {
          margin: 0 0 5px;
          color: #98a2b3;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          font-weight: 750;
        }

        .patient-info-value {
          margin: 0;
          color: #475467;
          font-size: 10px;
          font-weight: 650;
          word-break: break-word;
        }

        /* =========================================
           ERROR
        ========================================= */

        .error-banner {
          background: #fff4f4;
          border: 1px solid #ffd4d4;
          color: #b42318;
          border-radius: 10px;
          padding: 12px 15px;
          margin-bottom: 18px;
          font-size: 10px;
        }

        /* =========================================
           MAIN CARD
        ========================================= */

        .card {
          background: white;
          border: 1px solid #e4e9ee;
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 18px;
        }

        .card-header {
          padding: 19px 22px;
          border-bottom: 1px solid #edf1f4;
        }

        .card-header h2 {
          margin: 0;
          color: #172033;
          font-size: 15px;
        }

        .card-header p {
          margin: 5px 0 0;
          color: #98a2b3;
          font-size: 9px;
        }

        .card-body {
          padding: 22px;
        }

        /* =========================================
           TEST
        ========================================= */

        .test-section {
          border: 1px solid #e5ebef;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .test-section:last-child {
          margin-bottom: 0;
        }

        .test-header {
          padding: 15px 17px;
          background: #f8fafc;
          border-bottom: 1px solid #edf1f4;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .test-header h3 {
          margin: 0;
          color: #344054;
          font-size: 12px;
          font-weight: 750;
        }

        .sample-badge {
          padding: 5px 8px;
          border-radius: 6px;
          background: #e9f7f8;
          color: #087f8c;
          font-size: 8px;
          font-weight: 700;
        }

        .parameter-table {
          width: 100%;
          border-collapse: collapse;
        }

        .parameter-table th {
          padding: 10px 14px;
          background: #fcfdfd;
          border-bottom: 1px solid #edf1f4;
          text-align: left;
          color: #98a2b3;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .parameter-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #f0f2f5;
          color: #475467;
          font-size: 10px;
        }

        .parameter-table tr:last-child td {
          border-bottom: none;
        }

        .parameter-name {
          color: #344054;
          font-weight: 700;
        }

        .reference {
          color: #667085;
          font-size: 9px;
        }

        .result-input {
          width: 100%;
          height: 36px;
          border: 1px solid #dfe5ea;
          border-radius: 7px;
          background: #fbfcfd;
          padding: 0 10px;
          outline: none;
          color: #344054;
          font-size: 10px;
        }

        .result-input:disabled,
        .notes:disabled {
          background: #f4f6f8;
          color: #667085;
          cursor: not-allowed;
        }

        .result-input:focus {
          border-color: #087f8c;
          background: white;
          box-shadow: 0 0 0 3px rgba(8,127,140,0.08);
        }

        .unit {
          color: #98a2b3;
          font-size: 9px;
        }

        .flag {
          display: inline-flex;
          padding: 5px 8px;
          border-radius: 6px;
          font-size: 8px;
          font-weight: 750;
        }

        .flag-normal {
          background: #eaf9f1;
          color: #087f4f;
        }

        .flag-low {
          background: #edf5ff;
          color: #0b5cab;
        }

        .flag-high {
          background: #fff0ed;
          color: #c2412d;
        }

        /* =========================================
           NO PARAMETERS
        ========================================= */

        .no-parameters {
          padding: 22px;
          color: #98a2b3;
          font-size: 9px;
          text-align: center;
        }

        /* =========================================
           NOTES
        ========================================= */

        .notes {
          width: 100%;
          min-height: 110px;
          resize: vertical;
          border: 1px solid #dfe5ea;
          border-radius: 9px;
          background: #fbfcfd;
          padding: 12px;
          outline: none;
          color: #344054;
          font-size: 10px;
          line-height: 1.5;
        }

        .notes:focus {
          border-color: #087f8c;
          background: white;
          box-shadow: 0 0 0 3px rgba(8,127,140,0.08);
        }

        /* =========================================
           FOOTER
        ========================================= */

        .actions {
          background: white;
          border: 1px solid #e4e9ee;
          border-radius: 14px;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .action-note {
          color: #98a2b3;
          font-size: 9px;
        }

        .action-buttons {
          display: flex;
          gap: 9px;
        }

        .cancel-button,
        .complete-button {
          min-height: 39px;
          border-radius: 8px;
          padding: 0 17px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 700;
        }

        .cancel-button {
          border: 1px solid #dfe5ea;
          background: white;
          color: #667085;
        }

        .complete-button {
          border: none;
          background: linear-gradient(
            100deg,
            #075d87,
            #087f8c
          );
          color: white;
          box-shadow: 0 5px 12px rgba(8,127,140,0.14);
        }

        .complete-button:hover {
          transform: translateY(-1px);
        }

        .complete-button:disabled {
          opacity: 0.65;
          cursor: wait;
          transform: none;
        }

        /* =========================================
           MOBILE
        ========================================= */

        @media (max-width: 900px) {

          .patient-card {
            grid-template-columns: auto 1fr;
          }

          .patient-info {
            padding-top: 4px;
          }

        }

        @media (max-width: 650px) {

          .topbar {
            padding: 10px 15px;
          }

          .logo {
            width: 120px;
          }

          .divider,
          .portal {
            display: none;
          }

          .content {
            width: calc(100% - 24px);
            padding-top: 22px;
          }

          .title-row {
            flex-direction: column;
          }

          .request-badge {
            align-items: flex-start;
          }

          .patient-card {
            grid-template-columns: 1fr 1fr;
          }

          .patient-avatar,
          .patient-main {
            grid-column: 1 / -1;
          }

          .parameter-table {
            min-width: 700px;
          }

          .card-body {
            overflow-x: auto;
          }

          .actions {
            flex-direction: column;
            align-items: stretch;
          }

          .action-buttons {
            width: 100%;
          }

          .cancel-button,
          .complete-button {
            flex: 1;
          }

        }

      `}</style>

      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <header className="topbar">

        <div className="brand">

          <img
            src="/samplogy-logo.png"
            alt="Samplogy Sample Delivery"
            className="logo"
          />

          <div className="divider" />

          <span className="portal">
            Laboratory Portal
          </span>

        </div>

        <button
          type="button"
          className="back-button"
          onClick={handleBack}
        >
          ← Back to Dashboard
        </button>

      </header>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <main className="content">

        <div className="breadcrumb">
          Samplogy / Laboratory Portal /{" "}
          <span>
            Process Request
          </span>
        </div>

        {/* TITLE */}

        <div className="title-row">

          <div>

            <h1 className="title">
              {isCompleted ? "Completed Laboratory Request" : isPending ? "Review Laboratory Request" : "Process Laboratory Request"}
            </h1>

            <p className="subtitle">
              {isCompleted ? "Review the finalized laboratory results." : isPending ? "Review the request and start laboratory processing." : "Enter laboratory results and complete the request."}
            </p>

          </div>

          <div className="request-badge">

            <div className="request-number">
              {requestNumber}
            </div>

            <div
              className={`status ${status.className}`}
            >
              <span className="status-dot" />
              {status.label}
            </div>

          </div>

        </div>

        {/* ERROR */}

        {errorMessage && (
          <div className="error-banner">
            {errorMessage}
          </div>
        )}

        {/* =====================================================
            PATIENT INFORMATION
        ===================================================== */}

        <section className="patient-card">

          <div className="patient-avatar">
            {patientName
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="patient-main">

            <h2>
              {patientName}
            </h2>

            <p>
              Patient information
            </p>

          </div>

          <div className="patient-info">

            <p className="patient-info-label">
              Patient ID
            </p>

            <p className="patient-info-value">
              {patientId}
            </p>

          </div>

          <div className="patient-info">

            <p className="patient-info-label">
              Sex
            </p>

            <p className="patient-info-value">
              {safeString(
                patient?.gender ||
                  patient?.sex,
                "-"
              )}
            </p>

          </div>

          <div className="patient-info">

            <p className="patient-info-label">
              Phone
            </p>

            <p className="patient-info-value">
              {safeString(
                patient?.phone,
                "-"
              )}
            </p>

          </div>

          <div className="patient-info">

            <p className="patient-info-label">
              Facility
            </p>

            <p className="patient-info-value">
              {safeString(
                patient?.facility ||
                  patient?.health_facility,
                "-"
              )}
            </p>

          </div>

        </section>

        {/* =====================================================
            TEST RESULTS
        ===================================================== */}

        <section className="card">

          <div className="card-header">

            <h2>
              Laboratory Tests
            </h2>

            <p>
              {isCompleted ? "Final laboratory results for this request." : "Enter the result for each requested laboratory parameter."}
            </p>

          </div>

          <div className="card-body">

            {tests.length === 0 ? (

              <div className="no-parameters">
                No laboratory tests were found
                for this request.
              </div>

            ) : (

              tests.map(
                (test) => (

                  <div
                    className="test-section"
                    key={test.id}
                  >

                    {/* TEST HEADER */}

                    <div className="test-header">

                      <h3>
                        {safeString(
                          test.name,
                          "Laboratory Test"
                        )}
                      </h3>

                      {safeString(test.sample) && (
                        <span className="sample-badge">
                          Sample:{" "}
                          {safeString(test.sample)}
                        </span>
                      )}

                    </div>

                    {/* PARAMETERS */}

                    {test.parameters.length ===
                    0 ? (

                      <div className="no-parameters">
                        Enter the laboratory result
                        for this test.
                      </div>

                    ) : (

                      <div
                        style={{
                          overflowX:
                            "auto",
                        }}
                      >

                        <table className="parameter-table">

                          <thead>

                            <tr>

                              <th>
                                Parameter
                              </th>

                              <th>
                                Result
                              </th>

                              <th>
                                Unit
                              </th>



                            </tr>

                          </thead>

                          <tbody>

                            {test.parameters.map(
                              (
                                parameter,
                                parameterIndex
                              ) => {

                                /*
                                 * Parameter can also
                                 * potentially be an object.
                                 */

                                const safeParameter =
                                  parameter &&
                                  typeof parameter ===
                                    "object"
                                    ? parameter
                                    : {
                                        key: `parameter-${parameterIndex}`,
                                        label:
                                          safeString(
                                            parameter,
                                            "Result"
                                          ),
                                        unit: "",
                                        reference:
                                          "",
                                      };

                                const parameterKey =
                                  safeString(
                                    safeParameter.key,
                                    safeString(
                                      safeParameter.value,
                                      `parameter-${parameterIndex}`
                                    )
                                  );

                                const parameterLabel =
                                  safeString(
                                    safeParameter.label,
                                    safeString(
                                      safeParameter.name,
                                      parameterKey
                                    )
                                  );

                                const unit =
                                  safeString(
                                    safeParameter.unit,
                                    ""
                                  );

                                const value =
                                  getResultValue(
                                    test.key,
                                    parameterKey
                                  );

                                return (

                                  <tr
                                    key={`${test.id}-${parameterKey}-${parameterIndex}`}
                                  >

                                    <td>

                                      <span className="parameter-name">
                                        {parameterLabel}
                                      </span>

                                    </td>

                                    <td
                                      style={{
                                        minWidth:
                                          "180px",
                                      }}
                                    >

                                      <input
                                        className="result-input"
                                        type="text"
                                        value={
                                          value
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          handleResultChange(
                                            test.key,
                                            parameterKey,
                                            event
                                              .target
                                              .value
                                          )
                                        }
                                        placeholder="Enter result"
                                      />

                                    </td>

                                    <td>

                                      <span className="unit">
                                        {unit ||
                                          "-"}
                                      </span>

                                    </td>





                                  </tr>

                                );
                              }
                            )}

                          </tbody>

                        </table>

                      </div>

                    )}

                  </div>

                )
              )

            )}

          </div>

        </section>

        {/* =====================================================
            NOTES
        ===================================================== */}

        <section className="card">

          <div className="card-header">

            <h2>
              Laboratory Notes
            </h2>

            <p>
              Add any relevant observations or
              comments about the laboratory work.
            </p>

          </div>

          <div className="card-body">

            <textarea
              className="notes"
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value
                )
              }
              placeholder="Enter laboratory notes or observations..."
              disabled={isCompleted}
            />

          </div>

        </section>

        {/* =====================================================
            ACTIONS
        ===================================================== */}

        <div className="actions">

          <span className="action-note">
            Make sure all required laboratory
            results have been entered before
            completing this request.
          </span>

          <div className="action-buttons">

            <button
              type="button"
              className="cancel-button"
              onClick={handleBack}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="complete-button"
              onClick={handleWorkflowAction}
              disabled={
                saving ||
                tests.length === 0
              }
            >
              {saving
                ? "Saving Results..."
                : "Complete Laboratory Request →"}
            </button>

          </div>

        </div>

      </main>

    </div>
  );
}

export default LaboratoryProcessRequest;
