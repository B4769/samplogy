export const PAYMENT_RATE = 100;

export const TEST_OPTIONS = [
  { value: "cbc", label: "Complete Blood Count (CBC)" },
  { value: "blood-group", label: "Blood Group" },
  { value: "blood-glucose", label: "Blood Glucose" },
  { value: "liver-function", label: "Liver Function Test" },
  { value: "kidney-function", label: "Kidney Function Test" },
  { value: "lipid-profile", label: "Lipid Profile" },
  { value: "urinalysis", label: "Urinalysis" },
  { value: "stool-test", label: "Stool Examination" },
  { value: "malaria", label: "Malaria Test" },
  { value: "hiv", label: "HIV Test" },
  { value: "pregnancy", label: "Pregnancy Test" },
];

export const TEST_NAME_BY_VALUE = Object.fromEntries(
  TEST_OPTIONS.map((test) => [test.value, test.label])
);

export function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatMonth(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function getCurrentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function getTestValue(test, index) {
  if (typeof test === "string") return test;
  return test?.value || test?.name || test?.label || `test-${index}`;
}

export function getTestName(test) {
  if (typeof test === "string") return TEST_NAME_BY_VALUE[test] || test;
  return test?.label || TEST_NAME_BY_VALUE[test?.value] || test?.name || test?.value || "Laboratory Test";
}

export function normalizeTests(tests) {
  if (!Array.isArray(tests)) return [];
  return tests.map((test, index) => ({ value: getTestValue(test, index), label: getTestName(test) }));
}

export function getStatusStyle(status) {
  const styles = {
    Completed: { background: "#ecfdf5", color: "#047857" },
    Processing: { background: "#eef2ff", color: "#4f46e5" },
    Cancelled: { background: "#fff1f2", color: "#dc2626" },
  };
  return styles[status] || { background: "#fff7ed", color: "#c2410c" };
}
