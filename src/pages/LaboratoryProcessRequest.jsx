import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const STATUS_OPTIONS = ["All", "Pending", "Processing", "Completed", "Cancelled"];

const EMPTY_EDIT = {
  results: {},
  laboratory_notes: "",
};

function text(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeTests(rawTests, results = {}) {
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

  const definitions = {
    cbc: {
      name: "Complete Blood Count",
      parameters: [
        { key: "hemoglobin", label: "Hemoglobin", unit: "g/dL" },
        { key: "wbc", label: "White Blood Cells", unit: "10³/µL" },
        { key: "rbc", label: "Red Blood Cells", unit: "10⁶/µL" },
        { key: "hematocrit", label: "Hematocrit", unit: "%" },
        { key: "platelets", label: "Platelets", unit: "10³/µL" },
      ],
    },

    "blood-glucose": {
      name: "Blood Glucose",
      parameters: [
        { key: "glucose", label: "Glucose", unit: "mg/dL" },
      ],
    },

    glucose: {
      name: "Glucose",
      parameters: [
        { key: "glucose", label: "Glucose", unit: "mg/dL" },
      ],
    },

    albumin: {
      name: "Albumin",
      parameters: [
        { key: "albumin", label: "Albumin", unit: "g/dL" },
      ],
    },

    alt: {
      name: "ALT",
      parameters: [
        { key: "alt", label: "ALT", unit: "U/L" },
      ],
    },

    ast: {
      name: "AST",
      parameters: [
        { key: "ast", label: "AST", unit: "U/L" },
      ],
    },

    bilirubin: {
      name: "Bilirubin",
      parameters: [
        { key: "bilirubin", label: "Bilirubin", unit: "mg/dL" },
      ],
    },

    creatinine: {
      name: "Creatinine",
      parameters: [
        { key: "creatinine", label: "Creatinine", unit: "mg/dL" },
      ],
    },

    urea: {
      name: "Urea",
      parameters: [
        { key: "urea", label: "Urea", unit: "mg/dL" },
      ],
    },

    cholesterol: {
      name: "Cholesterol",
      parameters: [
        { key: "cholesterol", label: "Total Cholesterol", unit: "mg/dL" },
      ],
    },

    triglycerides: {
      name: "Triglycerides",
      parameters: [
        { key: "triglycerides", label: "Triglycerides", unit: "mg/dL" },
      ],
    },

    "blood-group": {
      name: "Blood Group",
      parameters: [
        { key: "blood-group", label: "Blood Group", unit: "" },
      ],
    },

    "kidney-function": {
      name: "Kidney Function Test",
      parameters: [
        { key: "creatinine", label: "Creatinine", unit: "mg/dL" },
        { key: "urea", label: "Urea", unit: "mg/dL" },
      ],
    },

    "liver-function": {
      name: "Liver Function Test",
      parameters: [
        { key: "alt", label: "ALT", unit: "U/L" },
        { key: "ast", label: "AST", unit: "U/L" },
        { key: "albumin", label: "Albumin", unit: "g/dL" },
        { key: "bilirubin", label: "Bilirubin", unit: "mg/dL" },
        {
          key: "alkaline-phosphatase",
          label: "Alkaline Phosphatase",
          unit: "U/L",
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
        },
        {
          key: "triglycerides",
          label: "Triglycerides",
          unit: "mg/dL",
        },
      ],
    },

    urinalysis: {
      name: "Urinalysis",
      parameters: [
        { key: "appearance", label: "Appearance", unit: "" },
        { key: "protein", label: "Protein", unit: "" },
        { key: "glucose", label: "Glucose", unit: "" },
      ],
    },

    malaria: {
      name: "Malaria Test",
      parameters: [
        { key: "malaria", label: "Malaria Result", unit: "" },
      ],
    },

    hiv: {
      name: "HIV Test",
      parameters: [
        { key: "hiv", label: "HIV Result", unit: "" },
      ],
    },

    pregnancy: {
      name: "Pregnancy Test",
      parameters: [
        { key: "pregnancy", label: "Pregnancy Result", unit: "" },
      ],
    },

    "stool-test": {
      name: "Stool Examination",
      parameters: [
        { key: "stool", label: "Stool Examination", unit: "" },
      ],
    },
  };

  const safeResults =
    results &&
    typeof results === "object" &&
    !Array.isArray(results)
      ? results
      : {};

  return rawTests.map((rawTest, index) => {
    let key = "";
    let name = "";
    let sample = "";
    let parameters = [];

    if (typeof rawTest === "string") {
      key = rawTest.trim().toLowerCase();
      name = rawTest;
    } else if (
      rawTest &&
      typeof rawTest === "object"
    ) {
      key = String(
        rawTest.value ||
          rawTest.type ||
          rawTest.key ||
          rawTest.id ||
          ""
      )
        .trim()
        .toLowerCase();

      name = String(
        rawTest.label ||
          rawTest.name ||
          rawTest.title ||
          ""
      );

      sample = String(rawTest.sample || "");

      if (
        Array.isArray(rawTest.parameters) &&
        rawTest.parameters.length > 0
      ) {
        parameters = rawTest.parameters;
      }
    }

    const definition = definitions[key];

    /*
      First choice:
      parameters saved with the request.
    */
    if (parameters.length === 0 && definition) {
      parameters = definition.parameters;
    }

    /*
      VERY IMPORTANT:
      If neither the request nor the definition gives us
      parameters, look inside RESULTS.

      Example:
      {
        "cbc.hemoglobin": "13.5",
        "cbc.wbc": "7.2"
      }

      This lets Admin discover the parameters directly.
    */
    if (parameters.length === 0 && key) {
      const prefix = `${key}.`;

      const discovered = Object.keys(safeResults)
        .filter((resultKey) =>
          resultKey.toLowerCase().startsWith(prefix)
        )
        .map((resultKey) => {
          const parameterKey = resultKey.slice(
            prefix.length
          );

          return {
            key: parameterKey,
            label: parameterKey
              .replace(/[-_]/g, " ")
              .replace(/\b\w/g, (letter) =>
                letter.toUpperCase()
              ),
            unit: "",
          };
        });

      parameters = discovered;
    }

    return {
      id: `${key || "test"}-${index}`,
      key: key || `test-${index}`,
      name:
        name ||
        definition?.name ||
        key ||
        "Laboratory Test",
      sample,
      parameters: parameters.map(
        (parameter, parameterIndex) => ({
          key: String(
            parameter.key ||
              parameter.value ||
              parameter.name ||
              `parameter-${parameterIndex}`
          ),
          label: String(
            parameter.label ||
              parameter.name ||
              parameter.value ||
              parameter.key ||
              `Parameter ${parameterIndex + 1}`
          ),
          unit: String(parameter.unit || ""),
        })
      ),
    };
  });
}

function normalizeResults(results) {
  if (!results || typeof results !== "object" || Array.isArray(results)) {
    return {};
  }
  return results;
}

function getResultValue(results, testKey, parameterKey) {
  const testResult = results?.[testKey];

  if (testResult === null || testResult === undefined) return "";

  if (typeof testResult === "object" && !Array.isArray(testResult)) {
    return text(testResult[parameterKey], "");
  }

  return text(testResult, "");
}

function setNestedResult(results, testKey, parameterKey, value) {
  return {
    ...results,
    [testKey]: {
      ...(results[testKey] &&
      typeof results[testKey] === "object" &&
      !Array.isArray(results[testKey])
        ? results[testKey]
        : {}),
      [parameterKey]: value,
    },
  };
}

function getStatusClass(status) {
  return String(status || "").toLowerCase().replace(/\s+/g, "-");
}

export default function AdminLaboratoryWork() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editReason, setEditReason] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: requestError } = await supabase
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
        .order("created_at", { ascending: false });

      if (requestError) throw requestError;

      const rows = data || [];

      const patientIds = [
        ...new Set(rows.map((row) => row.patient_id).filter(Boolean)),
      ];

      const profileIds = [
        ...new Set(
          rows
            .flatMap((row) => [row.requested_by, row.processed_by])
            .filter(Boolean)
        ),
      ];

      const patientsPromise = patientIds.length
        ? supabase.from("patients").select("*").in("id", patientIds)
        : Promise.resolve({ data: [], error: null });

      const profilesPromise = profileIds.length
        ? supabase
            .from("profiles")
            .select("id, full_name, username, role")
            .in("id", profileIds)
        : Promise.resolve({ data: [], error: null });

      const [patientsResult, profilesResult] = await Promise.all([
        patientsPromise,
        profilesPromise,
      ]);

      if (patientsResult.error) throw patientsResult.error;
      if (profilesResult.error) throw profilesResult.error;

      const patientMap = new Map(
        (patientsResult.data || []).map((patient) => [patient.id, patient])
      );

      const profileMap = new Map(
        (profilesResult.data || []).map((profile) => [profile.id, profile])
      );

      const enriched = rows.map((row) => ({
        ...row,
        patient: patientMap.get(row.patient_id) || null,
        requester: profileMap.get(row.requested_by) || null,
        technician: profileMap.get(row.processed_by) || null,
      }));

      setRequests(enriched);

      if (selectedRequest) {
        const updatedSelected = enriched.find(
          (item) => item.id === selectedRequest.id
        );

        if (updatedSelected) {
          setSelectedRequest(updatedSelected);
          setEditForm({
            results: normalizeResults(updatedSelected.results),
            laboratory_notes: updatedSelected.laboratory_notes || "",
          });
        }
      }
    } catch (loadError) {
      console.error("Admin laboratory work load error:", loadError);
      setError(loadError?.message || "Unable to load laboratory work.");
    } finally {
      setLoading(false);
    }
  }, [selectedRequest]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requests.filter((request) => {
      if (
        statusFilter !== "All" &&
        String(request.status || "") !== statusFilter
      ) {
        return false;
      }

      if (!query) return true;

      const patient = request.patient || {};
      const requester = request.requester || {};
      const technician = request.technician || {};

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

      return haystack.includes(query);
    });
  }, [requests, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === "Pending").length,
      processing: requests.filter((r) => r.status === "Processing").length,
      completed: requests.filter((r) => r.status === "Completed").length,
    };
  }, [requests]);

  function openRequest(request) {
    setSelectedRequest(request);
    setEditMode(false);
    setEditReason("");
    setEditForm({
      results: normalizeResults(request.results),
      laboratory_notes: request.laboratory_notes || "",
    });
    setError("");
    setSuccess("");
  }

  function closeRequest() {
    if (saving) return;
    setSelectedRequest(null);
    setEditMode(false);
    setEditReason("");
    setError("");
    setSuccess("");
  }

  function updateResult(testKey, parameterKey, value) {
    setEditForm((current) => ({
      ...current,
      results: setNestedResult(
        current.results,
        testKey,
        parameterKey,
        value
      ),
    }));
  }

  async function saveResults() {
    if (!selectedRequest) return;

    if (!editReason.trim()) {
      setError("Please enter a reason for the correction.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Your admin session has expired. Please log in again.");
      }

      const { data: updated, error: updateError } = await supabase
        .from("laboratory_requests")
        .update({
          results: editForm.results,
          laboratory_notes: editForm.laboratory_notes || null,
        })
        .eq("id", selectedRequest.id)
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

      if (updateError) throw updateError;

      // Audit history is intentionally optional here. The main result update
      // works with the current laboratory_requests schema. If you later add
      // laboratory_result_edits, this is the place to insert the audit row.

      const updatedRequest = {
        ...selectedRequest,
        ...updated,
      };

      setRequests((current) =>
        current.map((item) =>
          item.id === updatedRequest.id ? updatedRequest : item
        )
      );

      setSelectedRequest(updatedRequest);
      setEditMode(false);
      setEditReason("");
      setSuccess("Laboratory results updated successfully.");
    } catch (saveError) {
      console.error("Admin laboratory result update error:", saveError);
      setError(saveError?.message || "Unable to update laboratory results.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(newStatus) {
    if (!selectedRequest) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { data: updated, error: updateError } = await supabase
        .from("laboratory_requests")
        .update({ status: newStatus })
        .eq("id", selectedRequest.id)
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

      if (updateError) throw updateError;

      const updatedRequest = {
        ...selectedRequest,
        ...updated,
      };

      setRequests((current) =>
        current.map((item) =>
          item.id === updatedRequest.id ? updatedRequest : item
        )
      );
      setSelectedRequest(updatedRequest);
      setSuccess(`Request status changed to ${newStatus}.`);
    } catch (statusError) {
      console.error("Admin status update error:", statusError);
      setError(statusError?.message || "Unable to update request status.");
    } finally {
      setSaving(false);
    }
  }

  const tests = normalizeTests(selectedRequest?.tests);
  const canEdit = Boolean(selectedRequest);
  const patient = selectedRequest?.patient || {};
  const requester = selectedRequest?.requester || {};
  const technician = selectedRequest?.technician || {};

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <button
            type="button"
            style={styles.backButton}
            onClick={() => navigate("/admin")}
          >
            ← Admin Dashboard
          </button>

          <div style={styles.titleRow}>
            <div>
              <h1 style={styles.title}>Laboratory Work</h1>
              <p style={styles.subtitle}>
                Review laboratory requests, technician work, and completed
                results.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          style={styles.refreshButton}
          onClick={loadRequests}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </header>

      <main style={styles.container}>
        <div style={styles.statsGrid}>
          <StatCard label="Total Requests" value={stats.total} />
          <StatCard label="Pending" value={stats.pending} />
          <StatCard label="Processing" value={stats.processing} />
          <StatCard label="Completed" value={stats.completed} />
        </div>

        <section style={styles.card}>
          <div style={styles.toolbar}>
            <div style={styles.searchWrap}>
              <span style={styles.searchIcon}>⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search patient, nurse, technician, or request ID..."
                style={styles.search}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={styles.select}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === "All" ? "All statuses" : status}
                </option>
              ))}
            </select>
          </div>

          {error && !selectedRequest && (
            <div style={styles.error}>{error}</div>
          )}

          {success && !selectedRequest && (
            <div style={styles.success}>{success}</div>
          )}

          {loading ? (
            <div style={styles.empty}>Loading laboratory work...</div>
          ) : filteredRequests.length === 0 ? (
            <div style={styles.empty}>
              <strong>No laboratory requests found.</strong>
              <span>Try changing your search or status filter.</span>
            </div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Request</th>
                    <th style={styles.th}>Patient</th>
                    <th style={styles.th}>Nurse</th>
                    <th style={styles.th}>Laboratory Technician</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Payment</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request.id}>
                      <td style={styles.td}>
                        <strong>#{request.id}</strong>
                      </td>

                      <td style={styles.td}>
                        <div style={styles.primaryText}>
                          {text(
                            request.patient?.full_name ||
                              request.patient?.name,
                            "Unknown patient"
                          )}
                        </div>
                        <div style={styles.secondaryText}>
                          {text(
                            request.patient?.patient_number ||
                              request.patient?.phone,
                            ""
                          )}
                        </div>
                      </td>

                      <td style={styles.td}>
                        {text(request.requester?.full_name)}
                      </td>

                      <td style={styles.td}>
                        {request.technician
                          ? text(request.technician.full_name)
                          : "Not assigned"}
                      </td>

                      <td style={styles.td}>
                        {formatDate(request.request_date || request.created_at)}
                      </td>

                      <td style={styles.td}>
                        <span
                          className={`status ${getStatusClass(
                            request.status
                          )}`}
                          style={styles.status}
                        >
                          {text(request.status)}
                        </span>
                      </td>

                      <td style={styles.td}>
                        {request.payment_id ? (
                          <span style={styles.paid}>Paid</span>
                        ) : (
                          <span style={styles.unpaid}>Unpaid</span>
                        )}
                      </td>

                      <td style={styles.td}>
                        <button
                          type="button"
                          style={styles.viewButton}
                          onClick={() => openRequest(request)}
                        >
                          View Work
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {selectedRequest && (
        <div style={styles.overlay} onMouseDown={closeRequest}>
          <div
            style={styles.modal}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalEyebrow}>
                  Laboratory Request #{selectedRequest.id}
                </div>
                <h2 style={styles.modalTitle}>Laboratory Work Review</h2>
              </div>

              <button
                type="button"
                style={styles.closeButton}
                onClick={closeRequest}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <div style={styles.modalBody}>
              {error && <div style={styles.error}>{error}</div>}
              {success && <div style={styles.success}>{success}</div>}

              <div style={styles.infoGrid}>
                <Info label="Patient" value={text(patient.full_name || patient.name)} />
                <Info label="Patient ID" value={text(patient.patient_number || patient.id)} />
                <Info label="Requested by" value={text(requester.full_name)} />
                <Info label="Laboratory Technician" value={text(technician.full_name, "Not assigned")} />
                <Info label="Request Date" value={formatDate(selectedRequest.request_date || selectedRequest.created_at)} />
                <Info label="Completed" value={formatDateTime(selectedRequest.completed_at || selectedRequest.completed_date)} />
                <Info label="Status" value={text(selectedRequest.status)} />
                <Info
                  label="Payment"
                  value={selectedRequest.payment_id ? `Paid (#${selectedRequest.payment_id})` : "Unpaid"}
                />
              </div>

              <section style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div>
                    <h3 style={styles.sectionTitle}>Requested Tests & Results</h3>
                    <p style={styles.sectionSubtitle}>
                      Review the technician's submitted laboratory results.
                    </p>
                  </div>

                  {!editMode && canEdit && (
                    <button
                      type="button"
                      style={styles.editButton}
                      onClick={() => {
                        setEditMode(true);
                        setError("");
                        setSuccess("");
                      }}
                    >
                      ✎ Edit Results
                    </button>
                  )}
                </div>

                {tests.length === 0 ? (
                  <div style={styles.emptySmall}>
                    No tests are attached to this request.
                  </div>
                ) : (
                  <div style={styles.testList}>
                    {tests.map((test) => (
                      <div key={test.id} style={styles.testCard}>
                        <div style={styles.testHeader}>
                          <div>
                            <h4 style={styles.testName}>{test.name}</h4>
                            {test.sample && (
                              <span style={styles.sample}>
                                Sample: {test.sample}
                              </span>
                            )}
                          </div>
                        </div>

                        {test.parameters.length === 0 ? (
                          <div style={styles.emptySmall}>
                            No individual parameters were provided.
                          </div>
                        ) : (
                          <div style={styles.resultTableWrap}>
                            <table style={styles.resultTable}>
                              <thead>
                                <tr>
                                  <th style={styles.resultTh}>Parameter</th>
                                  <th style={styles.resultTh}>Result</th>
                                  <th style={styles.resultTh}>Unit</th>
                                </tr>
                              </thead>

                              <tbody>
                                {test.parameters.map((parameter) => {
                                  const value = getResultValue(
                                    editMode
                                      ? editForm.results
                                      : normalizeResults(selectedRequest.results),
                                    test.key,
                                    parameter.key
                                  );

                                  return (
                                    <tr key={`${test.key}-${parameter.key}`}>
                                      <td style={styles.resultTd}>
                                        {parameter.label}
                                      </td>

                                      <td style={styles.resultTd}>
                                        {editMode ? (
                                          <input
                                            value={value}
                                            onChange={(event) =>
                                              updateResult(
                                                test.key,
                                                parameter.key,
                                                event.target.value
                                              )
                                            }
                                            placeholder="Enter result"
                                            style={styles.resultInput}
                                            disabled={saving}
                                          />
                                        ) : (
                                          <span style={styles.resultValue}>
                                            {text(value, "Not entered")}
                                          </span>
                                        )}
                                      </td>

                                      <td style={styles.resultTd}>
                                        {text(parameter.unit, "—")}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div>
                    <h3 style={styles.sectionTitle}>Laboratory Notes</h3>
                    <p style={styles.sectionSubtitle}>
                      Notes submitted by the laboratory technician.
                    </p>
                  </div>
                </div>

                {editMode ? (
                  <textarea
                    value={editForm.laboratory_notes}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        laboratory_notes: event.target.value,
                      }))
                    }
                    placeholder="Enter laboratory notes..."
                    style={styles.textarea}
                    disabled={saving}
                  />
                ) : (
                  <div style={styles.notesBox}>
                    {text(selectedRequest.laboratory_notes, "No laboratory notes.")}
                  </div>
                )}
              </section>

              {editMode && (
                <section style={styles.warningBox}>
                  <strong>Administrator correction</strong>
                  <p>
                    Changes made here will update the official laboratory
                    result. Enter a clear reason for the correction.
                  </p>

                  <input
                    value={editReason}
                    onChange={(event) => setEditReason(event.target.value)}
                    placeholder="Reason for correction"
                    style={styles.reasonInput}
                    disabled={saving}
                  />
                </section>
              )}
            </div>

            <div style={styles.modalFooter}>
              <div style={styles.footerStatus}>
                Status:{" "}
                <strong>{text(selectedRequest.status)}</strong>
              </div>

              <div style={styles.footerActions}>
                {editMode ? (
                  <>
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => {
                        setEditMode(false);
                        setEditReason("");
                        setEditForm({
                          results: normalizeResults(selectedRequest.results),
                          laboratory_notes:
                            selectedRequest.laboratory_notes || "",
                        });
                        setError("");
                      }}
                      disabled={saving}
                    >
                      Cancel Edit
                    </button>

                    <button
                      type="button"
                      style={styles.saveButton}
                      onClick={saveResults}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Correction"}
                    </button>
                  </>
                ) : (
                  <>
                    {selectedRequest.status === "Pending" && (
                      <button
                        type="button"
                        style={styles.processButton}
                        onClick={() => updateStatus("Processing")}
                        disabled={saving}
                      >
                        {saving ? "Updating..." : "Start Processing"}
                      </button>
                    )}

                    {selectedRequest.status === "Processing" && (
                      <button
                        type="button"
                        style={styles.completeButton}
                        onClick={() => updateStatus("Completed")}
                        disabled={saving}
                      >
                        {saving ? "Updating..." : "Mark Completed"}
                      </button>
                    )}

                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={closeRequest}
                      disabled={saving}
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

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <span style={styles.statLabel}>{label}</span>
      <strong style={styles.statValue}>{value}</strong>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div style={styles.infoItem}>
      <span style={styles.infoLabel}>{label}</span>
      <strong style={styles.infoValue}>{value}</strong>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f8fb",
    color: "#172033",
    fontFamily: "Inter, Arial, sans-serif",
  },

  header: {
    minHeight: "96px",
    padding: "18px 32px",
    boxSizing: "border-box",
    background: "#ffffff",
    borderBottom: "1px solid #e4eaf0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
  },

  backButton: {
    border: "none",
    background: "transparent",
    color: "#087f8c",
    fontWeight: "700",
    padding: "0",
    cursor: "pointer",
    marginBottom: "8px",
  },

  titleRow: {
    display: "flex",
    alignItems: "center",
  },

  title: {
    margin: "0",
    fontSize: "28px",
    lineHeight: "1.2",
    fontWeight: "800",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  refreshButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    borderRadius: "9px",
    padding: "10px 15px",
    fontWeight: "700",
    cursor: "pointer",
  },

  container: {
    maxWidth: "1500px",
    margin: "0 auto",
    padding: "26px 32px 50px",
    boxSizing: "border-box",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "16px",
    marginBottom: "18px",
  },

  statCard: {
    background: "#ffffff",
    border: "1px solid #e4eaf0",
    borderRadius: "14px",
    padding: "18px 20px",
    boxShadow: "0 3px 12px rgba(15, 23, 42, 0.04)",
  },

  statLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },

  statValue: {
    display: "block",
    marginTop: "7px",
    fontSize: "25px",
  },

  card: {
    background: "#ffffff",
    border: "1px solid #e4eaf0",
    borderRadius: "14px",
    boxShadow: "0 3px 12px rgba(15, 23, 42, 0.04)",
    overflow: "hidden",
  },

  toolbar: {
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    borderBottom: "1px solid #edf1f5",
  },

  searchWrap: {
    position: "relative",
    flex: 1,
  },

  searchIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94a3b8",
    fontSize: "19px",
  },

  search: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "44px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    padding: "10px 12px 10px 36px",
    outline: "none",
    fontSize: "14px",
    background: "#ffffff",
  },

  select: {
    minHeight: "44px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    padding: "0 12px",
    background: "#ffffff",
    color: "#334155",
    fontWeight: "600",
    minWidth: "150px",
  },

  tableWrap: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "1100px",
  },

  th: {
    textAlign: "left",
    padding: "13px 15px",
    background: "#f8fafc",
    color: "#64748b",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "15px",
    borderBottom: "1px solid #edf1f5",
    verticalAlign: "middle",
    fontSize: "13px",
  },

  primaryText: {
    fontWeight: "700",
  },

  secondaryText: {
    color: "#94a3b8",
    fontSize: "11px",
    marginTop: "3px",
  },

  status: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    padding: "5px 9px",
    fontSize: "11px",
    fontWeight: "800",
    background: "#eef2f7",
    color: "#475569",
  },

  paid: {
    color: "#15803d",
    fontWeight: "800",
  },

  unpaid: {
    color: "#b45309",
    fontWeight: "800",
  },

  viewButton: {
    border: "1px solid #b9dfe3",
    background: "#f0fbfc",
    color: "#087f8c",
    borderRadius: "8px",
    padding: "8px 11px",
    fontWeight: "800",
    cursor: "pointer",
  },

  empty: {
    minHeight: "260px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    color: "#64748b",
    padding: "30px",
    textAlign: "center",
  },

  emptySmall: {
    padding: "18px",
    borderRadius: "9px",
    background: "#f8fafc",
    color: "#64748b",
    fontSize: "13px",
  },

  error: {
    margin: "14px 16px 0",
    padding: "11px 13px",
    borderRadius: "9px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    fontSize: "13px",
    fontWeight: "600",
  },

  success: {
    margin: "14px 16px 0",
    padding: "11px 13px",
    borderRadius: "9px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    fontSize: "13px",
    fontWeight: "600",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "rgba(15, 23, 42, 0.48)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },

  modal: {
    width: "min(1100px, 96vw)",
    maxHeight: "94vh",
    background: "#ffffff",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 24px 80px rgba(15, 23, 42, 0.24)",
    display: "flex",
    flexDirection: "column",
  },

  modalHeader: {
    padding: "20px 24px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
  },

  modalEyebrow: {
    color: "#087f8c",
    fontSize: "12px",
    fontWeight: "800",
    marginBottom: "5px",
  },

  modalTitle: {
    margin: 0,
    fontSize: "21px",
    fontWeight: "800",
  },

  closeButton: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#475569",
    fontSize: "24px",
    lineHeight: 1,
    cursor: "pointer",
  },

  modalBody: {
    padding: "22px 24px",
    overflowY: "auto",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "10px",
    marginBottom: "22px",
  },

  infoItem: {
    border: "1px solid #e5eaf0",
    borderRadius: "10px",
    padding: "12px",
    background: "#f8fafc",
    minWidth: 0,
  },

  infoLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "10px",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "5px",
  },

  infoValue: {
    display: "block",
    fontSize: "13px",
    overflowWrap: "anywhere",
  },

  section: {
    border: "1px solid #e5eaf0",
    borderRadius: "12px",
    marginBottom: "16px",
    overflow: "hidden",
  },

  sectionHeader: {
    padding: "16px 18px",
    borderBottom: "1px solid #edf1f5",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "800",
  },

  sectionSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },

  editButton: {
    border: "1px solid #b9dfe3",
    background: "#f0fbfc",
    color: "#087f8c",
    borderRadius: "8px",
    padding: "9px 12px",
    fontWeight: "800",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  testList: {
    padding: "14px",
    display: "grid",
    gap: "12px",
  },

  testCard: {
    border: "1px solid #e5eaf0",
    borderRadius: "10px",
    overflow: "hidden",
  },

  testHeader: {
    padding: "12px 14px",
    background: "#f8fafc",
    borderBottom: "1px solid #e5eaf0",
  },

  testName: {
    margin: 0,
    fontSize: "14px",
    fontWeight: "800",
  },

  sample: {
    display: "inline-block",
    marginTop: "4px",
    color: "#64748b",
    fontSize: "11px",
  },

  resultTableWrap: {
    overflowX: "auto",
  },

  resultTable: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "520px",
  },

  resultTh: {
    padding: "10px 12px",
    textAlign: "left",
    color: "#64748b",
    fontSize: "10px",
    textTransform: "uppercase",
    borderBottom: "1px solid #edf1f5",
  },

  resultTd: {
    padding: "10px 12px",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "13px",
  },

  resultValue: {
    fontWeight: "700",
  },

  resultInput: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "38px",
    border: "1px solid #b8c7d9",
    borderRadius: "7px",
    padding: "8px 10px",
    outline: "none",
    fontSize: "13px",
    background: "#ffffff",
  },

  textarea: {
    width: "100%",
    minHeight: "120px",
    boxSizing: "border-box",
    border: "none",
    outline: "none",
    resize: "vertical",
    padding: "14px",
    fontSize: "13px",
    fontFamily: "inherit",
  },

  notesBox: {
    padding: "15px",
    color: "#475569",
    fontSize: "13px",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },

  warningBox: {
    border: "1px solid #fed7aa",
    background: "#fff7ed",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "4px",
  },

  reasonInput: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "42px",
    border: "1px solid #fdba74",
    borderRadius: "8px",
    padding: "9px 10px",
    outline: "none",
    fontSize: "13px",
    background: "#ffffff",
  },

  modalFooter: {
    padding: "15px 24px",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
  },

  footerStatus: {
    color: "#64748b",
    fontSize: "13px",
  },

  footerActions: {
    display: "flex",
    gap: "9px",
    alignItems: "center",
  },

  secondaryButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    borderRadius: "8px",
    padding: "10px 14px",
    fontWeight: "800",
    cursor: "pointer",
  },

  saveButton: {
    border: "none",
    background: "#087f8c",
    color: "#ffffff",
    borderRadius: "8px",
    padding: "10px 15px",
    fontWeight: "800",
    cursor: "pointer",
  },

  processButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    borderRadius: "8px",
    padding: "10px 15px",
    fontWeight: "800",
    cursor: "pointer",
  },

  completeButton: {
    border: "none",
    background: "#15803d",
    color: "#ffffff",
    borderRadius: "8px",
    padding: "10px 15px",
    fontWeight: "800",
    cursor: "pointer",
  },
};
