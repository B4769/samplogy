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

export function getTestName(test) {
  if (test === null || test === undefined) return "Laboratory Test";
  if (typeof test === "number") return String(test);

  const value = typeof test === "string"
    ? test
    : test.label ?? test.name ?? test.value ?? test.test_name ?? test.testName ?? test.type ?? test.code;

  if (value === null || value === undefined) return "Laboratory Test";
  const name = String(value);
  return TEST_NAMES[name.toLowerCase().trim()] || name;
}
