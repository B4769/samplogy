import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

/* =========================================================
   TEST NAME MAP
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

/* =========================================================
   CBC PARAMETER NAMES
========================================================= */

const CBC_PARAMETER_NAMES = {
  wbc: "White Blood Cells (WBC)",
  rbc: "Red Blood Cells (RBC)",
  hemoglobin: "Hemoglobin",
  hematocrit: "Hematocrit",
  mcv: "Mean Corpuscular Volume (MCV)",
  mch: "Mean Corpuscular Hemoglobin (MCH)",
  mchc: "Mean Corpuscular Hemoglobin Concentration (MCHC)",
  rdw: "Red Cell Distribution Width (RDW)",
  platelets: "Platelets",
  neutrophils: "Neutrophils",
  lymphocytes: "Lymphocytes",
  monocytes: "Monocytes",
  eosinophils: "Eosinophils",
  basophils: "Basophils",
};

/* =========================================================
   FORMAT LABEL
========================================================= */

function formatLabel(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  return String(value)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

/* =========================================================
   SAFE STRING
========================================================= */

function safeString(value, fallback = "-") {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
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
    // Handle result objects such as { all: "Normal" }.
    if (Object.prototype.hasOwnProperty.call(value, "all")) {
      return safeString(value.all, fallback);
    }

    const direct =
      value.value ??
      value.result ??
      value.result_value ??
      value.resultValue ??
      value.label ??
      value.name ??
      value.text ??
      value.display ??
      value.displayName;

    if (
      direct !== null &&
      direct !== undefined &&
      direct !== ""
    ) {
      return safeString(direct, fallback);
    }

    const entries = Object.entries(value)
      .filter(
        ([, item]) =>
          item !== null &&
          item !== undefined &&
          item !== ""
      )
      .map(
        ([key, item]) =>
          `${formatLabel(key)}: ${safeString(
            item
          )}`
      );

    return entries.length > 0
      ? entries.join(" • ")
      : fallback;
  }

  return fallback;
}

/* =========================================================
   GET PATIENT VALUE
========================================================= */

function getPatientValue(patient, ...keys) {
  if (!patient) {
    return "-";
  }

  for (const key of keys) {
    const value = patient[key];

    if (
      value !== null &&
      value !== undefined &&
      value !== ""
    ) {
      return safeString(value);
    }
  }

  return "-";
}

/* =========================================================
   GET TEST KEY
========================================================= */

function getTestKey(test) {
  if (
    test === null ||
    test === undefined
  ) {
    return "";
  }

  if (typeof test === "string") {
    return test;
  }

  if (typeof test === "number") {
    return String(test);
  }

  if (typeof test === "object") {
    return (
      test.value ??
      test.code ??
      test.type ??
      test.test_value ??
      test.test_name ??
      test.testName ??
      test.key ??
      ""
    );
  }

  return "";
}

/* =========================================================
   GET TEST NAME
========================================================= */

function getTestName(test) {
  if (
    test === null ||
    test === undefined
  ) {
    return "Laboratory Test";
  }

  if (typeof test === "string") {
    const key = test.toLowerCase();

    return (
      TEST_NAMES[key] ||
      formatLabel(test)
    );
  }

  if (typeof test === "number") {
    return String(test);
  }

  if (typeof test === "object") {
    const raw =
      test.label ??
      test.name ??
      test.test_name ??
      test.testName ??
      test.value ??
      test.code ??
      test.type;

    if (
      raw !== null &&
      raw !== undefined
    ) {
      const key =
        String(raw).toLowerCase();

      return (
        TEST_NAMES[key] ||
        formatLabel(raw)
      );
    }
  }

  return "Laboratory Test";
}

/* =========================================================
   GET TESTS
========================================================= */

function getTests(request) {
  if (!request) {
    return [];
  }

  const tests = request.tests;

  if (Array.isArray(tests)) {
    return tests;
  }

  if (typeof tests === "string") {
    try {
      const parsed = JSON.parse(tests);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (
        parsed &&
        typeof parsed === "object"
      ) {
        return [parsed];
      }

      if (typeof parsed === "string") {
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
    typeof tests === "object"
  ) {
    return [tests];
  }

  return [];
}

/* =========================================================
   GET RESULTS
========================================================= */

function getResults(request) {
  if (!request) {
    return {};
  }

  const results = request.results;

  if (!results) {
    return {};
  }

  if (typeof results === "string") {
    try {
      const parsed =
        JSON.parse(results);

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        return parsed;
      }

      return {};
    } catch {
      return {};
    }
  }

  if (
    typeof results === "object" &&
    !Array.isArray(results)
  ) {
    return results;
  }

  return {};
}

/* =========================================================
   GET PARAMETER KEY
========================================================= */

function getParameterKey(parameter) {
  if (
    parameter === null ||
    parameter === undefined
  ) {
    return "";
  }

  if (typeof parameter === "string") {
    return parameter;
  }

  if (typeof parameter === "number") {
    return String(parameter);
  }

  if (typeof parameter === "object") {
    return (
      parameter.value ??
      parameter.key ??
      parameter.code ??
      parameter.name ??
      parameter.label ??
      parameter.parameter ??
      parameter.parameterKey ??
      ""
    );
  }

  return "";
}

/* =========================================================
   GET PARAMETER NAME
========================================================= */

function getParameterName(
  parameter,
  testKey
) {
  if (
    parameter === null ||
    parameter === undefined
  ) {
    return "Parameter";
  }

  if (typeof parameter === "string") {
    const key =
      parameter.toLowerCase();

    if (
      testKey === "cbc" &&
      CBC_PARAMETER_NAMES[key]
    ) {
      return CBC_PARAMETER_NAMES[key];
    }

    return formatLabel(parameter);
  }

  if (typeof parameter === "number") {
    return String(parameter);
  }

  if (typeof parameter === "object") {
    const raw =
      parameter.label ??
      parameter.name ??
      parameter.parameterName ??
      parameter.parameter_name ??
      parameter.value ??
      parameter.key ??
      parameter.code ??
      parameter.parameter;

    if (
      raw !== null &&
      raw !== undefined
    ) {
      const key =
        String(raw).toLowerCase();

      if (
        testKey === "cbc" &&
        CBC_PARAMETER_NAMES[key]
      ) {
        return CBC_PARAMETER_NAMES[key];
      }

      return formatLabel(raw);
    }
  }

  return "Parameter";
}

/* =========================================================
   GET PARAMETER UNIT
========================================================= */

function getParameterUnit(
  parameter
) {
  if (
    parameter &&
    typeof parameter === "object"
  ) {
    return (
      parameter.unit ??
      parameter.units ??
      ""
    );
  }

  return "";
}

/* =========================================================
   GET PARAMETER REFERENCE
========================================================= */

function getParameterReference(
  parameter
) {
  if (
    parameter &&
    typeof parameter === "object"
  ) {
    return (
      parameter.reference ??
      parameter.reference_range ??
      parameter.referenceRange ??
      parameter.normalRange ??
      parameter.normal_range ??
      ""
    );
  }

  return "";
}

/* =========================================================
   RESULT LOOKUP
========================================================= */

function lookupResult(
  results,
  test,
  parameter
) {
  if (!results) {
    return null;
  }

  const testKey =
    String(getTestKey(test))
      .trim()
      .toLowerCase();

  const parameterKey =
    String(
      getParameterKey(parameter)
    )
      .trim()
      .toLowerCase();

  /*
    IMPORTANT:

    Your database stores results like:

    cbc.hemoglobin
    cbc.wbc
    cbc.rbc
    glucose.glucose-value

    Therefore we first search using:

    testKey.parameterKey
  */

  const possibleKeys = [];

  if (
    testKey &&
    parameterKey
  ) {
    possibleKeys.push(
      `${testKey}.${parameterKey}`
    );
  }

  /*
    Also support:

    testKey_parameterKey
    testKey/parameterKey
  */

  if (
    testKey &&
    parameterKey
  ) {
    possibleKeys.push(
      `${testKey}_${parameterKey}`
    );

    possibleKeys.push(
      `${testKey}/${parameterKey}`
    );
  }

  /*
    Exact parameter key.
  */

  if (parameterKey) {
    possibleKeys.push(
      parameterKey
    );
  }

  /*
    Search case-insensitively.
  */

  const resultKeys =
    Object.keys(results);

  for (const possibleKey of possibleKeys) {
    const matchingKey =
      resultKeys.find(
        (key) =>
          key.toLowerCase() ===
          possibleKey
      );

    if (matchingKey) {
      return results[matchingKey];
    }
  }

  /*
    Support nested:

    {
      cbc: {
        hemoglobin: "10"
      }
    }

    or:

    {
      glucose: {
        "glucose-value": "7"
      }
    }
  */

  const nestedTestKey =
    resultKeys.find(
      (key) =>
        key.toLowerCase() ===
        testKey
    );

  if (nestedTestKey) {
    const nested =
      results[nestedTestKey];

    if (
      nested &&
      typeof nested === "object" &&
      !Array.isArray(nested)
    ) {
      const nestedKeys =
        Object.keys(nested);

      const nestedParameterKey =
        nestedKeys.find(
          (key) =>
            key.toLowerCase() ===
            parameterKey
        );

      if (nestedParameterKey) {
        return nested[
          nestedParameterKey
        ];
      }
    }
  }

  return null;
}

/* =========================================================
   FORMAT RESULT VALUE
========================================================= */

function formatResultValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "No result recorded";
  }

  // String / number
  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  // Boolean
  if (typeof value === "boolean") {
    return value ? "Positive" : "Negative";
  }

  // Array
  if (Array.isArray(value)) {
    return value
      .map((item) => formatResultValue(item))
      .filter(
        (item) =>
          item !== "No result recorded"
      )
      .join(", ");
  }

  // Object
  if (typeof value === "object") {
    /*
      Handle objects such as:

      {
        all: "Normal"
      }

      or

      {
        all: {
          value: "Normal"
        }
      }
    */

    if (
      Object.prototype.hasOwnProperty.call(
        value,
        "all"
      )
    ) {
      return formatResultValue(
        value.all
      );
    }

    /*
      Common result-value properties
    */

    const directValue =
      value.value ??
      value.result ??
      value.result_value ??
      value.resultValue ??
      value.text ??
      value.label ??
      value.display ??
      value.displayValue;

    if (
      directValue !== null &&
      directValue !== undefined &&
      directValue !== ""
    ) {
      return formatResultValue(
        directValue
      );
    }

    /*
      If the object has multiple properties,
      convert everything to readable text.
    */

    const entries = Object.entries(
      value
    );

    if (entries.length > 0) {
      return entries
        .map(([key, item]) => {
          const formatted =
            formatResultValue(item);

          return `${formatLabel(
            key
          )}: ${formatted}`;
        })
        .join(" • ");
    }
  }

  return String(value);
}
/* =========================================================
   GET RESULT RECORDS
========================================================= */

function buildResultRecords(
  tests,
  results
) {
  const records = [];

  tests.forEach((test) => {
    const testKey =
      getTestKey(test);

    const testName =
      getTestName(test);

    /*
      The request contains parameters.

      CBC example:

      parameters: [
        { value: "wbc", ... },
        { value: "rbc", ... },
        ...
      ]
    */

    let parameters = [];

    if (
      test &&
      typeof test === "object" &&
      Array.isArray(test.parameters)
    ) {
      parameters =
        test.parameters;
    }

    /*
      If parameters are missing but this is CBC,
      build them from the actual saved result keys.
    */

    if (
      parameters.length === 0 &&
      String(testKey).toLowerCase() ===
        "cbc"
    ) {
      const cbcKeys =
        Object.keys(results)
          .filter((key) =>
            key
              .toLowerCase()
              .startsWith("cbc.")
          )
          .map((key) =>
            key.substring(4)
          );

      parameters =
        cbcKeys.map((key) => ({
          value: key,
          label:
            CBC_PARAMETER_NAMES[key] ||
            formatLabel(key),
        }));
    }

    /*
      If the test has parameters,
      render EVERY parameter.
    */

    if (parameters.length > 0) {
      parameters.forEach(
        (parameter) => {
          const value =
            lookupResult(
              results,
              test,
              parameter
            );

          records.push({
            test,
            testKey,
            testName,
            parameter,
            parameterKey:
              getParameterKey(
                parameter
              ),
            parameterName:
              getParameterName(
                parameter,
                String(testKey)
                  .toLowerCase()
              ),
            value,
            unit:
              getParameterUnit(
                parameter
              ),
            reference:
              getParameterReference(
                parameter
              ),
          });
        }
      );

      return;
    }

    /*
      Test without parameters.

      Try the test itself.
    */

    let value = null;

    const possibleTestKeys =
      Object.keys(results);

    const exactTestKey =
      possibleTestKeys.find(
        (key) =>
          key.toLowerCase() ===
          String(testKey)
            .toLowerCase()
      );

    if (exactTestKey) {
      value =
        results[exactTestKey];
    }

    /*
      For tests like glucose,
      search any result key beginning with:

      glucose.
    */

    if (
      value === null ||
      value === undefined
    ) {
      const matchingKey =
        possibleTestKeys.find(
          (key) =>
            key
              .toLowerCase()
              .startsWith(
                `${String(
                  testKey
                ).toLowerCase()}.`
              )
        );

      if (matchingKey) {
        value =
          results[matchingKey];
      }
    }

    records.push({
      test,
      testKey,
      testName,
      parameter: null,
      parameterKey: "",
      parameterName: "",
      value,
      unit: "",
      reference: "",
    });
  });

  return records;
}

/* =========================================================
   DATE
========================================================= */

function formatDate(value) {
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
    return safeString(
      value,
      "-"
    );
  }

  return date.toLocaleString(
    "en-US",
    {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

function LaboratoryResults() {
  const location =
    useLocation();

  const navigate =
    useNavigate();

  const passedRequest =
    location.state?.request || null;

  const passedRequestId =
    passedRequest?.id ?? null;

  /*
    Start with the request passed from the
    Nurse Dashboard.

    This means the page can display immediately
    instead of starting with an empty screen.
  */

  const [request, setRequest] =
    useState(() => passedRequest);

  const [loading, setLoading] =
    useState(() => !passedRequest);

  const [, setError] =
    useState("");

  /* =======================================================
     LOAD LATEST REQUEST
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const requestId =
      passedRequestId;

    /*
      If we already have no request ID,
      there is nothing to fetch.
    */

    if (!requestId) {
      return () => {
        cancelled = true;
      };
    }

    async function loadRequest() {
      try {
        const {
          data,
          error: requestError,
        } = await supabase
          .from("laboratory_requests")
          .select("*")
          .eq("id", requestId)
          .single();

        if (requestError) {
          throw requestError;
        }

        if (cancelled) {
          return;
        }

        /*
          Load patient separately.
        */

        let patient =
          passedRequest?.patient ||
          null;

        if (data?.patient_id) {
          const {
            data: patientData,
            error: patientError,
          } = await supabase
            .from("patients")
            .select("*")
            .eq(
              "id",
              data.patient_id
            )
            .single();

          if (patientError) {
            console.error(
              "PATIENT LOAD ERROR:",
              patientError
            );
          } else {
            patient =
              patientData;
          }
        }

        if (cancelled) {
          return;
        }

        const completeRequest = {
          ...data,
          patient,
        };

        setRequest(
          completeRequest
        );

        setError("");

        setLoading(false);

        /*
          DEBUG
        */

        console.log(
          "FINAL REQUEST:",
          completeRequest
        );

        console.log(
          "FINAL RESULTS:",
          completeRequest.results
        );

        console.log(
          "FINAL RESULT KEYS:",
          completeRequest.results
            ? Object.keys(
                completeRequest.results
              )
            : []
        );

        console.log(
          "FINAL TESTS:",
          completeRequest.tests
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "LABORATORY RESULTS LOAD ERROR:",
          err
        );

        /*
          If the passed request already exists,
          keep showing it instead of destroying
          the page.
        */

        if (passedRequest) {
          setRequest(
            passedRequest
          );

          setError("");

          setLoading(false);
        } else {
          setError(
            err?.message ||
              "Unable to load laboratory results."
          );

          setLoading(false);
        }
      }
    }

    loadRequest();

    return () => {
      cancelled = true;
    };
  }, [passedRequestId, passedRequest]);

  /* =======================================================
     RESULTS DATA
  ======================================================= */

  const patient =
    request?.patient || {};

  const tests =
    useMemo(
      () => getTests(request),
      [request]
    );

  const results =
    useMemo(
      () => getResults(request),
      [request]
    );

  const resultRecords =
    useMemo(
      () =>
        buildResultRecords(
          tests,
          results
        ),
      [tests, results]
    );

  const requestDate =
    request?.requestDate ||
    request?.request_date ||
    request?.created_at;

  const completedDate =
    request?.completedDate ||
    request?.completed_date ||
    request?.completed_at;

  const requestReference =
    request?.reference ||
    request?.request_reference ||
    `LAB-${String(
      request?.id ?? ""
    ).padStart(6, "0")}`;

  const hasAnyResults =
    resultRecords.some(
      (record) =>
        record.value !== null &&
        record.value !== undefined &&
        record.value !== ""
    );

  /* =======================================================
     NO REQUEST
  ======================================================= */

  if (loading && !request) {
    return (
      <div style={styles.page}>
        <div
          style={styles.loadingCard}
        >
          <div
            style={styles.spinner}
          />

          <h2
            style={
              styles.loadingTitle
            }
          >
            Loading Laboratory Results
          </h2>

          <p
            style={
              styles.loadingText
            }
          >
            Please wait while the laboratory
            results are loaded.
          </p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div style={styles.page}>
        <div
          style={styles.emptyCard}
        >
          <div
            style={styles.emptyIcon}
          >
            🧪
          </div>

          <h1
            style={styles.emptyTitle}
          >
            Laboratory Results
          </h1>

          <p
            style={styles.emptyText}
          >
            No laboratory request was
            selected.
          </p>

          <button
            style={
              styles.primaryButton
            }
            onClick={() =>
              navigate("/nurse")
            }
          >
            ← Back to Nurse Dashboard
          </button>
        </div>
      </div>
    );
  }

  /* =======================================================
     MAIN
  ======================================================= */

  return (
    <div
      className="results-page"
      style={styles.page}
    >
      <style>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f5f7fb;
        }

        @media print {

          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .results-page {
            padding: 0 !important;
          }

          .result-card {
            box-shadow: none !important;
            break-inside: avoid;
          }
        }

        @media (max-width: 800px) {

          .patient-grid {
            grid-template-columns: 1fr !important;
          }

          .header-responsive {
            flex-direction: column !important;
          }

          .header-actions {
            width: 100% !important;
          }

          .header-actions button {
            flex: 1;
          }

          .result-header {
            grid-template-columns: 1fr !important;
          }

        }

        @media (max-width: 550px) {

          .results-page {
            padding: 18px !important;
          }

          .status-banner {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .result-actions {
            flex-direction: column !important;
          }

          .result-actions button {
            width: 100% !important;
          }

        }

      `}</style>

      {/* =================================================
          HEADER
      ================================================= */}

      <header
        className="header-responsive"
        style={styles.header}
      >
        <div>
          <div
            style={
              styles.headerLabel
            }
          >
            SAMPLOGY · LABORATORY
            MANAGEMENT
          </div>

          <h1
            style={styles.title}
          >
            Laboratory Results
          </h1>

          <p
            style={styles.subtitle}
          >
            Review completed laboratory
            test results for this patient.
          </p>
        </div>

        <div
          className="header-actions no-print"
          style={styles.headerActions}
        >
          <button
            type="button"
            style={
              styles.secondaryButton
            }
            onClick={() =>
              navigate("/nurse")
            }
          >
            ← Back
          </button>

          <button
            type="button"
            style={
              styles.printButton
            }
            onClick={() =>
              window.print()
            }
          >
            🖨 Print Results
          </button>
        </div>
      </header>

      {/* =================================================
          STATUS
      ================================================= */}

      <div
        className="status-banner"
        style={styles.statusBanner}
      >
        <div
          style={styles.statusLeft}
        >
          <div
            style={styles.statusIcon}
          >
            ✓
          </div>

          <div>
            <div
              style={styles.statusTitle}
            >
              Laboratory Request
              Completed
            </div>

            <div
              style={
                styles.statusDescription
              }
            >
              Reference:{" "}
              <strong>
                {requestReference}
              </strong>
            </div>
          </div>
        </div>

        <div
          style={
            styles.completedBadge
          }
        >
          ●{" "}
          {request.status ||
            "Completed"}
        </div>
      </div>

      {/* =================================================
          PATIENT INFORMATION
      ================================================= */}

      <section
        className="result-card"
        style={styles.card}
      >
        <div
          style={styles.cardHeader}
        >
          <div>
            <h2
              style={
                styles.cardTitle
              }
            >
              Patient Information
            </h2>

            <p
              style={
                styles.cardSubtitle
              }
            >
              Patient details associated
              with this laboratory request.
            </p>
          </div>

          <div
            style={
              styles.patientIcon
            }
          >
            👤
          </div>
        </div>

        <div
          style={styles.divider}
        />

        <div
          className="patient-grid"
          style={styles.infoGrid}
        >
          <InfoItem
            label="Patient ID"
            value={getPatientValue(
              patient,
              "patient_id",
              "patientId",
              "id"
            )}
          />

          <InfoItem
            label="Full Name"
            value={getPatientValue(
              patient,
              "full_name",
              "fullName",
              "name"
            )}
          />

          <InfoItem
            label="Date of Birth"
            value={getPatientValue(
              patient,
              "date_of_birth",
              "dateOfBirth",
              "dob"
            )}
          />

          <InfoItem
            label="Sex"
            value={getPatientValue(
              patient,
              "gender",
              "sex"
            )}
          />

          <InfoItem
            label="Phone Number"
            value={getPatientValue(
              patient,
              "phone",
              "phone_number",
              "phoneNumber"
            )}
          />

          <InfoItem
            label="Region"
            value={getPatientValue(
              patient,
              "region"
            )}
          />

          <InfoItem
            label="City / Town"
            value={getPatientValue(
              patient,
              "city",
              "town"
            )}
          />

          <InfoItem
            label="Health Facility"
            value={getPatientValue(
              patient,
              "facility",
              "health_facility",
              "healthFacility"
            )}
          />
        </div>
      </section>

      {/* =================================================
          LABORATORY RESULTS
      ================================================= */}

      <section
        className="result-card"
        style={styles.card}
      >
        <div
          style={styles.cardHeader}
        >
          <div>
            <h2
              style={
                styles.cardTitle
              }
            >
              Laboratory Results
            </h2>

            <p
              style={
                styles.cardSubtitle
              }
            >
              Results recorded by the
              laboratory staff.
            </p>
          </div>

          <div
            style={styles.testCount}
          >
            {tests.length}{" "}
            {tests.length === 1
              ? "Test"
              : "Tests"}
          </div>
        </div>

        <div
          style={styles.divider}
        />

        {resultRecords.length > 0 ? (
          <div
            style={
              styles.resultsList
            }
          >
            {resultRecords.map(
              (
                record,
                index
              ) => {
                const formatted =
                  formatResultValue(
                    record.value
                  );

                const hasResult =
                  record.value !==
                    null &&
                  record.value !==
                    undefined &&
                  record.value !== "";

                return (
                  <div
                    className="result-header"
                    key={`${record.testKey}-${record.parameterKey}-${index}`}
                    style={
                      styles.resultRow
                    }
                  >
                    {/* NUMBER */}

                    <div
                      style={
                        styles.resultNumber
                      }
                    >
                      {String(
                        index + 1
                      ).padStart(
                        2,
                        "0"
                      )}
                    </div>

                    {/* TEST */}

                    <div
                      style={
                        styles.testInformation
                      }
                    >
                      <div
                        style={
                          styles.testName
                        }
                      >
                        {record.parameterName
                          ? record.parameterName
                          : record.testName}
                      </div>

                      {record.parameterName && (
                        <div
                          style={
                            styles.parentTest
                          }
                        >
                          {record.testName}
                        </div>
                      )}

                      <div
                        style={
                          styles.testCode
                        }
                      >
                        {record.parameterKey
                          ? `Parameter: ${record.parameterKey}`
                          : `Test: ${record.testKey}`}
                      </div>

                      {record.unit && (
                        <div
                          style={
                            styles.unitText
                          }
                        >
                          Unit:{" "}
                          {safeString(record.unit, "")}
                        </div>
                      )}
                    </div>

                    {/* RESULT */}

                    <div
                      style={
                        styles.resultRight
                      }
                    >
                      <div
                        style={
                          styles.resultLabel
                        }
                      >
                        RESULT
                      </div>

                      <div
                        style={{
                          ...styles.resultValue,
                          ...(hasResult
                            ? {}
                            : styles.emptyResult),
                        }}
                      >
                        {formatted}
                      </div>

                      {record.reference && (
                        <div
                          style={
                            styles.reference
                          }
                        >
                          <strong>
                            Reference:
                          </strong>{" "}
                          {safeString(
                            record.reference,
                            ""
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        ) : (
          <div
            style={
              styles.noResults
            }
          >
            No laboratory tests were
            recorded for this request.
          </div>
        )}

        {!hasAnyResults &&
          resultRecords.length > 0 && (
            <div
              style={
                styles.warningBox
              }
            >
              The laboratory tests exist,
              but no result values have
              been recorded yet.
            </div>
          )}
      </section>

      {/* =================================================
          REQUEST INFORMATION
      ================================================= */}

      <section
        className="result-card"
        style={styles.card}
      >
        <div
          style={styles.cardHeader}
        >
          <div>
            <h2
              style={
                styles.cardTitle
              }
            >
              Request Information
            </h2>

            <p
              style={
                styles.cardSubtitle
              }
            >
              Details about this
              laboratory request.
            </p>
          </div>

          <div
            style={
              styles.requestIcon
            }
          >
            📋
          </div>
        </div>

        <div
          style={styles.divider}
        />

        <div
          className="patient-grid"
          style={styles.infoGrid}
        >
          <InfoItem
            label="Reference"
            value={requestReference}
            highlight
          />

          <InfoItem
            label="Database Request ID"
            value={safeString(
              request.id
            )}
          />

          <InfoItem
            label="Request Date"
            value={formatDate(
              requestDate
            )}
          />

          <InfoItem
            label="Completed Date"
            value={formatDate(
              completedDate
            )}
          />

          <InfoItem
            label="Status"
            value={
              request.status ||
              "Completed"
            }
            status
          />

          <InfoItem
            label="Requested By"
            value={safeString(
              request.requested_by ||
                request.requestedBy
            )}
          />
        </div>
      </section>

      {/* =================================================
          LABORATORY NOTES
      ================================================= */}

      <section
        className="result-card"
        style={styles.card}
      >
        <div
          style={styles.cardHeader}
        >
          <div>
            <h2
              style={
                styles.cardTitle
              }
            >
              Laboratory Notes
            </h2>

            <p
              style={
                styles.cardSubtitle
              }
            >
              Additional information
              provided by the laboratory.
            </p>
          </div>

          <div
            style={
              styles.notesIcon
            }
          >
            📝
          </div>
        </div>

        <div
          style={styles.divider}
        />

        <div
          style={styles.notesBox}
        >
          {safeString(
            request.laboratory_notes ??
              request.laboratoryNotes,
            "No laboratory notes were provided."
          )}
        </div>
      </section>

      {/* =================================================
          FOOTER ACTIONS
      ================================================= */}

      <div
        className="no-print result-actions"
        style={
          styles.footerActions
        }
      >
        <button
          type="button"
          style={
            styles.secondaryButton
          }
          onClick={() =>
            navigate("/nurse")
          }
        >
          ← Back to Nurse Dashboard
        </button>

        <button
          type="button"
          style={
            styles.printButton
          }
          onClick={() =>
            window.print()
          }
        >
          🖨 Print Results
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({
  label,
  value,
  status = false,
  highlight = false,
}) {
  const displayValue =
    safeString(value, "-");

  return (
    <div
      style={{
        ...styles.infoItem,
        ...(highlight
          ? styles.highlightItem
          : {}),
      }}
    >
      <div
        style={
          styles.infoLabel
        }
      >
        {label}
      </div>

      {status ? (
        <div
          style={
            styles.infoStatus
          }
        >
          <span>●</span>

          {displayValue}
        </div>
      ) : (
        <div
          style={
            styles.infoValue
          }
        >
          {displayValue}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f5f7fb",
    padding: "32px",
    fontFamily:
      "Inter, Arial, Helvetica, sans-serif",
    color: "#172033",
  },

  header: {
    maxWidth: "1200px",
    margin: "0 auto 28px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
  },

  headerLabel: {
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "1.4px",
    color: "#087f8c",
    marginBottom: "8px",
  },

  title: {
    margin: "0",
    fontSize: "32px",
    fontWeight: "800",
    color: "#111827",
    letterSpacing: "-0.6px",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#6b7280",
    fontSize: "14px",
  },

  headerActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },

  statusBanner: {
    maxWidth: "1200px",
    margin: "0 auto 24px",
    padding: "18px 22px",
    backgroundColor: "#ecfdf5",
    border: "1px solid #bbf7d0",
    borderRadius: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
  },

  statusLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },

  statusIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    backgroundColor: "#16a34a",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "700",
    flexShrink: 0,
  },

  statusTitle: {
    fontWeight: "750",
    color: "#166534",
    fontSize: "14px",
  },

  statusDescription: {
    marginTop: "4px",
    color: "#4b5563",
    fontSize: "12px",
  },

  completedBadge: {
    padding: "8px 14px",
    backgroundColor: "#dcfce7",
    color: "#15803d",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },

  card: {
    maxWidth: "1200px",
    margin: "0 auto 24px",
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "24px",
    boxShadow:
      "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
  },

  cardTitle: {
    margin: "0",
    fontSize: "18px",
    fontWeight: "750",
    color: "#111827",
  },

  cardSubtitle: {
    margin: "5px 0 0",
    color: "#6b7280",
    fontSize: "12px",
  },

  divider: {
    height: "1px",
    backgroundColor: "#eef0f4",
    margin: "20px 0",
  },

  patientIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    backgroundColor: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
  },

  requestIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    backgroundColor: "#f5f3ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
  },

  notesIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    backgroundColor: "#fff7ed",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
  },

  testCount: {
    padding: "7px 12px",
    backgroundColor: "#e8f7f8",
    color: "#087f8c",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "750",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "12px",
  },

  infoItem: {
    padding: "14px",
    backgroundColor: "#f9fafb",
    borderRadius: "10px",
    border: "1px solid #f0f1f3",
    minWidth: 0,
  },

  highlightItem: {
    backgroundColor: "#edf8f8",
    borderColor: "#ccebed",
  },

  infoLabel: {
    fontSize: "10px",
    fontWeight: "750",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "7px",
  },

  infoValue: {
    fontSize: "13px",
    fontWeight: "650",
    color: "#111827",
    wordBreak: "break-word",
  },

  infoStatus: {
    fontSize: "13px",
    fontWeight: "750",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  resultsList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  resultRow: {
    display: "grid",
    gridTemplateColumns:
      "48px minmax(220px, 1fr) minmax(300px, 2fr)",
    alignItems: "start",
    gap: "16px",
    padding: "16px",
    backgroundColor: "#f9fafb",
    border: "1px solid #eef0f4",
    borderRadius: "12px",
  },

  resultNumber: {
    width: "36px",
    height: "36px",
    borderRadius: "9px",
    backgroundColor: "#eaf8f9",
    color: "#087f8c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "800",
  },

  testInformation: {
    minWidth: 0,
    paddingTop: "2px",
  },

  testName: {
    fontSize: "13px",
    fontWeight: "750",
    color: "#111827",
    lineHeight: "1.4",
  },

  parentTest: {
    marginTop: "3px",
    fontSize: "10px",
    color: "#087f8c",
    fontWeight: "650",
  },

  testCode: {
    marginTop: "5px",
    fontSize: "10px",
    color: "#9ca3af",
    letterSpacing: "0.3px",
  },

  unitText: {
    marginTop: "6px",
    fontSize: "10px",
    color: "#087f8c",
    fontWeight: "650",
  },

  resultRight: {
    minWidth: 0,
  },

  resultLabel: {
    fontSize: "9px",
    fontWeight: "800",
    color: "#9ca3af",
    letterSpacing: "0.7px",
    marginBottom: "5px",
  },

  resultValue: {
    backgroundColor: "#ffffff",
    border: "1px solid #dfe4e8",
    borderRadius: "8px",
    padding: "11px 13px",
    fontSize: "13px",
    color: "#111827",
    fontWeight: "650",
    minHeight: "20px",
    wordBreak: "break-word",
    lineHeight: "1.5",
  },

  emptyResult: {
    color: "#9ca3af",
    backgroundColor: "#fafafa",
  },

  reference: {
    marginTop: "7px",
    fontSize: "10px",
    color: "#6b7280",
    lineHeight: "1.4",
  },

  warningBox: {
    marginTop: "15px",
    padding: "12px 14px",
    borderRadius: "9px",
    backgroundColor: "#fff8e8",
    border: "1px solid #f5d99a",
    color: "#8a6200",
    fontSize: "11px",
    lineHeight: "1.5",
  },

  noResults: {
    padding: "30px",
    textAlign: "center",
    color: "#6b7280",
    backgroundColor: "#f9fafb",
    borderRadius: "10px",
  },

  notesBox: {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "16px",
    minHeight: "70px",
    color: "#374151",
    fontSize: "13px",
    lineHeight: "1.6",
    wordBreak: "break-word",
  },

  footerActions: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    paddingBottom: "30px",
  },

  primaryButton: {
    border: "none",
    backgroundColor: "#087f8c",
    color: "#ffffff",
    padding: "11px 18px",
    borderRadius: "9px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },

  secondaryButton: {
    border: "1px solid #d1d5db",
    backgroundColor: "#ffffff",
    color: "#374151",
    padding: "10px 16px",
    borderRadius: "9px",
    fontSize: "13px",
    fontWeight: "650",
    cursor: "pointer",
  },

  printButton: {
    border: "none",
    backgroundColor: "#087f8c",
    color: "#ffffff",
    padding: "11px 17px",
    borderRadius: "9px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },

  loadingCard: {
    maxWidth: "600px",
    margin: "100px auto",
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "50px 30px",
    textAlign: "center",
    boxShadow:
      "0 4px 15px rgba(15, 23, 42, 0.06)",
  },

  spinner: {
    width: "45px",
    height: "45px",
    margin: "0 auto 18px",
    borderRadius: "50%",
    border: "4px solid #e5f2f3",
    borderTopColor: "#087f8c",
    animation:
      "spin 0.8s linear infinite",
  },

  loadingTitle: {
    margin: "0 0 8px",
    color: "#111827",
    fontSize: "18px",
  },

  loadingText: {
    margin: 0,
    color: "#6b7280",
    fontSize: "13px",
  },

  emptyCard: {
    maxWidth: "600px",
    margin: "100px auto",
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "50px 30px",
    textAlign: "center",
    boxShadow:
      "0 4px 15px rgba(15, 23, 42, 0.06)",
  },

  emptyIcon: {
    fontSize: "45px",
    marginBottom: "15px",
  },

  emptyTitle: {
    margin: "0 0 10px",
    color: "#111827",
  },

  emptyText: {
    color: "#6b7280",
    marginBottom: "25px",
  },
};

export default LaboratoryResults;