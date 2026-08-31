import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

// ============================================================
// CONSTANTS
// ============================================================

const STATUS_OPTIONS = [
  "All",
  "Pending",
  "Processing",
  "Completed",
  "Cancelled",
];

const EMPTY_EDIT = {
  results: {},
  laboratory_notes: "",
};

// ============================================================
// HELPERS
// ============================================================

function text(value, fallback = "—") {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  return String(value);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeResults(results) {
  if (
    !results ||
    typeof results !== "object" ||
    Array.isArray(results)
  ) {
    return {};
  }

  return results;
}

// ============================================================
// TEST NORMALIZATION
// ============================================================

function normalizeTests(rawTests) {
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

  return rawTests.map((rawTest, testIndex) => {
    // --------------------------------------------------------
    // STRING TEST
    // --------------------------------------------------------

    if (typeof rawTest === "string") {
      return {
        id: `${rawTest}-${testIndex}`,
        key: rawTest,
        name: rawTest,
        sample: "",
        parameters: [],
      };
    }

    // --------------------------------------------------------
    // OBJECT TEST
    // --------------------------------------------------------

    const test =
      rawTest &&
      typeof rawTest === "object"
        ? rawTest
        : {};

    /*
     * IMPORTANT:
     *
     * LaboratoryProcessRequest uses test.value as the
     * actual test key.
     *
     * Example:
     *
     * {
     *   value: "cbc",
     *   label: "Complete Blood Count"
     * }
     *
     * Therefore value MUST be checked first.
     */

    const testKey = String(
      test.value ||
        test.key ||
        test.type ||
        test.id ||
        `test-${testIndex}`
    );

    const testName =
      test.label ||
      test.name ||
      test.title ||
      testKey ||
      "Laboratory Test";

    let parameters = [];

    if (
      Array.isArray(test.parameters) &&
      test.parameters.length > 0
    ) {
      parameters = test.parameters;
    }

    return {
      id: `${testKey}-${testIndex}`,

      // THIS IS THE IMPORTANT FIX
      key: testKey,

      name: String(testName),

      sample: String(
        test.sample || ""
      ),

      parameters: parameters.map(
        (
          rawParameter,
          parameterIndex
        ) => {
          const parameter =
            rawParameter &&
            typeof rawParameter ===
              "object"
              ? rawParameter
              : {};

          /*
           * LaboratoryProcessRequest uses:
           *
           * parameter.key
           *
           * If key does not exist, value is used.
           */

          const parameterKey =
            String(
              parameter.key ||
                parameter.value ||
                parameter.name ||
                `parameter-${parameterIndex}`
            );

          const parameterLabel =
            parameter.label ||
            parameter.name ||
            parameter.value ||
            parameterKey ||
            `Parameter ${
              parameterIndex + 1
            }`;

          return {
            key: parameterKey,

            label: String(
              parameterLabel
            ),

            unit: String(
              parameter.unit || ""
            ),
          };
        }
      ),
    };
  });
}
// ============================================================
// RESULT READER
//
// Your LaboratoryProcessRequest stores results like:
//
// {
//   "testKey.parameterKey": "result"
// }
//
// We support that format first.
//
// We ALSO support the old nested format:
//
// {
//   "testKey": {
//      "parameterKey": "result"
//   }
// }
//
// This makes the Admin page compatible with existing records.
// ============================================================

function getResultValue(
  results,
  testKey,
  parameterKey
) {
  if (
    !results ||
    typeof results !== "object" ||
    Array.isArray(results)
  ) {
    return "";
  }

  const safeTestKey =
    String(testKey || "").trim();

  const safeParameterKey =
    String(parameterKey || "").trim();

  // ========================================================
  // 1. EXACT FLAT KEY
  // ========================================================

  const flatKey =
    `${safeTestKey}.${safeParameterKey}`;

  if (
    Object.prototype.hasOwnProperty.call(
      results,
      flatKey
    )
  ) {
    const value =
      results[flatKey];

    return value === null ||
      value === undefined
      ? ""
      : String(value);
  }

  // ========================================================
  // 2. CASE-INSENSITIVE FLAT KEY
  // ========================================================

  const matchingFlatKey =
    Object.keys(results).find(
      (key) =>
        key.toLowerCase() ===
        flatKey.toLowerCase()
    );

  if (matchingFlatKey) {
    const value =
      results[matchingFlatKey];

    return value === null ||
      value === undefined
      ? ""
      : String(value);
  }

  // ========================================================
  // 3. NESTED FORMAT
  //
  // Supports:
  //
  // {
  //   cbc: {
  //     hemoglobin: "13.5"
  //   }
  // }
  // ========================================================

  const nestedTest =
    results[safeTestKey];

  if (
    nestedTest &&
    typeof nestedTest === "object" &&
    !Array.isArray(nestedTest)
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        nestedTest,
        safeParameterKey
      )
    ) {
      const value =
        nestedTest[
          safeParameterKey
        ];

      return value === null ||
        value === undefined
        ? ""
        : String(value);
    }

    const matchingParameterKey =
      Object.keys(
        nestedTest
      ).find(
        (key) =>
          key.toLowerCase() ===
          safeParameterKey.toLowerCase()
      );

    if (matchingParameterKey) {
      const value =
        nestedTest[
          matchingParameterKey
        ];

      return value === null ||
        value === undefined
        ? ""
        : String(value);
    }
  }

  // ========================================================
  // 4. LAST RESORT
  //
  // Find a result that starts with testKey.
  //
  // Example:
  //
  // cbc.hemoglobin
  // cbc.hematocrit
  // ========================================================

  const matchingKey =
    Object.keys(results).find(
      (key) =>
        key
          .toLowerCase()
          .startsWith(
            `${safeTestKey.toLowerCase()}.`
          ) &&
        key
          .split(".")
          .slice(1)
          .join(".")
          .toLowerCase() ===
          safeParameterKey.toLowerCase()
    );

  if (matchingKey) {
    const value =
      results[matchingKey];

    return value === null ||
      value === undefined
      ? ""
      : String(value);
  }

  return "";
}
// ============================================================
// RESULT WRITER
//
// Always save using the same structure as the laboratory page.
// ============================================================

function setResultValue(
  results,
  testKey,
  parameterKey,
  value
) {
  const safeResults =
    normalizeResults(results);

  const key =
    `${String(testKey).trim()}.${String(
      parameterKey
    ).trim()}`;

  return {
    ...safeResults,
    [key]: value,
  };
}
// ============================================================
// STATUS
// ============================================================

function getStatusClass(status) {
  return String(
    status || ""
  )
    .toLowerCase()
    .replace(/\s+/g, "-");
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AdminLaboratoryWork() {
  const navigate = useNavigate();

  // ----------------------------------------------------------
  // DATA
  // ----------------------------------------------------------

  const [requests, setRequests] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  // ----------------------------------------------------------
  // MESSAGES
  // ----------------------------------------------------------

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // ----------------------------------------------------------
  // FILTERS
  // ----------------------------------------------------------

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  // ----------------------------------------------------------
  // SELECTED REQUEST
  // ----------------------------------------------------------

  const [selectedRequest, setSelectedRequest] =
    useState(null);

  const [editMode, setEditMode] =
    useState(false);

  const [editForm, setEditForm] =
    useState(EMPTY_EDIT);

  const [editReason, setEditReason] =
    useState("");

  // ==========================================================
  // LOAD LABORATORY REQUESTS
  // ==========================================================

  const loadRequests =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const {
          data,
          error: requestError,
        } = await supabase
          .from("laboratory_requests")
          .select(`
            id,
            patient_id,
            requested_by,
            processed_by,
            status,
            notes,
            created_at,
            completed_at,
            tests,
            request_date,
            results,
            laboratory_notes,
            completed_date,
            payment_id
          `)
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (requestError) {
          throw requestError;
        }

        const rows = data || [];

        // ----------------------------------------------------
        // PATIENT IDS
        // ----------------------------------------------------

        const patientIds = [
          ...new Set(
            rows
              .map(
                (row) =>
                  row.patient_id
              )
              .filter(Boolean)
          ),
        ];

        // ----------------------------------------------------
        // PROFILE IDS
        // requested_by + processed_by
        // ----------------------------------------------------

        const profileIds = [
          ...new Set(
            rows
              .flatMap((row) => [
                row.requested_by,
                row.processed_by,
              ])
              .filter(Boolean)
          ),
        ];

        // ----------------------------------------------------
        // PATIENT QUERY
        // ----------------------------------------------------

        const patientsPromise =
          patientIds.length
            ? supabase
                .from("patients")
                .select("*")
                .in(
                  "id",
                  patientIds
                )
            : Promise.resolve({
                data: [],
                error: null,
              });

        // ----------------------------------------------------
        // PROFILE QUERY
        // ----------------------------------------------------

        const profilesPromise =
          profileIds.length
            ? supabase
                .from("profiles")
                .select(
                  "id, full_name, username, role"
                )
                .in(
                  "id",
                  profileIds
                )
            : Promise.resolve({
                data: [],
                error: null,
              });

        const [
          patientsResult,
          profilesResult,
        ] = await Promise.all([
          patientsPromise,
          profilesPromise,
        ]);

        if (patientsResult.error) {
          throw patientsResult.error;
        }

        if (profilesResult.error) {
          throw profilesResult.error;
        }

        // ----------------------------------------------------
        // MAP PATIENTS
        // ----------------------------------------------------

        const patientMap =
          new Map(
            (
              patientsResult.data ||
              []
            ).map((patient) => [
              patient.id,
              patient,
            ])
          );

        // ----------------------------------------------------
        // MAP PROFILES
        // ----------------------------------------------------

        const profileMap =
          new Map(
            (
              profilesResult.data ||
              []
            ).map((profile) => [
              profile.id,
              profile,
            ])
          );

        // ----------------------------------------------------
        // ENRICH REQUESTS
        // ----------------------------------------------------

        const enriched =
          rows.map((row) => ({
            ...row,

            patient:
              patientMap.get(
                row.patient_id
              ) || null,

            requester:
              profileMap.get(
                row.requested_by
              ) || null,

            technician:
              profileMap.get(
                row.processed_by
              ) || null,
          }));

        setRequests(enriched);

        // ----------------------------------------------------
        // KEEP CURRENT MODAL REQUEST UPDATED
        // ----------------------------------------------------

        setSelectedRequest(
          (currentSelected) => {
            if (!currentSelected) {
              return null;
            }

            const updatedSelected =
              enriched.find(
                (item) =>
                  item.id ===
                  currentSelected.id
              );

            return (
              updatedSelected ||
              currentSelected
            );
          }
        );
      } catch (loadError) {
        console.error(
          "Admin laboratory work load error:",
          loadError
        );

        setError(
          loadError?.message ||
            "Unable to load laboratory work."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRequests();
  }, [loadRequests]);

  // ==========================================================
  // ESCAPE KEY
  // ==========================================================

  useEffect(() => {
    if (!selectedRequest) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (
        event.key === "Escape" &&
        !saving
      ) {
        closeRequest();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [selectedRequest, saving, closeRequest]);

  // ==========================================================
  // FILTERED REQUESTS
  // ==========================================================

  const filteredRequests =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return requests.filter(
        (request) => {
          // ----------------------------------------------
          // STATUS
          // ----------------------------------------------

          if (
            statusFilter !==
              "All" &&
            String(
              request.status || ""
            ) !== statusFilter
          ) {
            return false;
          }

          // ----------------------------------------------
          // SEARCH
          // ----------------------------------------------

          if (!query) {
            return true;
          }

          const patient =
            request.patient || {};

          const requester =
            request.requester || {};

          const technician =
            request.technician || {};

          const haystack = [
            request.id,
            request.request_date,
            request.status,

            patient.full_name,
            patient.first_name,
            patient.last_name,
            patient.name,
            patient.patient_number,
            patient.phone,

            requester.full_name,
            requester.username,

            technician.full_name,
            technician.username,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(
            query
          );
        }
      );
    }, [
      requests,
      search,
      statusFilter,
    ]);

  // ==========================================================
  // STATISTICS
  // ==========================================================

  const stats =
    useMemo(() => {
      return {
        total: requests.length,

        pending:
          requests.filter(
            (request) =>
              request.status ===
              "Pending"
          ).length,

        processing:
          requests.filter(
            (request) =>
              request.status ===
              "Processing"
          ).length,

        completed:
          requests.filter(
            (request) =>
              request.status ===
              "Completed"
          ).length,
      };
    }, [requests]);

  // ==========================================================
  // OPEN REQUEST
  // ==========================================================

  function openRequest(request) {
    setSelectedRequest(
      request
    );

    setEditMode(false);

    setEditReason("");

    setEditForm({
      results:
        normalizeResults(
          request.results
        ),

      laboratory_notes:
        request.laboratory_notes ||
        "",
    });

    setError("");

    setSuccess("");
  }

  // ==========================================================
  // CLOSE REQUEST
  // ==========================================================

  // eslint-disable-next-line react-hooks/exhaustive-deps
  function closeRequest() {
    if (saving) {
      return;
    }

    setSelectedRequest(null);

    setEditMode(false);

    setEditReason("");

    setEditForm(
      EMPTY_EDIT
    );

    setError("");

    setSuccess("");
  }

  // ==========================================================
  // UPDATE RESULT
  // ==========================================================

  function updateResult(
    testKey,
    parameterKey,
    value
  ) {
    setEditForm(
      (current) => ({
        ...current,

        results:
          setResultValue(
            current.results,
            testKey,
            parameterKey,
            value
          ),
      })
    );
  }

  // ==========================================================
  // START EDIT MODE
  // ==========================================================

  function startEdit() {
    if (!selectedRequest) {
      return;
    }

    setEditMode(true);

    setEditReason("");

    setError("");

    setSuccess("");

    setEditForm({
      results:
        normalizeResults(
          selectedRequest.results
        ),

      laboratory_notes:
        selectedRequest.laboratory_notes ||
        "",
    });
  }

  // ==========================================================
  // CANCEL EDIT
  // ==========================================================

  function cancelEdit() {
    if (saving) {
      return;
    }

    setEditMode(false);

    setEditReason("");

    setError("");

    if (selectedRequest) {
      setEditForm({
        results:
          normalizeResults(
            selectedRequest.results
          ),

        laboratory_notes:
          selectedRequest.laboratory_notes ||
          "",
      });
    }
  }

  // ==========================================================
  // SAVE RESULT CORRECTION
  // ==========================================================

 async function saveResults() {
  if (!selectedRequest) {
    setError("No laboratory request selected.");
    return;
  }

  if (saving) {
    return;
  }

  if (!editReason.trim()) {
    setError("Please enter a reason for the correction.");
    return;
  }

  try {
    setSaving(true);
    setError("");
    setSuccess("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      throw new Error(
        "Your admin session has expired. Please log in again."
      );
    }

    /*
     * Save the results exactly as they are currently
     * represented in the edit form.
     */
    const resultsToSave = normalizeResults(
      editForm.results
    );

    const notesToSave =
      editForm.laboratory_notes?.trim() || null;

    console.log(
      "ADMIN SAVING RESULTS:",
      resultsToSave
    );

    const {
      data: updated,
      error: updateError,
    } = await supabase
      .from("laboratory_requests")
      .update({
        results: resultsToSave,
        laboratory_notes: notesToSave,
      })
      .eq("id", selectedRequest.id)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    if (!updated) {
      throw new Error(
        "The laboratory request was not updated."
      );
    }

    /*
     * Keep patient/requester/technician information
     * from the currently selected request.
     */
    const updatedRequest = {
      ...selectedRequest,
      ...updated,
    };

    /*
     * Update table immediately.
     */
    setRequests((current) =>
      current.map((item) =>
        item.id === updatedRequest.id
          ? updatedRequest
          : item
      )
    );

    /*
     * Update modal immediately.
     */
    setSelectedRequest(updatedRequest);

    /*
     * IMPORTANT:
     * Reload the form using the newly saved database data.
     */
    setEditForm({
      results: normalizeResults(
        updated.results
      ),
      laboratory_notes:
        updated.laboratory_notes || "",
    });

    setEditMode(false);
    setEditReason("");

    setSuccess(
      "Laboratory results updated successfully."
    );
  } catch (saveError) {
    console.error(
      "ADMIN RESULT SAVE ERROR:",
      saveError
    );

    setError(
      saveError?.message ||
        "Unable to update laboratory results."
    );
  } finally {
    setSaving(false);
  }
}

  // ==========================================================
  // UPDATE STATUS
  // ==========================================================

  async function updateStatus(
    newStatus
  ) {
    if (!selectedRequest) {
      return;
    }

    setSaving(true);

    setError("");

    setSuccess("");

    try {
      const {
        data: updated,
        error: updateError,
      } = await supabase
        .from(
          "laboratory_requests"
        )
        .update({
          status: newStatus,
        })
        .eq(
          "id",
          selectedRequest.id
        )
        .select(`
          id,
          patient_id,
          requested_by,
          processed_by,
          status,
          notes,
          created_at,
          completed_at,
          tests,
          request_date,
          results,
          laboratory_notes,
          completed_date,
          payment_id
        `)
        .single();

      if (updateError) {
        throw updateError;
      }

      const updatedRequest = {
        ...selectedRequest,
        ...updated,
      };

      setRequests(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              updatedRequest.id
                ? updatedRequest
                : item
          )
      );

      setSelectedRequest(
        updatedRequest
      );

      setSuccess(
        `Request status changed to ${newStatus}.`
      );
    } catch (statusError) {
      console.error(
        "Admin status update error:",
        statusError
      );

      setError(
        statusError?.message ||
          "Unable to update request status."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // SELECTED DATA
  // ==========================================================

  const tests = normalizeTests(
    selectedRequest?.tests
  );

  const patient =
    selectedRequest?.patient ||
    {};

  const requester =
    selectedRequest?.requester ||
    {};

  const technician =
    selectedRequest?.technician ||
    {};

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div style={styles.page}>
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            type="button"
            style={styles.backButton}
            onClick={() =>
              navigate("/admin")
            }
          >
            ← Admin Dashboard
          </button>

          <h1 style={styles.title}>
            Laboratory Work
          </h1>

          <p style={styles.subtitle}>
            Review laboratory requests,
            technician work, and completed
            results.
          </p>
        </div>

        <button
          type="button"
          style={styles.refreshButton}
          onClick={loadRequests}
          disabled={loading}
        >
          {loading
            ? "Refreshing..."
            : "↻ Refresh"}
        </button>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main style={styles.container}>
        {/* ===================================================
            STATS
        =================================================== */}

        <div style={styles.statsGrid}>
          <StatCard
            label="Total Requests"
            value={stats.total}
          />

          <StatCard
            label="Pending"
            value={stats.pending}
          />

          <StatCard
            label="Processing"
            value={stats.processing}
          />

          <StatCard
            label="Completed"
            value={stats.completed}
          />
        </div>

        {/* ===================================================
            REQUEST CARD
        =================================================== */}

        <section style={styles.card}>
          {/* =================================================
              TOOLBAR
          ================================================= */}

          <div style={styles.toolbar}>
            <div
              style={
                styles.searchWrap
              }
            >
              <span
                style={
                  styles.searchIcon
                }
              >
                ⌕
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search patient, nurse, technician, or request ID..."
                style={styles.search}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              style={styles.select}
            >
              {STATUS_OPTIONS.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status === "All"
                      ? "All statuses"
                      : status}
                  </option>
                )
              )}
            </select>
          </div>

          {/* =================================================
              ERROR
          ================================================= */}

          {error &&
            !selectedRequest && (
              <div
                style={
                  styles.error
                }
              >
                {error}
              </div>
            )}

          {/* =================================================
              SUCCESS
          ================================================= */}

          {success &&
            !selectedRequest && (
              <div
                style={
                  styles.success
                }
              >
                {success}
              </div>
            )}

          {/* =================================================
              LOADING
          ================================================= */}

          {loading ? (
            <div
              style={
                styles.empty
              }
            >
              <div
                style={
                  styles.spinner
                }
              />

              <strong>
                Loading laboratory
                work...
              </strong>

              <span>
                Please wait while
                requests are loaded.
              </span>
            </div>
          ) : filteredRequests.length ===
            0 ? (
            <div
              style={
                styles.empty
              }
            >
              <strong>
                No laboratory
                requests found.
              </strong>

              <span>
                Try changing your
                search or status
                filter.
              </span>
            </div>
          ) : (
            <div
              style={
                styles.tableWrap
              }
            >
              <table
                style={styles.table}
              >
                <thead>
                  <tr>
                    <th
                      style={styles.th}
                    >
                      Request
                    </th>

                    <th
                      style={styles.th}
                    >
                      Patient
                    </th>

                    <th
                      style={styles.th}
                    >
                      Nurse
                    </th>

                    <th
                      style={styles.th}
                    >
                      Laboratory
                      Technician
                    </th>

                    <th
                      style={styles.th}
                    >
                      Date
                    </th>

                    <th
                      style={styles.th}
                    >
                      Status
                    </th>

                    <th
                      style={styles.th}
                    >
                      Payment
                    </th>

                    <th
                      style={styles.th}
                    >
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRequests.map(
                    (request) => (
                      <tr
                        key={
                          request.id
                        }
                        style={
                          styles.tableRow
                        }
                      >
                        {/* REQUEST */}
                        <td
                          style={
                            styles.td
                          }
                        >
                          <strong
                            style={
                              styles.requestId
                            }
                          >
                            #
                            {
                              request.id
                            }
                          </strong>
                        </td>

                        {/* PATIENT */}
                        <td
                          style={
                            styles.td
                          }
                        >
                          <div
                            style={
                              styles.primaryText
                            }
                          >
                            {text(
                              request
                                .patient
                                ?.full_name ||
                                request
                                  .patient
                                  ?.name,
                              "Unknown patient"
                            )}
                          </div>

                          <div
                            style={
                              styles.secondaryText
                            }
                          >
                            {text(
                              request
                                .patient
                                ?.patient_number ||
                                request
                                  .patient
                                  ?.phone,
                              ""
                            )}
                          </div>
                        </td>

                        {/* NURSE */}
                        <td
                          style={
                            styles.td
                          }
                        >
                          {text(
                            request
                              .requester
                              ?.full_name,
                            "Unknown"
                          )}
                        </td>

                        {/* TECHNICIAN */}
                        <td
                          style={
                            styles.td
                          }
                        >
                          {request
                            .technician ? (
                            <div>
                              <div
                                style={
                                  styles.primaryText
                                }
                              >
                                {text(
                                  request
                                    .technician
                                    .full_name,
                                  request
                                    .technician
                                    .username ||
                                    "Technician"
                                )}
                              </div>

                              <div
                                style={
                                  styles.secondaryText
                                }
                              >
                                {text(
                                  request
                                    .technician
                                    .role,
                                  "Laboratory"
                                )}
                              </div>
                            </div>
                          ) : (
                            <span
                              style={
                                styles.notAssigned
                              }
                            >
                              Not assigned
                            </span>
                          )}
                        </td>

                        {/* DATE */}
                        <td
                          style={
                            styles.td
                          }
                        >
                          {formatDate(
                            request.request_date ||
                              request.created_at
                          )}
                        </td>

                        {/* STATUS */}
                        <td
                          style={
                            styles.td
                          }
                        >
                          <span
                            className={`status ${getStatusClass(
                              request.status
                            )}`}
                            style={{
                              ...styles.status,
                              ...(String(
                                request.status
                              ).toLowerCase() ===
                              "completed"
                                ? styles.statusCompleted
                                : {}),
                              ...(String(
                                request.status
                              ).toLowerCase() ===
                              "processing"
                                ? styles.statusProcessing
                                : {}),
                              ...(String(
                                request.status
                              ).toLowerCase() ===
                              "pending"
                                ? styles.statusPending
                                : {}),
                            }}
                          >
                            {text(
                              request.status
                            )}
                          </span>
                        </td>

                        {/* PAYMENT */}
                        <td
                          style={
                            styles.td
                          }
                        >
                          {request.payment_id ? (
                            <span
                              style={
                                styles.paid
                              }
                            >
                              ✓ Paid
                            </span>
                          ) : (
                            <span
                              style={
                                styles.unpaid
                              }
                            >
                              Unpaid
                            </span>
                          )}
                        </td>

                        {/* ACTION */}
                        <td
                          style={
                            styles.td
                          }
                        >
                          <button
                            type="button"
                            style={
                              styles.viewButton
                            }
                            onClick={() =>
                              openRequest(
                                request
                              )
                            }
                          >
                            View Work →
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* =====================================================
          MODAL
      ===================================================== */}

      {selectedRequest && (
        <div
          style={styles.overlay}
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeRequest();
            }
          }}
        >
          <div
            style={styles.modal}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* ===============================================
                MODAL HEADER
            =============================================== */}

            <div
              style={
                styles.modalHeader
              }
            >
              <div
                style={
                  styles.modalHeaderContent
                }
              >
                <div
                  style={
                    styles.modalEyebrow
                  }
                >
                  Laboratory Request #
                  {
                    selectedRequest.id
                  }
                </div>

                <h2
                  style={
                    styles.modalTitle
                  }
                >
                  Laboratory Work Review
                </h2>

                <p
                  style={
                    styles.modalSubtitle
                  }
                >
                  Review technician work
                  and correct laboratory
                  results when necessary.
                </p>
              </div>

              <button
                type="button"
                style={
                  styles.closeButton
                }
                onClick={
                  closeRequest
                }
                disabled={saving}
                aria-label="Close"
                title="Close"
              >
                ×
              </button>
            </div>

            {/* ===============================================
                MODAL BODY
            =============================================== */}

            <div
              style={
                styles.modalBody
              }
            >
              {/* ERROR */}

              {error && (
                <div
                  style={
                    styles.error
                  }
                >
                  {error}
                </div>
              )}

              {/* SUCCESS */}

              {success && (
                <div
                  style={
                    styles.success
                  }
                >
                  {success}
                </div>
              )}

              {/* =============================================
                  REQUEST INFORMATION
              ============================================= */}

              <div
                style={
                  styles.infoGrid
                }
              >
                <Info
                  label="Patient"
                  value={text(
                    patient.full_name ||
                      patient.name,
                    "Unknown patient"
                  )}
                />

                <Info
                  label="Patient ID"
                  value={text(
                    patient.patient_number ||
                      patient.id
                  )}
                />

                <Info
                  label="Requested by"
                  value={text(
                    requester.full_name,
                    requester.username ||
                      "Unknown"
                  )}
                />

                <Info
                  label="Laboratory Technician"
                  value={text(
                    technician.full_name,
                    technician.username ||
                      "Not assigned"
                  )}
                />

                <Info
                  label="Request Date"
                  value={formatDate(
                    selectedRequest.request_date ||
                      selectedRequest.created_at
                  )}
                />

                <Info
                  label="Completed"
                  value={formatDateTime(
                    selectedRequest.completed_at ||
                      selectedRequest.completed_date
                  )}
                />

                <Info
                  label="Status"
                  value={text(
                    selectedRequest.status
                  )}
                />

                <Info
                  label="Payment"
                  value={
                    selectedRequest.payment_id
                      ? `Paid (#${selectedRequest.payment_id})`
                      : "Unpaid"
                  }
                />
              </div>

              {/* =============================================
                  TESTS & RESULTS
              ============================================= */}

              <section
                style={
                  styles.section
                }
              >
                <div
                  style={
                    styles.sectionHeader
                  }
                >
                  <div>
                    <h3
                      style={
                        styles.sectionTitle
                      }
                    >
                      Requested Tests
                      & Results
                    </h3>

                    <p
                      style={
                        styles.sectionSubtitle
                      }
                    >
                      Review the
                      laboratory
                      technician's
                      submitted
                      results.
                    </p>
                  </div>

                  {!editMode && (
                    <button
                      type="button"
                      style={
                        styles.editButton
                      }
                      onClick={
                        startEdit
                      }
                    >
                      ✎ Edit Results
                    </button>
                  )}
                </div>

                {tests.length ===
                0 ? (
                  <div
                    style={
                      styles.emptySmall
                    }
                  >
                    No tests are
                    attached to this
                    request.
                  </div>
                ) : (
                  <div
                    style={
                      styles.testList
                    }
                  >
                    {tests.map(
                      (test) => (
                        <div
                          key={
                            test.id
                          }
                          style={
                            styles.testCard
                          }
                        >
                          {/* TEST HEADER */}

                          <div
                            style={
                              styles.testHeader
                            }
                          >
                            <div>
                              <h4
                                style={
                                  styles.testName
                                }
                              >
                                {
                                  test.name
                                }
                              </h4>

                              {test.sample && (
                                <span
                                  style={
                                    styles.sample
                                  }
                                >
                                  Sample:{" "}
                                  {
                                    test.sample
                                  }
                                </span>
                              )}
                            </div>

                            <span
                              style={
                                styles.testKey
                              }
                            >
                              {
                                test.key
                              }
                            </span>
                          </div>

                          {/* PARAMETERS */}

                          {test
                            .parameters
                            .length ===
                          0 ? (
                            <div
                              style={
                                styles.emptySmall
                              }
                            >
                              No
                              individual
                              parameters
                              were
                              provided.
                            </div>
                          ) : (
                            <div
                              style={
                                styles.resultTableWrap
                              }
                            >
                              <table
                                style={
                                  styles.resultTable
                                }
                              >
                                <thead>
                                  <tr>
                                    <th
                                      style={
                                        styles.resultTh
                                      }
                                    >
                                      Parameter
                                    </th>

                                    <th
                                      style={
                                        styles.resultTh
                                      }
                                    >
                                      Result
                                    </th>

                                    <th
                                      style={
                                        styles.resultTh
                                      }
                                    >
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
                                      const value =
                                        getResultValue(
                                          editMode
                                            ? editForm.results
                                            : normalizeResults(
                                                selectedRequest.results
                                              ),
                                          test.key,
                                          parameter.key
                                        );

                                      return (
                                        <tr
                                          key={`${test.key}-${parameter.key}-${parameterIndex}`}
                                        >
                                          {/* PARAMETER */}

                                          <td
                                            style={
                                              styles.resultTd
                                            }
                                          >
                                            <div
                                              style={
                                                styles.parameterName
                                              }
                                            >
                                              {
                                                parameter.label
                                              }
                                            </div>
                                          </td>

                                          {/* RESULT */}

                                          <td
                                            style={
                                              styles.resultTd
                                            }
                                          >
                                            {editMode ? (
                                              <input
                                                type="text"
                                                value={
                                                  value
                                                }
                                                onChange={(
                                                  event
                                                ) =>
                                                  updateResult(
                                                    test.key,
                                                    parameter.key,
                                                    event.target
                                                      .value
                                                  )
                                                }
                                                placeholder="Enter result"
                                                style={
                                                  styles.resultInput
                                                }
                                                disabled={
                                                  saving
                                                }
                                              />
                                            ) : (
                                              <span
                                                style={{
                                                  ...styles.resultValue,
                                                  ...(value
                                                    ? styles.resultEntered
                                                    : styles.resultMissing),
                                                }}
                                              >
                                                {value ||
                                                  "Not entered"}
                                              </span>
                                            )}
                                          </td>

                                          {/* UNIT */}

                                          <td
                                            style={
                                              styles.resultTd
                                            }
                                          >
                                            <span
                                              style={
                                                styles.unit
                                              }
                                            >
                                              {text(
                                                parameter.unit,
                                                "—"
                                              )}
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
                    )}
                  </div>
                )}
              </section>

              {/* =============================================
                  LABORATORY NOTES
              ============================================= */}

              <section
                style={
                  styles.section
                }
              >
                <div
                  style={
                    styles.sectionHeader
                  }
                >
                  <div>
                    <h3
                      style={
                        styles.sectionTitle
                      }
                    >
                      Laboratory Notes
                    </h3>

                    <p
                      style={
                        styles.sectionSubtitle
                      }
                    >
                      Notes submitted by
                      the laboratory
                      technician.
                    </p>
                  </div>
                </div>

                {editMode ? (
                  <div
                    style={
                      styles.notesEditor
                    }
                  >
                    <textarea
                      value={
                        editForm.laboratory_notes
                      }
                      onChange={(
                        event
                      ) =>
                        setEditForm(
                          (current) => ({
                            ...current,
                            laboratory_notes:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Enter laboratory notes..."
                      style={
                        styles.textarea
                      }
                      disabled={
                        saving
                      }
                    />
                  </div>
                ) : (
                  <div
                    style={
                      styles.notesBox
                    }
                  >
                    {text(
                      selectedRequest.laboratory_notes,
                      "No laboratory notes."
                    )}
                  </div>
                )}
              </section>

              {/* =============================================
                  ADMIN CORRECTION WARNING
              ============================================= */}

              {editMode && (
                <section
                  style={
                    styles.warningBox
                  }
                >
                  <div
                    style={
                      styles.warningTitle
                    }
                  >
                    ⚠ Administrator
                    correction
                  </div>

                  <p
                    style={
                      styles.warningText
                    }
                  >
                    You are changing
                    the official
                    laboratory result.
                    Please enter a clear
                    reason for this
                    correction.
                  </p>

                  <input
                    type="text"
                    value={
                      editReason
                    }
                    onChange={(
                      event
                    ) =>
                      setEditReason(
                        event.target
                          .value
                      )
                    }
                    placeholder="Example: Corrected hemoglobin value entered incorrectly by technician"
                    style={
                      styles.reasonInput
                    }
                    disabled={
                      saving
                    }
                  />
                </section>
              )}
            </div>

            {/* ===============================================
                MODAL FOOTER
            =============================================== */}

            <div
              style={
                styles.modalFooter
              }
            >
              <div
                style={
                  styles.footerStatus
                }
              >
                <span>
                  Status
                </span>

                <strong>
                  {text(
                    selectedRequest.status
                  )}
                </strong>
              </div>

              <div
                style={
                  styles.footerActions
                }
              >
                {editMode ? (
                  <>
                    <button
                      type="button"
                      style={
                        styles.secondaryButton
                      }
                      onClick={
                        cancelEdit
                      }
                      disabled={
                        saving
                      }
                    >
                      Cancel Edit
                    </button>

                   <button
  type="button"
  style={{
    ...styles.saveButton,
    opacity: saving ? 0.65 : 1,
    cursor: saving ? "wait" : "pointer",
    pointerEvents: saving ? "none" : "auto",
    position: "relative",
    zIndex: 100,
  }}
  onMouseDown={(event) => {
    event.stopPropagation();
  }}
  onClick={(event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!saving) {
      saveResults();
    }
  }}
  disabled={saving}
>
  {saving ? "Saving..." : "Save Correction"}
</button>
                  </>
                ) : (
                  <>
                    {selectedRequest.status ===
                      "Pending" && (
                      <button
                        type="button"
                        style={
                          styles.processButton
                        }
                        onClick={() =>
                          updateStatus(
                            "Processing"
                          )
                        }
                        disabled={
                          saving
                        }
                      >
                        {saving
                          ? "Updating..."
                          : "Start Processing"}
                      </button>
                    )}

                    {selectedRequest.status ===
                      "Processing" && (
                      <button
                        type="button"
                        style={
                          styles.completeButton
                        }
                        onClick={() =>
                          updateStatus(
                            "Completed"
                          )
                        }
                        disabled={
                          saving
                        }
                      >
                        {saving
                          ? "Updating..."
                          : "Mark Completed"}
                      </button>
                    )}

                    <button
                      type="button"
                      style={
                        styles.secondaryButton
                      }
                      onClick={
                        closeRequest
                      }
                      disabled={
                        saving
                      }
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  label,
  value,
}) {
  return (
    <div
      style={
        styles.statCard
      }
    >
      <span
        style={
          styles.statLabel
        }
      >
        {label}
      </span>

      <strong
        style={
          styles.statValue
        }
      >
        {value}
      </strong>
    </div>
  );
}

// ============================================================
// INFO
// ============================================================

function Info({
  label,
  value,
}) {
  return (
    <div
      style={
        styles.infoItem
      }
    >
      <span
        style={
          styles.infoLabel
        }
      >
        {label}
      </span>

      <strong
        style={
          styles.infoValue
        }
      >
        {value}
      </strong>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = {
  // ==========================================================
  // PAGE
  // ==========================================================

  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#f5f8fb",
    color: "#172033",
    fontFamily:
      "Inter, Arial, sans-serif",
    boxSizing: "border-box",
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    minHeight: "110px",
    width: "100%",
    padding:
      "22px clamp(18px, 3vw, 48px)",
    background: "#ffffff",
    borderBottom:
      "1px solid #e4eaf0",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: "24px",
    boxSizing: "border-box",
  },

  headerLeft: {
    minWidth: 0,
  },

  backButton: {
    border: "none",
    background: "transparent",
    color: "#087f8c",
    fontWeight: "800",
    padding: 0,
    cursor: "pointer",
    marginBottom: "10px",
    fontSize: "14px",
  },

  title: {
    margin: 0,
    fontSize:
      "clamp(24px, 2vw, 32px)",
    lineHeight: 1.2,
    fontWeight: "800",
    letterSpacing: "-0.02em",
  },

  subtitle: {
    margin:
      "7px 0 0",
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.5,
  },

  refreshButton: {
    flexShrink: 0,
    minHeight: "44px",
    border:
      "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    borderRadius: "9px",
    padding:
      "10px 16px",
    fontWeight: "800",
    cursor: "pointer",
    fontSize: "14px",
  },

  // ==========================================================
  // CONTAINER
  // ==========================================================

  container: {
    width: "100%",
    maxWidth: "1800px",
    margin: "0 auto",
    padding:
      "26px clamp(18px, 3vw, 48px) 60px",
    boxSizing: "border-box",
  },

  // ==========================================================
  // STATS
  // ==========================================================

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: "18px",
    marginBottom: "20px",
  },

  statCard: {
    background: "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius: "15px",
    padding:
      "20px 22px",
    minHeight: "100px",
    boxShadow:
      "0 4px 14px rgba(15, 23, 42, 0.04)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },

  statLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "800",
    textTransform:
      "uppercase",
    letterSpacing:
      "0.05em",
  },

  statValue: {
    display: "block",
    marginTop: "7px",
    fontSize: "28px",
    lineHeight: 1,
    fontWeight: "800",
    color: "#172033",
  },

  // ==========================================================
  // CARD
  // ==========================================================

  card: {
    width: "100%",
    background: "#ffffff",
    border:
      "1px solid #e2e8f0",
    borderRadius: "15px",
    boxShadow:
      "0 4px 14px rgba(15, 23, 42, 0.04)",
    overflow: "hidden",
  },

  // ==========================================================
  // TOOLBAR
  // ==========================================================

  toolbar: {
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    borderBottom:
      "1px solid #edf1f5",
    boxSizing: "border-box",
  },

  searchWrap: {
    position: "relative",
    flex: 1,
    minWidth: 0,
  },

  searchIcon: {
    position: "absolute",
    left: "13px",
    top: "50%",
    transform:
      "translateY(-50%)",
    color: "#94a3b8",
    fontSize: "20px",
    pointerEvents: "none",
  },

  search: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "46px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "9px",
    padding:
      "10px 12px 10px 38px",
    outline: "none",
    fontSize: "14px",
    background: "#ffffff",
    color: "#172033",
  },

  select: {
    minHeight: "46px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "9px",
    padding:
      "0 12px",
    background: "#ffffff",
    color: "#334155",
    fontWeight: "700",
    minWidth: "160px",
    outline: "none",
  },

  // ==========================================================
  // TABLE
  // ==========================================================

  tableWrap: {
    width: "100%",
    overflowX: "auto",
    WebkitOverflowScrolling:
      "touch",
  },

  table: {
    width: "100%",
    borderCollapse:
      "collapse",
    minWidth: "1050px",
  },

  tableRow: {
    transition:
      "background 0.15s ease",
  },

  th: {
    textAlign: "left",
    padding:
      "14px 15px",
    background: "#f8fafc",
    color: "#64748b",
    fontSize: "11px",
    textTransform:
      "uppercase",
    letterSpacing:
      "0.05em",
    borderBottom:
      "1px solid #e2e8f0",
    whiteSpace:
      "nowrap",
  },

  td: {
    padding:
      "15px",
    borderBottom:
      "1px solid #edf1f5",
    verticalAlign:
      "middle",
    fontSize: "13px",
  },

  requestId: {
    color: "#087f8c",
    fontSize: "13px",
  },

  primaryText: {
    fontWeight: "750",
    color: "#172033",
  },

  secondaryText: {
    color: "#94a3b8",
    fontSize: "11px",
    marginTop: "4px",
  },

  notAssigned: {
    color: "#94a3b8",
    fontStyle: "italic",
  },

  // ==========================================================
  // STATUS
  // ==========================================================

  status: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius:
      "999px",
    padding:
      "6px 10px",
    fontSize: "11px",
    fontWeight: "800",
    background: "#eef2f7",
    color: "#475569",
    whiteSpace:
      "nowrap",
  },

  statusCompleted: {
    background:
      "#ecfdf3",
    color: "#15803d",
  },

  statusProcessing: {
    background:
      "#eff6ff",
    color: "#2563eb",
  },

  statusPending: {
    background:
      "#fff7ed",
    color: "#c2410c",
  },

  paid: {
    color: "#15803d",
    fontWeight: "800",
    whiteSpace:
      "nowrap",
  },

  unpaid: {
    color: "#b45309",
    fontWeight: "800",
    whiteSpace:
      "nowrap",
  },

  // ==========================================================
  // VIEW BUTTON
  // ==========================================================

  viewButton: {
    border:
      "1px solid #b9dfe3",
    background: "#f0fbfc",
    color: "#087f8c",
    borderRadius: "8px",
    padding:
      "9px 12px",
    fontWeight: "800",
    cursor: "pointer",
    whiteSpace:
      "nowrap",
  },

  // ==========================================================
  // EMPTY
  // ==========================================================

  empty: {
    minHeight: "320px",
    display: "flex",
    flexDirection:
      "column",
    alignItems:
      "center",
    justifyContent:
      "center",
    gap: "8px",
    color: "#64748b",
    padding: "30px",
    textAlign: "center",
  },

  spinner: {
    width: "28px",
    height: "28px",
    borderRadius:
      "50%",
    border:
      "3px solid #dbe5ea",
    borderTopColor:
      "#087f8c",
    marginBottom: "6px",
  },

  emptySmall: {
    padding: "18px",
    borderRadius: "9px",
    background: "#f8fafc",
    color: "#64748b",
    fontSize: "13px",
  },

  // ==========================================================
  // MESSAGES
  // ==========================================================

  error: {
    margin:
      "14px 16px 0",
    padding:
      "12px 14px",
    borderRadius: "9px",
    background: "#fef2f2",
    border:
      "1px solid #fecaca",
    color: "#b91c1c",
    fontSize: "13px",
    fontWeight: "600",
    lineHeight: 1.5,
  },

  success: {
    margin:
      "14px 16px 0",
    padding:
      "12px 14px",
    borderRadius: "9px",
    background: "#f0fdf4",
    border:
      "1px solid #bbf7d0",
    color: "#166534",
    fontSize: "13px",
    fontWeight: "600",
    lineHeight: 1.5,
  },

  // ==========================================================
  // OVERLAY
  // ==========================================================

  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background:
      "rgba(15, 23, 42, 0.58)",
    display: "flex",
    alignItems:
      "center",
    justifyContent:
      "center",
    padding:
      "clamp(10px, 2vw, 24px)",
    boxSizing:
      "border-box",
  },

  // ==========================================================
  // MODAL
  // ==========================================================

  modal: {
    width:
      "min(1250px, 100%)",
    maxHeight:
      "calc(100vh - 30px)",
    background: "#ffffff",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow:
      "0 24px 80px rgba(15, 23, 42, 0.28)",
    display: "flex",
    flexDirection:
      "column",
    boxSizing:
      "border-box",
  },

  modalHeader: {
    flexShrink: 0,
    padding:
      "20px 24px",
    borderBottom:
      "1px solid #e5e7eb",
    display: "flex",
    alignItems:
      "flex-start",
    justifyContent:
      "space-between",
    gap: "20px",
    background:
      "#ffffff",
  },

  modalHeaderContent: {
    minWidth: 0,
  },

  modalEyebrow: {
    color: "#087f8c",
    fontSize: "12px",
    fontWeight: "800",
    marginBottom: "5px",
  },

  modalTitle: {
    margin: 0,
    fontSize: "22px",
    lineHeight: 1.25,
    fontWeight: "800",
    color: "#172033",
  },

  modalSubtitle: {
    margin:
      "6px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  closeButton: {
    flexShrink: 0,
    width: "40px",
    height: "40px",
    borderRadius: "9px",
    border:
      "1px solid #dbe3eb",
    background: "#ffffff",
    color: "#475569",
    fontSize: "25px",
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  // ==========================================================
  // MODAL BODY
  // ==========================================================

  modalBody: {
    flex: 1,
    minHeight: 0,
    padding:
      "22px 24px",
    overflowY: "auto",
    overscrollBehavior:
      "contain",
  },

  // ==========================================================
  // INFO GRID
  // ==========================================================

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: "10px",
    marginBottom: "22px",
  },

  infoItem: {
    border:
      "1px solid #e5eaf0",
    borderRadius: "10px",
    padding: "13px",
    background: "#f8fafc",
    minWidth: 0,
  },

  infoLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "800",
    textTransform:
      "uppercase",
    letterSpacing:
      "0.04em",
    marginBottom: "5px",
  },

  infoValue: {
    display: "block",
    fontSize: "13px",
    overflowWrap:
      "anywhere",
    color: "#172033",
  },

  // ==========================================================
  // SECTION
  // ==========================================================

  section: {
    border:
      "1px solid #e5eaf0",
    borderRadius: "12px",
    marginBottom: "16px",
    overflow: "hidden",
    background: "#ffffff",
  },

  sectionHeader: {
    padding:
      "16px 18px",
    borderBottom:
      "1px solid #edf1f5",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    gap: "16px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "800",
    color: "#172033",
  },

  sectionSubtitle: {
    margin:
      "4px 0 0",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  // ==========================================================
  // EDIT BUTTON
  // ==========================================================

  editButton: {
    border:
      "1px solid #b9dfe3",
    background: "#f0fbfc",
    color: "#087f8c",
    borderRadius: "8px",
    padding:
      "9px 13px",
    fontWeight: "800",
    cursor: "pointer",
    whiteSpace:
      "nowrap",
  },

  // ==========================================================
  // TEST LIST
  // ==========================================================

  testList: {
    padding: "14px",
    display: "grid",
    gap: "12px",
  },

  testCard: {
    border:
      "1px solid #e5eaf0",
    borderRadius: "10px",
    overflow: "hidden",
  },

  testHeader: {
    padding:
      "13px 14px",
    background: "#f8fafc",
    borderBottom:
      "1px solid #e5eaf0",
    display: "flex",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    gap: "15px",
  },

  testName: {
    margin: 0,
    fontSize: "14px",
    fontWeight: "800",
    color: "#172033",
  },

  sample: {
    display: "inline-block",
    marginTop: "4px",
    color: "#64748b",
    fontSize: "11px",
  },

  testKey: {
    fontSize: "10px",
    color: "#94a3b8",
    fontFamily:
      "monospace",
    background: "#ffffff",
    border:
      "1px solid #e2e8f0",
    padding:
      "4px 7px",
    borderRadius: "6px",
  },

  // ==========================================================
  // RESULT TABLE
  // ==========================================================

  resultTableWrap: {
    width: "100%",
    overflowX: "auto",
    WebkitOverflowScrolling:
      "touch",
  },

  resultTable: {
    width: "100%",
    borderCollapse:
      "collapse",
    minWidth: "560px",
  },

  resultTh: {
    padding:
      "10px 12px",
    textAlign: "left",
    color: "#64748b",
    fontSize: "10px",
    textTransform:
      "uppercase",
    letterSpacing:
      "0.04em",
    borderBottom:
      "1px solid #edf1f5",
    background: "#ffffff",
  },

  resultTd: {
    padding:
      "11px 12px",
    borderBottom:
      "1px solid #f1f5f9",
    fontSize: "13px",
    verticalAlign:
      "middle",
  },

  parameterName: {
    fontWeight: "600",
    color: "#263247",
  },

  // ==========================================================
  // RESULT
  // ==========================================================

  resultValue: {
    fontWeight: "800",
    display: "inline-block",
    minWidth: "80px",
  },

  resultEntered: {
    color: "#172033",
  },

  resultMissing: {
    color: "#94a3b8",
    fontWeight: "700",
  },

  resultInput: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "40px",
    border:
      "1px solid #b8c7d9",
    borderRadius: "7px",
    padding:
      "8px 10px",
    outline: "none",
    fontSize: "13px",
    background: "#ffffff",
    color: "#172033",
  },

  unit: {
    color: "#475569",
    whiteSpace:
      "nowrap",
  },

  // ==========================================================
  // NOTES
  // ==========================================================

  notesEditor: {
    padding: "12px",
  },

  textarea: {
    width: "100%",
    minHeight: "120px",
    boxSizing: "border-box",
    border:
      "1px solid #dbe3eb",
    borderRadius: "9px",
    outline: "none",
    resize: "vertical",
    padding: "13px",
    fontSize: "13px",
    fontFamily: "inherit",
    color: "#172033",
    lineHeight: 1.6,
  },

  notesBox: {
    padding: "15px",
    color: "#475569",
    fontSize: "13px",
    lineHeight: 1.6,
    whiteSpace:
      "pre-wrap",
    minHeight: "55px",
  },

  // ==========================================================
  // WARNING
  // ==========================================================

  warningBox: {
    border:
      "1px solid #fed7aa",
    background: "#fff7ed",
    borderRadius: "10px",
    padding: "15px",
    marginBottom: "4px",
  },

  warningTitle: {
    color: "#c2410c",
    fontWeight: "800",
    fontSize: "14px",
  },

  warningText: {
    margin:
      "6px 0 12px",
    color: "#9a3412",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  reasonInput: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "44px",
    border:
      "1px solid #fdba74",
    borderRadius: "8px",
    padding:
      "9px 11px",
    outline: "none",
    fontSize: "13px",
    background: "#ffffff",
    color: "#172033",
  },

  // ==========================================================
  // FOOTER
  // ==========================================================

  modalFooter: {
    flexShrink: 0,
    padding:
      "15px 24px",
    borderTop:
      "1px solid #e5e7eb",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    gap: "15px",
    background: "#ffffff",
  },

  footerStatus: {
    color: "#64748b",
    fontSize: "13px",
    display: "flex",
    alignItems:
      "center",
    gap: "7px",
  },

  footerActions: {
    display: "flex",
    gap: "9px",
    alignItems:
      "center",
    flexWrap: "wrap",
    justifyContent:
      "flex-end",
  },

  secondaryButton: {
    border:
      "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    borderRadius: "8px",
    padding:
      "10px 14px",
    fontWeight: "800",
    cursor: "pointer",
  },

  saveButton: {
    border: "none",
    background: "#087f8c",
    color: "#ffffff",
    borderRadius: "8px",
    padding:
      "10px 15px",
    fontWeight: "800",
    cursor: "pointer",
  },

  processButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    borderRadius: "8px",
    padding:
      "10px 15px",
    fontWeight: "800",
    cursor: "pointer",
  },

  completeButton: {
    border: "none",
    background: "#15803d",
    color: "#ffffff",
    borderRadius: "8px",
    padding:
      "10px 15px",
    fontWeight: "800",
    cursor: "pointer",
  },
};