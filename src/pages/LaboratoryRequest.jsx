import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

/* =====================================================
   LABORATORY TEST DATABASE
===================================================== */

const testCategories = [
  {
    id: "hematology",
    title: "Hematology",
    tests: [
      {
        value: "cbc",
        label: "Complete Blood Count (CBC)",
        sample: "Whole Blood",
        type: "panel",
        parameters: [
          {
            value: "hemoglobin",
            label: "Hemoglobin",
            unit: "g/dL",
            reference: {
              male: "13.0–17.0",
              female: "12.0–15.0",
            },
          },
          {
            value: "hematocrit",
            label: "Hematocrit (HCT)",
            unit: "%",
            reference: {
              male: "40–54",
              female: "36–46",
            },
          },
          {
            value: "rbc",
            label: "Red Blood Cell Count (RBC)",
            unit: "×10⁶/µL",
            reference: {
              male: "4.5–5.9",
              female: "4.0–5.2",
            },
          },
          {
            value: "wbc",
            label: "White Blood Cell Count (WBC)",
            unit: "×10³/µL",
            reference: {
              all: "4.0–11.0",
            },
          },
          {
            value: "neutrophils",
            label: "Neutrophils",
            unit: "%",
            reference: {
              all: "40–70",
            },
          },
          {
            value: "lymphocytes",
            label: "Lymphocytes",
            unit: "%",
            reference: {
              all: "20–40",
            },
          },
          {
            value: "monocytes",
            label: "Monocytes",
            unit: "%",
            reference: {
              all: "2–8",
            },
          },
          {
            value: "eosinophils",
            label: "Eosinophils",
            unit: "%",
            reference: {
              all: "1–4",
            },
          },
          {
            value: "basophils",
            label: "Basophils",
            unit: "%",
            reference: {
              all: "0–1",
            },
          },
          {
            value: "platelets",
            label: "Platelet Count",
            unit: "×10³/µL",
            reference: {
              all: "150–450",
            },
          },
          {
            value: "mcv",
            label: "Mean Corpuscular Volume (MCV)",
            unit: "fL",
            reference: {
              all: "80–100",
            },
          },
          {
            value: "mch",
            label: "Mean Corpuscular Hemoglobin (MCH)",
            unit: "pg",
            reference: {
              all: "27–33",
            },
          },
          {
            value: "mchc",
            label: "Mean Corpuscular Hemoglobin Concentration (MCHC)",
            unit: "g/dL",
            reference: {
              all: "32–36",
            },
          },
          {
            value: "rdw",
            label: "Red Cell Distribution Width (RDW)",
            unit: "%",
            reference: {
              all: "11.5–14.5",
            },
          },
        ],
      },

      {
        value: "differential",
        label: "Differential Count",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "neutrophils-diff",
            label: "Neutrophils",
            unit: "%",
            reference: {
              all: "40–70",
            },
          },
          {
            value: "lymphocytes-diff",
            label: "Lymphocytes",
            unit: "%",
            reference: {
              all: "20–40",
            },
          },
          {
            value: "monocytes-diff",
            label: "Monocytes",
            unit: "%",
            reference: {
              all: "2–8",
            },
          },
          {
            value: "eosinophils-diff",
            label: "Eosinophils",
            unit: "%",
            reference: {
              all: "1–4",
            },
          },
          {
            value: "basophils-diff",
            label: "Basophils",
            unit: "%",
            reference: {
              all: "0–1",
            },
          },
        ],
      },

      {
        value: "hematocrit",
        label: "Hematocrit",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "hematocrit-value",
            label: "Hematocrit",
            unit: "%",
            reference: {
              male: "40–54",
              female: "36–46",
            },
          },
        ],
      },

      {
        value: "hemoglobin",
        label: "Hemoglobin",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "hemoglobin-value",
            label: "Hemoglobin",
            unit: "g/dL",
            reference: {
              male: "13.0–17.0",
              female: "12.0–15.0",
            },
          },
        ],
      },

      {
        value: "platelet-count",
        label: "Platelet Count",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "platelet-value",
            label: "Platelet Count",
            unit: "×10³/µL",
            reference: {
              all: "150–450",
            },
          },
        ],
      },

      {
        value: "reticulocyte",
        label: "Reticulocyte Count",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "reticulocyte-value",
            label: "Reticulocyte Count",
            unit: "%",
            reference: {
              all: "0.5–2.5",
            },
          },
        ],
      },

      {
        value: "esr",
        label: "ESR",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "esr-value",
            label: "ESR",
            unit: "mm/hr",
            reference: {
              male: "0–15",
              female: "0–20",
            },
          },
        ],
      },
    ],
  },

  /* =====================================================
     CHEMISTRY
  ===================================================== */

  {
    id: "chemistry",
    title: "Chemistry",
    tests: [
      {
        value: "glucose",
        label: "Glucose",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "glucose-value",
            label: "Glucose",
            unit: "mg/dL",
            reference: {
              all: "70–99",
            },
          },
        ],
      },

      {
        value: "albumin",
        label: "Albumin",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "albumin-value",
            label: "Albumin",
            unit: "g/dL",
            reference: {
              all: "3.5–5.0",
            },
          },
        ],
      },

      {
        value: "alt",
        label: "ALT",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "alt-value",
            label: "ALT",
            unit: "U/L",
            reference: {
              male: "7–56",
              female: "7–45",
            },
          },
        ],
      },

      {
        value: "ast",
        label: "AST",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "ast-value",
            label: "AST",
            unit: "U/L",
            reference: {
              all: "10–40",
            },
          },
        ],
      },

      {
        value: "alp",
        label: "Alkaline Phosphatase",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "alp-value",
            label: "Alkaline Phosphatase",
            unit: "U/L",
            reference: {
              all: "44–147",
            },
          },
        ],
      },

      {
        value: "bilirubin",
        label: "Bilirubin",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "bilirubin-total",
            label: "Total Bilirubin",
            unit: "mg/dL",
            reference: {
              all: "0.1–1.2",
            },
          },
          {
            value: "bilirubin-direct",
            label: "Direct Bilirubin",
            unit: "mg/dL",
            reference: {
              all: "0.0–0.3",
            },
          },
        ],
      },

      {
        value: "bun",
        label: "BUN",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "bun-value",
            label: "Blood Urea Nitrogen",
            unit: "mg/dL",
            reference: {
              all: "7–20",
            },
          },
        ],
      },

      {
        value: "calcium",
        label: "Calcium",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "calcium-value",
            label: "Calcium",
            unit: "mg/dL",
            reference: {
              all: "8.5–10.5",
            },
          },
        ],
      },

      {
        value: "chloride",
        label: "Chloride",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "chloride-value",
            label: "Chloride",
            unit: "mmol/L",
            reference: {
              all: "98–106",
            },
          },
        ],
      },

      {
        value: "cholesterol",
        label: "Cholesterol",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "cholesterol-value",
            label: "Total Cholesterol",
            unit: "mg/dL",
            reference: {
              all: "<200",
            },
          },
        ],
      },

      {
        value: "creatinine",
        label: "Creatinine",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "creatinine-value",
            label: "Creatinine",
            unit: "mg/dL",
            reference: {
              male: "0.74–1.35",
              female: "0.59–1.04",
            },
          },
        ],
      },

      {
        value: "ggt",
        label: "GGT",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "ggt-value",
            label: "Gamma-Glutamyl Transferase",
            unit: "U/L",
            reference: {
              male: "8–61",
              female: "5–36",
            },
          },
        ],
      },

      {
        value: "phosphorus",
        label: "Phosphorus",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "phosphorus-value",
            label: "Phosphorus",
            unit: "mg/dL",
            reference: {
              all: "2.5–4.5",
            },
          },
        ],
      },

      {
        value: "potassium",
        label: "Potassium",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "potassium-value",
            label: "Potassium",
            unit: "mmol/L",
            reference: {
              all: "3.5–5.1",
            },
          },
        ],
      },

      {
        value: "sodium",
        label: "Sodium",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "sodium-value",
            label: "Sodium",
            unit: "mmol/L",
            reference: {
              all: "135–145",
            },
          },
        ],
      },

      {
        value: "total-protein",
        label: "Total Protein",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "total-protein-value",
            label: "Total Protein",
            unit: "g/dL",
            reference: {
              all: "6.0–8.3",
            },
          },
        ],
      },
    ],
  },

  /* =====================================================
     MICROBIOLOGY
  ===================================================== */

  {
    id: "microbiology",
    title: "Microbiology / Body Fluids",
    tests: [
      {
        value: "aerobic-culture",
        label: "Aerobic Culture",
        sample: "Various",
        type: "single",
        parameters: [
          {
            value: "aerobic-result",
            label: "Culture Result",
            unit: "",
            reference: {
              all: "No growth",
            },
          },
        ],
      },

      {
        value: "anaerobic-culture",
        label: "Anaerobic Culture",
        sample: "Various",
        type: "single",
        parameters: [
          {
            value: "anaerobic-result",
            label: "Culture Result",
            unit: "",
            reference: {
              all: "No growth",
            },
          },
        ],
      },

      {
        value: "blood-culture",
        label: "Blood Culture",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "blood-culture-result",
            label: "Blood Culture Result",
            unit: "",
            reference: {
              all: "No growth",
            },
          },
        ],
      },

      {
        value: "gram-stain",
        label: "Gram Stain",
        sample: "Various",
        type: "single",
        parameters: [
          {
            value: "gram-result",
            label: "Gram Stain Result",
            unit: "",
            reference: {
              all: "No organisms seen",
            },
          },
        ],
      },

      {
        value: "acid-fast",
        label: "Acid-Fast Stain",
        sample: "Various",
        type: "single",
        parameters: [
          {
            value: "acid-fast-result",
            label: "Acid-Fast Result",
            unit: "",
            reference: {
              all: "Negative",
            },
          },
        ],
      },
    ],
  },

  /* =====================================================
     SEROLOGY
  ===================================================== */

  {
    id: "serology",
    title: "Serology / Infectious Diseases",
    tests: [
      {
        value: "hiv",
        label: "HIV",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "hiv-result",
            label: "HIV Result",
            unit: "",
            reference: {
              all: "Non-reactive",
            },
          },
        ],
      },

      {
        value: "hepatitis-b",
        label: "Hepatitis B",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "hbsag",
            label: "HBsAg",
            unit: "",
            reference: {
              all: "Non-reactive",
            },
          },
        ],
      },

      {
        value: "hepatitis-c",
        label: "Hepatitis C",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "hcv-result",
            label: "HCV Antibody",
            unit: "",
            reference: {
              all: "Non-reactive",
            },
          },
        ],
      },

      {
        value: "syphilis",
        label: "Syphilis",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "syphilis-result",
            label: "Syphilis Result",
            unit: "",
            reference: {
              all: "Non-reactive",
            },
          },
        ],
      },

      {
        value: "malaria",
        label: "Malaria Test",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "malaria-result",
            label: "Malaria Result",
            unit: "",
            reference: {
              all: "Negative",
            },
          },
        ],
      },

      {
        value: "h-pylori",
        label: "Helicobacter pylori",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "h-pylori-result",
            label: "H. pylori Result",
            unit: "",
            reference: {
              all: "Negative",
            },
          },
        ],
      },

      {
        value: "coronavirus",
        label: "Coronavirus",
        sample: "Swab",
        type: "single",
        parameters: [
          {
            value: "coronavirus-result",
            label: "Coronavirus Result",
            unit: "",
            reference: {
              all: "Negative",
            },
          },
        ],
      },

      {
        value: "toxoplasmosis",
        label: "Toxoplasmosis",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "toxoplasmosis-result",
            label: "Toxoplasmosis Result",
            unit: "",
            reference: {
              all: "Negative",
            },
          },
        ],
      },
    ],
  },

  /* =====================================================
     INFECTIOUS PCR
  ===================================================== */

  {
    id: "infectious-pcr",
    title: "Infectious Disease PCR",
    tests: [
      {
        value: "hiv-pcr",
        label: "HIV PCR",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "hiv-pcr-result",
            label: "HIV PCR",
            unit: "",
            reference: {
              all: "Not detected",
            },
          },
        ],
      },

      {
        value: "hbv-pcr",
        label: "HBV PCR",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "hbv-pcr-result",
            label: "HBV PCR",
            unit: "",
            reference: {
              all: "Not detected",
            },
          },
        ],
      },

      {
        value: "hcv-pcr",
        label: "HCV PCR",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "hcv-pcr-result",
            label: "HCV PCR",
            unit: "",
            reference: {
              all: "Not detected",
            },
          },
        ],
      },

      {
        value: "hpv-pcr",
        label: "HPV PCR",
        sample: "Swab",
        type: "single",
        parameters: [
          {
            value: "hpv-pcr-result",
            label: "HPV PCR",
            unit: "",
            reference: {
              all: "Not detected",
            },
          },
        ],
      },

      {
        value: "covid-pcr",
        label: "COVID-19 PCR",
        sample: "Swab",
        type: "single",
        parameters: [
          {
            value: "covid-pcr-result",
            label: "COVID-19 PCR",
            unit: "",
            reference: {
              all: "Not detected",
            },
          },
        ],
      },

      {
        value: "tb-pcr",
        label: "Tuberculosis PCR",
        sample: "Various",
        type: "single",
        parameters: [
          {
            value: "tb-pcr-result",
            label: "TB PCR",
            unit: "",
            reference: {
              all: "Not detected",
            },
          },
        ],
      },
    ],
  },

  /* =====================================================
     ENDOCRINOLOGY
  ===================================================== */

  {
    id: "endocrinology",
    title: "Endocrinology",
    tests: [
      {
        value: "cortisol",
        label: "Cortisol",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "cortisol-value",
            label: "Cortisol",
            unit: "µg/dL",
            reference: {
              all: "5–25",
            },
          },
        ],
      },

      {
        value: "estradiol",
        label: "Estradiol",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "estradiol-value",
            label: "Estradiol",
            unit: "pg/mL",
            reference: {
              all: "Varies by cycle phase",
            },
          },
        ],
      },

      {
        value: "fructosamine",
        label: "Fructosamine",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "fructosamine-value",
            label: "Fructosamine",
            unit: "µmol/L",
            reference: {
              all: "200–285",
            },
          },
        ],
      },

      {
        value: "insulin",
        label: "Insulin",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "insulin-value",
            label: "Insulin",
            unit: "µIU/mL",
            reference: {
              all: "2.6–24.9",
            },
          },
        ],
      },

      {
        value: "progesterone",
        label: "Progesterone",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "progesterone-value",
            label: "Progesterone",
            unit: "ng/mL",
            reference: {
              all: "Varies by cycle phase",
            },
          },
        ],
      },

      {
        value: "testosterone",
        label: "Testosterone",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "testosterone-value",
            label: "Testosterone",
            unit: "ng/dL",
            reference: {
              male: "300–1000",
              female: "15–70",
            },
          },
        ],
      },

      {
        value: "tsh",
        label: "TSH",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "tsh-value",
            label: "TSH",
            unit: "mIU/L",
            reference: {
              all: "0.4–4.0",
            },
          },
        ],
      },

      {
        value: "t3-t4",
        label: "T3 / T4",
        sample: "Blood",
        type: "panel",
        parameters: [
          {
            value: "t3",
            label: "T3",
            unit: "ng/dL",
            reference: {
              all: "80–200",
            },
          },
          {
            value: "t4",
            label: "T4",
            unit: "µg/dL",
            reference: {
              all: "5–12",
            },
          },
        ],
      },
    ],
  },

  /* =====================================================
     PARASITOLOGY
  ===================================================== */

  {
    id: "parasitology",
    title: "Parasitology",
    tests: [
      {
        value: "fecal-exam",
        label: "Fecal Examination",
        sample: "Stool",
        type: "single",
        parameters: [
          {
            value: "fecal-result",
            label: "Fecal Examination",
            unit: "",
            reference: {
              all: "No parasites seen",
            },
          },
        ],
      },

      {
        value: "ectoparasite",
        label: "Ectoparasite Examination",
        sample: "Skin",
        type: "single",
        parameters: [
          {
            value: "ectoparasite-result",
            label: "Ectoparasite Result",
            unit: "",
            reference: {
              all: "Negative",
            },
          },
        ],
      },

      {
        value: "ova-parasite",
        label: "Ova & Parasite",
        sample: "Stool",
        type: "single",
        parameters: [
          {
            value: "ova-result",
            label: "Ova & Parasite",
            unit: "",
            reference: {
              all: "Negative",
            },
          },
        ],
      },

      {
        value: "fecal-flotation",
        label: "Fecal Flotation",
        sample: "Stool",
        type: "single",
        parameters: [
          {
            value: "flotation-result",
            label: "Fecal Flotation",
            unit: "",
            reference: {
              all: "Negative",
            },
          },
        ],
      },

      {
        value: "parasite-panel",
        label: "Parasitology Panel",
        sample: "Various",
        type: "single",
        parameters: [
          {
            value: "parasite-panel-result",
            label: "Panel Result",
            unit: "",
            reference: {
              all: "Negative",
            },
          },
        ],
      },

      {
        value: "protozoal-stain",
        label: "Protozoal Stain",
        sample: "Stool",
        type: "single",
        parameters: [
          {
            value: "protozoal-result",
            label: "Protozoal Stain",
            unit: "",
            reference: {
              all: "Negative",
            },
          },
        ],
      },
    ],
  },

  /* =====================================================
     URINE
  ===================================================== */

  {
    id: "urine",
    title: "Urine",
    tests: [
      {
        value: "urinalysis",
        label: "Urinalysis",
        sample: "Urine",
        type: "panel",
        parameters: [
          {
            value: "urine-color",
            label: "Color",
            unit: "",
            reference: {
              all: "Pale yellow–amber",
            },
          },
          {
            value: "urine-appearance",
            label: "Appearance",
            unit: "",
            reference: {
              all: "Clear",
            },
          },
          {
            value: "urine-ph",
            label: "pH",
            unit: "",
            reference: {
              all: "4.5–8.0",
            },
          },
          {
            value: "urine-specific-gravity",
            label: "Specific Gravity",
            unit: "",
            reference: {
              all: "1.005–1.030",
            },
          },
          {
            value: "urine-protein",
            label: "Protein",
            unit: "",
            reference: {
              all: "Negative",
            },
          },
          {
            value: "urine-glucose",
            label: "Glucose",
            unit: "",
            reference: {
              all: "Negative",
            },
          },
          {
            value: "urine-blood",
            label: "Blood",
            unit: "",
            reference: {
              all: "Negative",
            },
          },
          {
            value: "urine-ketones",
            label: "Ketones",
            unit: "",
            reference: {
              all: "Negative",
            },
          },
          {
            value: "urine-nitrite",
            label: "Nitrite",
            unit: "",
            reference: {
              all: "Negative",
            },
          },
          {
            value: "urine-leukocytes",
            label: "Leukocytes",
            unit: "",
            reference: {
              all: "Negative",
            },
          },
        ],
      },

      {
        value: "urine-culture",
        label: "Urine Culture",
        sample: "Urine",
        type: "single",
        parameters: [
          {
            value: "urine-culture-result",
            label: "Culture Result",
            unit: "",
            reference: {
              all: "No growth",
            },
          },
        ],
      },

      {
        value: "urine-creatinine",
        label: "Urine Creatinine",
        sample: "Urine",
        type: "single",
        parameters: [
          {
            value: "urine-creatinine-value",
            label: "Urine Creatinine",
            unit: "mg/dL",
            reference: {
              all: "20–275",
            },
          },
        ],
      },

      {
        value: "urine-glucose",
        label: "Urine Glucose",
        sample: "Urine",
        type: "single",
        parameters: [
          {
            value: "urine-glucose-value",
            label: "Urine Glucose",
            unit: "",
            reference: {
              all: "Negative",
            },
          },
        ],
      },

      {
        value: "urine-magnesium",
        label: "Urine Magnesium",
        sample: "Urine",
        type: "single",
        parameters: [
          {
            value: "urine-magnesium-value",
            label: "Urine Magnesium",
            unit: "mg/dL",
            reference: {
              all: "Laboratory specific",
            },
          },
        ],
      },

      {
        value: "urine-protein",
        label: "Urine Protein",
        sample: "Urine",
        type: "single",
        parameters: [
          {
            value: "urine-protein-value",
            label: "Urine Protein",
            unit: "mg/dL",
            reference: {
              all: "Negative",
            },
          },
        ],
      },

      {
        value: "urine-electrolytes",
        label: "Urine Electrolytes",
        sample: "Urine",
        type: "panel",
        parameters: [
          {
            value: "urine-sodium",
            label: "Urine Sodium",
            unit: "mmol/L",
            reference: {
              all: "Laboratory specific",
            },
          },
          {
            value: "urine-potassium",
            label: "Urine Potassium",
            unit: "mmol/L",
            reference: {
              all: "Laboratory specific",
            },
          },
        ],
      },
    ],
  },

  /* =====================================================
     LIPID
  ===================================================== */

  {
    id: "lipid",
    title: "Lipid Panel",
    tests: [
      {
        value: "lipid-profile",
        label: "Lipid Profile",
        sample: "Blood",
        type: "panel",
        parameters: [
          {
            value: "total-cholesterol",
            label: "Total Cholesterol",
            unit: "mg/dL",
            reference: {
              all: "<200",
            },
          },
          {
            value: "triglycerides",
            label: "Triglycerides",
            unit: "mg/dL",
            reference: {
              all: "<150",
            },
          },
          {
            value: "hdl",
            label: "HDL",
            unit: "mg/dL",
            reference: {
              male: ">40",
              female: ">50",
            },
          },
          {
            value: "ldl",
            label: "LDL",
            unit: "mg/dL",
            reference: {
              all: "<100",
            },
          },
        ],
      },

      {
        value: "triglyceride",
        label: "Triglyceride",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "triglyceride-value",
            label: "Triglyceride",
            unit: "mg/dL",
            reference: {
              all: "<150",
            },
          },
        ],
      },

      {
        value: "hdl",
        label: "HDL",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "hdl-value",
            label: "HDL",
            unit: "mg/dL",
            reference: {
              male: ">40",
              female: ">50",
            },
          },
        ],
      },

      {
        value: "ldl",
        label: "LDL",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "ldl-value",
            label: "LDL",
            unit: "mg/dL",
            reference: {
              all: "<100",
            },
          },
        ],
      },
    ],
  },

  /* =====================================================
     LIVER
  ===================================================== */

  {
    id: "liver",
    title: "Liver Panel",
    tests: [
      {
        value: "liver-function",
        label: "Liver Function Test",
        sample: "Blood",
        type: "panel",
        parameters: [
          {
            value: "lft-alt",
            label: "ALT",
            unit: "U/L",
            reference: {
              male: "7–56",
              female: "7–45",
            },
          },
          {
            value: "lft-ast",
            label: "AST",
            unit: "U/L",
            reference: {
              all: "10–40",
            },
          },
          {
            value: "lft-alp",
            label: "Alkaline Phosphatase",
            unit: "U/L",
            reference: {
              all: "44–147",
            },
          },
          {
            value: "lft-bilirubin",
            label: "Total Bilirubin",
            unit: "mg/dL",
            reference: {
              all: "0.1–1.2",
            },
          },
          {
            value: "lft-albumin",
            label: "Albumin",
            unit: "g/dL",
            reference: {
              all: "3.5–5.0",
            },
          },
        ],
      },
    ],
  },

  /* =====================================================
     METABOLIC
  ===================================================== */

  {
    id: "metabolic",
    title: "Metabolic Panel",
    tests: [
      {
        value: "metabolic-panel",
        label: "Metabolic Panel",
        sample: "Blood",
        type: "panel",
        parameters: [
          {
            value: "metabolic-sodium",
            label: "Sodium",
            unit: "mmol/L",
            reference: {
              all: "135–145",
            },
          },
          {
            value: "metabolic-potassium",
            label: "Potassium",
            unit: "mmol/L",
            reference: {
              all: "3.5–5.1",
            },
          },
          {
            value: "metabolic-chloride",
            label: "Chloride",
            unit: "mmol/L",
            reference: {
              all: "98–106",
            },
          },
          {
            value: "metabolic-glucose",
            label: "Glucose",
            unit: "mg/dL",
            reference: {
              all: "70–99",
            },
          },
          {
            value: "metabolic-creatinine",
            label: "Creatinine",
            unit: "mg/dL",
            reference: {
              male: "0.74–1.35",
              female: "0.59–1.04",
            },
          },
        ],
      },

      {
        value: "electrolyte-panel",
        label: "Electrolyte Panel",
        sample: "Blood",
        type: "panel",
        parameters: [
          {
            value: "electrolyte-sodium",
            label: "Sodium",
            unit: "mmol/L",
            reference: {
              all: "135–145",
            },
          },
          {
            value: "electrolyte-potassium",
            label: "Potassium",
            unit: "mmol/L",
            reference: {
              all: "3.5–5.1",
            },
          },
          {
            value: "electrolyte-chloride",
            label: "Chloride",
            unit: "mmol/L",
            reference: {
              all: "98–106",
            },
          },
        ],
      },

      {
        value: "kidney-function",
        label: "Kidney Function Test",
        sample: "Blood",
        type: "panel",
        parameters: [
          {
            value: "kidney-creatinine",
            label: "Creatinine",
            unit: "mg/dL",
            reference: {
              male: "0.74–1.35",
              female: "0.59–1.04",
            },
          },
          {
            value: "kidney-bun",
            label: "BUN",
            unit: "mg/dL",
            reference: {
              all: "7–20",
            },
          },
        ],
      },

      {
        value: "blood-glucose",
        label: "Blood Glucose",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "blood-glucose-value",
            label: "Blood Glucose",
            unit: "mg/dL",
            reference: {
              all: "70–99",
            },
          },
        ],
      },
    ],
  },

  /* =====================================================
     CARDIAC
  ===================================================== */

  {
    id: "cardiac",
    title: "Cardiac Biomarker Panel",
    tests: [
      {
        value: "bnp",
        label: "BNP",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "bnp-value",
            label: "BNP",
            unit: "pg/mL",
            reference: {
              all: "<100",
            },
          },
        ],
      },

      {
        value: "crp",
        label: "CRP",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "crp-value",
            label: "C-Reactive Protein",
            unit: "mg/L",
            reference: {
              all: "<10",
            },
          },
        ],
      },

      {
        value: "troponin",
        label: "Troponin I",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "troponin-value",
            label: "Troponin I",
            unit: "ng/L",
            reference: {
              all: "<19",
            },
          },
        ],
      },

      {
        value: "ck-total",
        label: "CK Total",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "ck-total-value",
            label: "CK Total",
            unit: "U/L",
            reference: {
              male: "39–308",
              female: "26–192",
            },
          },
        ],
      },

      {
        value: "ck-mb",
        label: "CK-MB",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "ck-mb-value",
            label: "CK-MB",
            unit: "ng/mL",
            reference: {
              all: "<5",
            },
          },
        ],
      },

      {
        value: "hemoglobin-a1c",
        label: "Hemoglobin A1C",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "hba1c-value",
            label: "Hemoglobin A1C",
            unit: "%",
            reference: {
              all: "4.0–5.6",
            },
          },
        ],
      },

      {
        value: "total-iron",
        label: "Total Iron",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "iron-value",
            label: "Total Iron",
            unit: "µg/dL",
            reference: {
              male: "65–175",
              female: "50–170",
            },
          },
        ],
      },

      {
        value: "uric-acid",
        label: "Uric Acid",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "uric-acid-value",
            label: "Uric Acid",
            unit: "mg/dL",
            reference: {
              male: "3.4–7.0",
              female: "2.4–6.0",
            },
          },
        ],
      },
    ],
  },

  /* =====================================================
     BIOMARKER
  ===================================================== */

  {
    id: "biomarker",
    title: "Biomarker Immunoassay",
    tests: [
      {
        value: "ferritin",
        label: "Ferritin",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "ferritin-value",
            label: "Ferritin",
            unit: "ng/mL",
            reference: {
              male: "30–400",
              female: "13–150",
            },
          },
        ],
      },

      {
        value: "vitamin-b12",
        label: "Vitamin B12",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "b12-value",
            label: "Vitamin B12",
            unit: "pg/mL",
            reference: {
              all: "200–900",
            },
          },
        ],
      },

      {
        value: "vitamin-d",
        label: "Vitamin D",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "vitamin-d-value",
            label: "Vitamin D",
            unit: "ng/mL",
            reference: {
              all: "30–100",
            },
          },
        ],
      },

      {
        value: "pregnancy",
        label: "Pregnancy Test",
        sample: "Blood / Urine",
        type: "single",
        parameters: [
          {
            value: "pregnancy-result",
            label: "Pregnancy Test",
            unit: "",
            reference: {
              all: "Negative",
            },
          },
        ],
      },
    ],
  },

  /* =====================================================
     WATER QUALITY
  ===================================================== */

  {
    id: "water-quality",
    title: "Water Quality",
    tests: [
      {
        value: "basic-panel-ro",
        label: "Basic Panel (RO)",
        sample: "Water",
        type: "panel",
        parameters: [
          {
            value: "water-ph-basic",
            label: "pH",
            unit: "",
            reference: {
              all: "6.5–8.5",
            },
          },
          {
            value: "water-conductivity-basic",
            label: "Conductivity",
            unit: "µS/cm",
            reference: {
              all: "Laboratory specific",
            },
          },
          {
            value: "water-chlorine-basic",
            label: "Total Chlorine",
            unit: "mg/L",
            reference: {
              all: "Laboratory specific",
            },
          },
        ],
      },

      {
        value: "water-ph",
        label: "pH",
        sample: "Water",
        type: "single",
        parameters: [
          {
            value: "water-ph-value",
            label: "pH",
            unit: "",
            reference: {
              all: "6.5–8.5",
            },
          },
        ],
      },

      {
        value: "conductivity",
        label: "Conductivity",
        sample: "Water",
        type: "single",
        parameters: [
          {
            value: "conductivity-value",
            label: "Conductivity",
            unit: "µS/cm",
            reference: {
              all: "Laboratory specific",
            },
          },
        ],
      },

      {
        value: "temperature",
        label: "Temperature",
        sample: "Water",
        type: "single",
        parameters: [
          {
            value: "temperature-value",
            label: "Temperature",
            unit: "°C",
            reference: {
              all: "Laboratory specific",
            },
          },
        ],
      },

      {
        value: "ammonia",
        label: "Ammonia",
        sample: "Water",
        type: "single",
        parameters: [
          {
            value: "ammonia-value",
            label: "Ammonia",
            unit: "mg/L",
            reference: {
              all: "Laboratory specific",
            },
          },
        ],
      },

      {
        value: "copper",
        label: "Copper",
        sample: "Water",
        type: "single",
        parameters: [
          {
            value: "copper-value",
            label: "Copper",
            unit: "mg/L",
            reference: {
              all: "Laboratory specific",
            },
          },
        ],
      },

      {
        value: "urea-water",
        label: "Urea",
        sample: "Water",
        type: "single",
        parameters: [
          {
            value: "urea-water-value",
            label: "Urea",
            unit: "mg/L",
            reference: {
              all: "Laboratory specific",
            },
          },
        ],
      },

      {
        value: "nitrite",
        label: "Nitrite",
        sample: "Water",
        type: "single",
        parameters: [
          {
            value: "nitrite-value",
            label: "Nitrite",
            unit: "mg/L",
            reference: {
              all: "Laboratory specific",
            },
          },
        ],
      },

      {
        value: "nitrate",
        label: "Nitrate",
        sample: "Water",
        type: "single",
        parameters: [
          {
            value: "nitrate-value",
            label: "Nitrate",
            unit: "mg/L",
            reference: {
              all: "Laboratory specific",
            },
          },
        ],
      },

      {
        value: "total-chlorine",
        label: "Total Chlorine",
        sample: "Water",
        type: "single",
        parameters: [
          {
            value: "total-chlorine-value",
            label: "Total Chlorine",
            unit: "mg/L",
            reference: {
              all: "Laboratory specific",
            },
          },
        ],
      },
    ],
  },

  /* =====================================================
     ADDITIONAL
  ===================================================== */

  {
    id: "additional",
    title: "Additional Tests",
    tests: [
      {
        value: "blood-storage-spin",
        label: "Blood Storage / Spin",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "blood-storage-result",
            label: "Processing",
            unit: "",
            reference: {
              all: "Laboratory protocol",
            },
          },
        ],
      },

      {
        value: "cyclosporine",
        label: "Cyclosporine",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "cyclosporine-value",
            label: "Cyclosporine",
            unit: "ng/mL",
            reference: {
              all: "Laboratory specific",
            },
          },
        ],
      },

      {
        value: "digoxin",
        label: "Digoxin",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "digoxin-value",
            label: "Digoxin",
            unit: "ng/mL",
            reference: {
              all: "0.5–2.0",
            },
          },
        ],
      },

      {
        value: "phenobarbital",
        label: "Phenobarbital",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "phenobarbital-value",
            label: "Phenobarbital",
            unit: "µg/mL",
            reference: {
              all: "15–40",
            },
          },
        ],
      },

      {
        value: "selenium",
        label: "Selenium",
        sample: "Blood",
        type: "single",
        parameters: [
          {
            value: "selenium-value",
            label: "Selenium",
            unit: "µg/L",
            reference: {
              all: "70–150",
            },
          },
        ],
      },
    ],
  },
];

/* =====================================================
   HELPERS
===================================================== */

const getReferenceRange = (parameter, sex) => {
  if (!parameter?.reference) {
    return "-";
  }

  if (
    sex &&
    parameter.reference[sex]
  ) {
    return parameter.reference[sex];
  }

  return parameter.reference.all || "-";
};




/* =====================================================
   COMPONENT
===================================================== */

function LaboratoryRequest() {
  const location = useLocation();
  const navigate = useNavigate();

  const patient = location.state?.patient;

  const [selectedTests, setSelectedTests] = useState([]);

  // IMPORTANT:
  // Start with all tests collapsed.
  // The user can expand a test when they want to see parameters.
  const [expandedTests, setExpandedTests] = useState([]);

  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* =====================================================
     FILTER TESTS
  ===================================================== */

  const filteredCategories = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    if (!search) {
      return testCategories;
    }

    return testCategories
      .map((category) => ({
        ...category,

        tests: category.tests.filter((test) => {
          const categoryMatch = category.title
            .toLowerCase()
            .includes(search);

          const testMatch = test.label
            .toLowerCase()
            .includes(search);

          const sampleMatch = test.sample
            .toLowerCase()
            .includes(search);

          const parameterMatch = test.parameters?.some((parameter) =>
            parameter.label.toLowerCase().includes(search)
          );

          return (
            categoryMatch ||
            testMatch ||
            sampleMatch ||
            parameterMatch
          );
        }),
      }))
      .filter((category) => category.tests.length > 0);
  }, [searchTerm]);

  /* =====================================================
     SELECT / UNSELECT TEST
  ===================================================== */

  const toggleTest = (test) => {
    setSelectedTests((previous) => {
      const alreadySelected = previous.some(
        (item) => item.value === test.value
      );

      if (alreadySelected) {
        return previous.filter(
          (item) => item.value !== test.value
        );
      }

      return [
        ...previous,
        {
          value: test.value,
          label: test.label,
          sample: test.sample,
          type: test.type || "single",
          parameters: test.parameters || [],
        },
      ];
    });
  };

  /* =====================================================
     EXPAND / COLLAPSE
  ===================================================== */

  const toggleExpanded = (testValue) => {
    setExpandedTests((previous) => {
      if (previous.includes(testValue)) {
        return previous.filter((value) => value !== testValue);
      }

      return [...previous, testValue];
    });
  };

  /* =====================================================
     SELECT ALL
  ===================================================== */

  const selectAll = () => {
    const visibleTests = filteredCategories.flatMap(
      (category) => category.tests
    );

    const allVisibleSelected =
      visibleTests.length > 0 &&
      visibleTests.every((test) =>
        selectedTests.some(
          (selected) => selected.value === test.value
        )
      );

    if (allVisibleSelected) {
      setSelectedTests((previous) =>
        previous.filter(
          (selected) =>
            !visibleTests.some(
              (test) => test.value === selected.value
            )
        )
      );

      return;
    }

    setSelectedTests((previous) => {
      const existing = new Set(
        previous.map((test) => test.value)
      );

      const additions = visibleTests
        .filter((test) => !existing.has(test.value))
        .map((test) => ({
          value: test.value,
          label: test.label,
          sample: test.sample,
          type: test.type || "single",
          parameters: test.parameters || [],
        }));

      return [...previous, ...additions];
    });
  };

  /* =====================================================
     REMOVE SELECTED TEST
  ===================================================== */

  const removeSelectedTest = (testValue) => {
    setSelectedTests((previous) =>
      previous.filter((test) => test.value !== testValue)
    );
  };

  /* =====================================================
     SUBMIT REQUEST
  ===================================================== */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedTests.length === 0) {
      alert("Please select at least one laboratory test.");
      return;
    }

    if (!patient?.id) {
      alert(
        "Patient information is missing. Please register the patient again."
      );

      navigate("/register-patient");
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "You are not logged in. Please log in again."
        );
      }

      const tests = selectedTests.map((test) => ({
        value: test.value || "",
        label:
          test.label ||
          test.name ||
          test.value ||
          "Laboratory Test",
        sample: test.sample || "",
        type: test.type || "single",
        parameters: Array.isArray(test.parameters)
          ? test.parameters
          : [],
      }));

      const requestData = {
        patient_id: patient.id,
        requested_by: user.id,
        status: "Pending",
        tests,
        notes: notes.trim() || null,
      };

      console.log(
        "Saving laboratory request:",
        requestData
      );

      const {
        data: savedRequest,
        error: requestError,
      } = await supabase
        .from("laboratory_requests")
        .insert([requestData])
        .select("*")
        .single();

      if (requestError) {
        console.error(
          "Laboratory request insert error:",
          requestError
        );

        throw requestError;
      }

      console.log(
        "Laboratory request saved:",
        savedRequest
      );

      alert(
        `Sample request LAB-${savedRequest.id} submitted successfully!`
      );

      navigate("/nurse-dashboard");
    } catch (error) {
      console.error(
        "Error saving laboratory request:",
        error
      );

      alert(
        error?.message ||
          "Unable to save the request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =====================================================
     MISSING PATIENT
  ===================================================== */

  if (!patient) {
    return (
      <div className="lr-missing-page">
        <div className="lr-missing-card">
          <div className="lr-missing-icon">!</div>

          <h2>Patient Information Missing</h2>

          <p>
            Please register a patient before creating a
            laboratory sample request.
          </p>

          <button
            type="button"
            className="lr-primary-btn"
            onClick={() => navigate("/register-patient")}
          >
            ← Register Patient
          </button>
        </div>
      </div>
    );
  }

  /* =====================================================
     SUMMARY COUNTS
  ===================================================== */

  const selectedParameterCount = selectedTests.reduce(
    (total, test) =>
      total + (test.parameters?.length || 0),
    0
  );

  const formattedSex = patient.sex
    ? patient.sex.charAt(0).toUpperCase() +
      patient.sex.slice(1)
    : "-";

  /* =====================================================
     MAIN PAGE
  ===================================================== */

  return (
    <div className="lr-page">

      {/* =================================================
          PAGE CSS
      ================================================= */}

      <style>{`
        * {
          box-sizing: border-box;
        }

        .lr-page {
          min-height: 100vh;
          background: #f4f8fa;
          color: #14213d;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Arial,
            sans-serif;
        }

        /* ================================================
           HEADER
        ================================================ */

        .lr-header {
          height: 70px;
          background: #ffffff;
          border-bottom: 1px solid #e5ecef;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 34px;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .lr-brand {
          display: flex;
          align-items: center;
          gap: 15px;
          min-width: 0;
        }

        .lr-logo {
          width: 150px;
          height: 48px;
          object-fit: contain;
        }

        .lr-header-line {
          width: 1px;
          height: 28px;
          background: #e4eaed;
        }

        .lr-portal {
          font-size: 12px;
          font-weight: 700;
          color: #667085;
        }

        .lr-back {
          border: 1px solid #d9e3e7;
          background: #ffffff;
          color: #344054;
          border-radius: 9px;
          padding: 9px 15px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
          transition: all .2s ease;
        }

        .lr-back:hover {
          background: #f4fbfb;
          border-color: #0b8791;
          color: #087f8c;
        }

        /* ================================================
           MAIN
        ================================================ */

        .lr-main {
          width: 100%;
          max-width: 1480px;
          margin: 0 auto;
          padding: 26px 28px 50px;
        }

        .lr-breadcrumb {
          font-size: 10px;
          color: #98a2b3;
          margin-bottom: 12px;
        }

        .lr-breadcrumb strong {
          color: #087f8c;
        }

        /* ================================================
           PAGE TITLE
        ================================================ */

        .lr-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 22px;
        }

        .lr-eyebrow {
          color: #087f8c;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.4px;
          margin-bottom: 6px;
        }

        .lr-title {
          margin: 0;
          color: #14213d;
          font-size: 30px;
          line-height: 1.2;
          font-weight: 800;
        }

        .lr-description {
          margin: 8px 0 0;
          max-width: 650px;
          color: #667085;
          font-size: 12px;
          line-height: 1.6;
        }

        /* ================================================
           STEPS
        ================================================ */

        .lr-steps {
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .lr-step {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 9px;
          color: #98a2b3;
        }

        .lr-step-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
        }

        .lr-step-done {
          background: #e5f7f6;
          color: #087f8c;
        }

        .lr-step-active {
          background: #087f8c;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(8,127,140,.2);
        }

        .lr-step-line {
          width: 32px;
          height: 1px;
          background: #d9e4e8;
        }

        .lr-step-line.active {
          background: #73c5c3;
        }

        /* ================================================
           PATIENT CARD
        ================================================ */

        .lr-patient-card {
          background: #ffffff;
          border: 1px solid #e2eaed;
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 20px;
          box-shadow: 0 4px 18px rgba(24,52,70,.035);
        }

        .lr-patient-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #edf2f4;
        }

        .lr-patient-heading {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .lr-patient-avatar {
          width: 40px;
          height: 40px;
          border-radius: 11px;
          background: linear-gradient(
            135deg,
            #e5f7f6,
            #d7eeee
          );
          color: #087f8c;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
        }

        .lr-patient-label {
          margin: 0;
          color: #98a2b3;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: .7px;
          font-weight: 800;
        }

        .lr-patient-name {
          margin: 3px 0 0;
          color: #172033;
          font-size: 16px;
          font-weight: 800;
        }

        .lr-patient-id {
          background: #eefafa;
          color: #087f8c;
          border: 1px solid #d5eeee;
          border-radius: 20px;
          padding: 7px 12px;
          font-size: 10px;
          font-weight: 800;
        }

        .lr-patient-grid {
          display: grid;
          grid-template-columns:
            repeat(5, minmax(0, 1fr));
          padding: 17px 20px;
          gap: 18px;
        }

        .lr-info-label {
          margin: 0 0 5px;
          color: #98a2b3;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: .6px;
          font-weight: 800;
        }

        .lr-info-value {
          margin: 0;
          color: #344054;
          font-size: 11px;
          font-weight: 700;
          word-break: break-word;
        }

        /* ================================================
           MAIN GRID
        ================================================ */

        .lr-content {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr) 360px;
          gap: 20px;
          align-items: start;
        }

        /* ================================================
           TEST CARD
        ================================================ */

        .lr-tests-card {
          background: #ffffff;
          border: 1px solid #e2eaed;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 4px 18px rgba(24,52,70,.035);
        }

        .lr-tests-header {
          padding: 20px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 1px solid #edf2f4;
        }

        .lr-section-title {
          margin: 0;
          font-size: 17px;
          color: #172033;
          font-weight: 800;
        }

        .lr-section-subtitle {
          margin: 5px 0 0;
          color: #98a2b3;
          font-size: 10px;
        }

        .lr-selected-pill {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 7px;
          background: #e9f8f7;
          color: #087f8c;
          border: 1px solid #d5eeee;
          padding: 9px 13px;
          border-radius: 22px;
          font-size: 10px;
          font-weight: 800;
        }

        .lr-selected-pill-number {
          min-width: 21px;
          height: 21px;
          padding: 0 5px;
          border-radius: 50%;
          background: #087f8c;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
        }

        /* ================================================
           TOOLBAR
        ================================================ */

        .lr-toolbar {
          padding: 14px 20px;
          display: flex;
          gap: 10px;
          border-bottom: 1px solid #edf2f4;
        }

        .lr-search {
          flex: 1;
          min-width: 0;
          height: 42px;
          display: flex;
          align-items: center;
          gap: 9px;
          background: #f8fafb;
          border: 1px solid #dce5e9;
          border-radius: 9px;
          padding: 0 12px;
        }

        .lr-search-icon {
          font-size: 14px;
          color: #087f8c;
        }

        .lr-search input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: #344054;
          font-size: 11px;
        }

        .lr-search input::placeholder {
          color: #a5afb7;
        }

        .lr-clear {
          border: none;
          background: transparent;
          color: #98a2b3;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
        }

        .lr-select-all {
          height: 42px;
          padding: 0 16px;
          border-radius: 9px;
          border: 1px solid #d7e2e6;
          background: #ffffff;
          color: #344054;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .lr-select-all:hover {
          border-color: #087f8c;
          color: #087f8c;
          background: #f5fbfb;
        }

        /* ================================================
           CATEGORY GRID
        ================================================ */

        .lr-category-grid {
          padding: 18px 20px 20px;
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 14px;
          align-items: start;
        }

        .lr-category {
          border: 1px solid #dfe7ea;
          border-radius: 11px;
          overflow: hidden;
          background: #ffffff;
        }

        .lr-category-header {
          min-height: 45px;
          padding: 9px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: #f2f8f8;
          border-bottom: 1px solid #e0eeee;
        }

        .lr-category-title {
          color: #263b4a;
          font-size: 10px;
          font-weight: 800;
        }

        .lr-category-count {
          min-width: 24px;
          height: 24px;
          padding: 0 6px;
          border-radius: 20px;
          background: #ffffff;
          border: 1px solid #d9eded;
          color: #087f8c;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          font-weight: 800;
        }

        .lr-category-body {
          padding: 5px;
        }

        /* ================================================
           TEST ROW
        ================================================ */

        .lr-test-block {
          border-bottom: 1px solid #f0f3f5;
        }

        .lr-test-block:last-child {
          border-bottom: none;
        }

        .lr-test-row {
          min-height: 52px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 7px 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: background .15s ease;
        }

        .lr-test-row:hover {
          background: #f8fbfb;
        }

        .lr-test-row.selected {
          background: #eaf8f7;
        }

        .lr-checkbox {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          border-radius: 6px;
          border: 1.5px solid #c4d0d5;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 11px;
          font-weight: 900;
        }

        .lr-checkbox.checked {
          background: #087f8c;
          border-color: #087f8c;
        }

        .lr-test-content {
          flex: 1;
          min-width: 0;
        }

        .lr-test-name {
          display: block;
          color: #344054;
          font-size: 10px;
          line-height: 1.4;
          font-weight: 750;
        }

        .lr-test-row.selected .lr-test-name {
          color: #087f8c;
        }

        .lr-sample {
          display: inline-flex;
          margin-top: 4px;
          color: #98a2b3;
          font-size: 8px;
        }

        .lr-expand {
          width: 27px;
          height: 27px;
          flex-shrink: 0;
          border: 1px solid #dce7e9;
          border-radius: 7px;
          background: #ffffff;
          color: #087f8c;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lr-expand:hover {
          background: #eaf8f7;
        }

        /* ================================================
           PARAMETERS
        ================================================ */

        .lr-parameters {
          margin: 0 8px 8px 37px;
          border: 1px solid #dce9eb;
          border-radius: 9px;
          overflow: hidden;
          background: #fbfdfd;
        }

        .lr-parameters-header {
          display: grid;
          grid-template-columns: 1fr 120px;
          padding: 8px 10px;
          background: #edf8f7;
          color: #087f8c;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: .5px;
          font-weight: 800;
        }

        .lr-parameters-header span:last-child {
          text-align: right;
        }

        .lr-parameter {
          min-height: 42px;
          display: grid;
          grid-template-columns: 1fr 120px;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-top: 1px solid #edf2f3;
        }

        .lr-parameter-name {
          display: block;
          color: #344054;
          font-size: 9px;
          font-weight: 700;
        }

        .lr-parameter-unit {
          display: block;
          margin-top: 3px;
          color: #98a2b3;
          font-size: 8px;
        }

        .lr-reference {
          text-align: right;
          color: #087f8c;
          font-size: 8px;
          font-weight: 800;
        }

        /* ================================================
           NOTES
        ================================================ */

        .lr-notes {
          border-top: 1px solid #edf2f4;
          padding: 20px;
        }

        .lr-notes-heading {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 12px;
        }

        .lr-notes-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: #e8f7f7;
          color: #087f8c;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        .lr-notes-title {
          margin: 0;
          color: #344054;
          font-size: 11px;
          font-weight: 800;
        }

        .lr-optional {
          color: #98a2b3;
          font-size: 8px;
          font-weight: 500;
          margin-left: 6px;
        }

        .lr-notes-description {
          margin: 4px 0 0;
          color: #98a2b3;
          font-size: 9px;
          line-height: 1.5;
        }

        .lr-textarea {
          width: 100%;
          min-height: 100px;
          resize: vertical;
          border: 1px solid #dce5e9;
          border-radius: 9px;
          outline: none;
          background: #fbfcfd;
          padding: 11px 12px;
          color: #344054;
          font-size: 10px;
          line-height: 1.6;
          font-family: inherit;
        }

        .lr-textarea:focus {
          border-color: #73c5c3;
          box-shadow: 0 0 0 3px rgba(8,127,140,.08);
        }

        .lr-character-count {
          text-align: right;
          margin-top: 5px;
          color: #98a2b3;
          font-size: 8px;
        }

        /* ================================================
           SUMMARY
        ================================================ */

        .lr-summary {
          position: sticky;
          top: 90px;
          background: #ffffff;
          border: 1px solid #e2eaed;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 5px 22px rgba(24,52,70,.05);
        }

        .lr-summary-header {
          padding: 17px 18px;
          display: flex;
          align-items: center;
          gap: 11px;
          border-bottom: 1px solid #edf2f4;
        }

        .lr-summary-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #e8f7f7;
          color: #087f8c;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 900;
        }

        .lr-summary-title {
          margin: 0;
          color: #172033;
          font-size: 15px;
          font-weight: 800;
        }

        .lr-summary-subtitle {
          margin: 3px 0 0;
          color: #98a2b3;
          font-size: 9px;
        }

        .lr-summary-body {
          padding: 17px;
        }

        /* STAT CARDS */

        .lr-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        .lr-stat {
          padding: 11px;
          border-radius: 9px;
          background: #f7fafb;
          border: 1px solid #e8eff1;
        }

        .lr-stat-label {
          display: block;
          color: #667085;
          font-size: 8px;
          font-weight: 700;
        }

        .lr-stat-value {
          display: block;
          margin-top: 4px;
          color: #087f8c;
          font-size: 22px;
          line-height: 1;
          font-weight: 850;
        }

        /* PATIENT SUMMARY */

        .lr-summary-patient {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: #f8fbfb;
          border: 1px solid #e5eeee;
          border-radius: 10px;
        }

        .lr-summary-avatar {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border-radius: 10px;
          background: #dff3f2;
          color: #087f8c;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 900;
        }

        .lr-summary-patient-label {
          margin: 0;
          color: #98a2b3;
          font-size: 7px;
          text-transform: uppercase;
          letter-spacing: .5px;
          font-weight: 800;
        }

        .lr-summary-patient-name {
          margin: 3px 0 0;
          color: #172033;
          font-size: 11px;
          font-weight: 800;
        }

        .lr-summary-patient-id {
          margin: 2px 0 0;
          color: #087f8c;
          font-size: 8px;
          font-weight: 700;
        }

        /* SUMMARY INFO */

        .lr-summary-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 10px;
        }

        .lr-summary-info-item {
          padding: 9px;
          border: 1px solid #edf1f3;
          border-radius: 8px;
          background: #ffffff;
        }

        .lr-summary-info-label {
          display: block;
          color: #98a2b3;
          font-size: 7px;
          text-transform: uppercase;
          letter-spacing: .4px;
          font-weight: 800;
        }

        .lr-summary-info-value {
          display: block;
          margin-top: 3px;
          color: #344054;
          font-size: 9px;
          line-height: 1.4;
          font-weight: 750;
          word-break: break-word;
        }

        /* SELECTED TESTS */

        .lr-selected-tests {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid #edf2f4;
        }

        .lr-selected-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 0 0 8px;
          color: #344054;
          font-size: 10px;
          font-weight: 800;
        }

        .lr-selected-title span {
          color: #98a2b3;
          font-size: 8px;
          font-weight: 600;
        }

        .lr-selected-list {
          max-height: 230px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .lr-selected-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border: 1px solid #e3ecee;
          border-radius: 8px;
          background: #fbfdfd;
        }

        .lr-selected-check {
          width: 22px;
          height: 22px;
          flex-shrink: 0;
          border-radius: 7px;
          background: #e5f7f6;
          color: #087f8c;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 900;
        }

        .lr-selected-content {
          flex: 1;
          min-width: 0;
        }

        .lr-selected-name {
          display: block;
          color: #344054;
          font-size: 8px;
          line-height: 1.4;
          font-weight: 750;
        }

        .lr-selected-meta {
          display: block;
          margin-top: 2px;
          color: #98a2b3;
          font-size: 7px;
        }

        .lr-remove {
          width: 22px;
          height: 22px;
          flex-shrink: 0;
          border: none;
          border-radius: 7px;
          background: #fff3f3;
          color: #d64545;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
        }

        /* EMPTY */

        .lr-empty {
          padding: 18px 10px;
          text-align: center;
          border: 1px dashed #dce6e9;
          border-radius: 9px;
          background: #fafcfc;
        }

        .lr-empty-icon {
          width: 30px;
          height: 30px;
          margin: 0 auto 7px;
          border-radius: 50%;
          background: #eef5f6;
          color: #8fa3aa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
        }

        .lr-empty strong {
          display: block;
          color: #667085;
          font-size: 9px;
        }

        .lr-empty p {
          margin: 4px 0 0;
          color: #98a2b3;
          font-size: 8px;
        }

        /* NEXT STEP */

        .lr-next {
          margin-top: 14px;
          padding: 11px;
          border-radius: 9px;
          background: #eff9f9;
          border: 1px solid #dceff0;
        }

        .lr-next-title {
          color: #087f8c;
          font-size: 9px;
          font-weight: 800;
        }

        .lr-next p {
          margin: 4px 0 0;
          color: #667085;
          font-size: 8px;
          line-height: 1.5;
        }

        /* SUBMIT */

        .lr-submit {
          width: 100%;
          min-height: 46px;
          margin-top: 14px;
          border: none;
          border-radius: 9px;
          background: linear-gradient(
            100deg,
            #075f88,
            #087f8c
          );
          color: #ffffff;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
          box-shadow:
            0 7px 16px rgba(8,127,140,.18);
          transition: all .2s ease;
        }

        .lr-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 9px 20px rgba(8,127,140,.24);
        }

        .lr-submit:disabled {
          opacity: .45;
          cursor: not-allowed;
          box-shadow: none;
        }

        .lr-cancel {
          width: 100%;
          min-height: 38px;
          margin-top: 7px;
          border: 1px solid #dce5e8;
          border-radius: 9px;
          background: #ffffff;
          color: #667085;
          cursor: pointer;
          font-size: 9px;
          font-weight: 700;
        }

        .lr-cancel:hover {
          background: #f8fafb;
        }

        /* ================================================
           NO SEARCH RESULTS
        ================================================ */

        .lr-no-results {
          grid-column: 1 / -1;
          padding: 60px 20px;
          text-align: center;
        }

        .lr-no-results-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 10px;
          border-radius: 50%;
          background: #edf5f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .lr-no-results strong {
          color: #344054;
          font-size: 12px;
        }

        .lr-no-results p {
          color: #98a2b3;
          font-size: 9px;
        }

        /* ================================================
           FOOTER
        ================================================ */

        .lr-footer {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 22px 2px 0;
          color: #98a2b3;
          font-size: 8px;
        }

        /* ================================================
           MISSING PATIENT
        ================================================ */

        .lr-missing-page {
          min-height: 100vh;
          background: #f4f8fa;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .lr-missing-card {
          width: 100%;
          max-width: 420px;
          background: #ffffff;
          border: 1px solid #e2eaed;
          border-radius: 16px;
          padding: 38px;
          text-align: center;
          box-shadow: 0 10px 35px rgba(24,52,70,.06);
        }

        .lr-missing-icon {
          width: 52px;
          height: 52px;
          margin: 0 auto 15px;
          border-radius: 50%;
          background: #fff4e8;
          color: #d97706;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 800;
        }

        .lr-missing-card h2 {
          margin: 0 0 8px;
          color: #172033;
          font-size: 19px;
        }

        .lr-missing-card p {
          margin: 0 0 20px;
          color: #667085;
          font-size: 11px;
          line-height: 1.6;
        }

        .lr-primary-btn {
          border: none;
          background: #087f8c;
          color: #ffffff;
          padding: 11px 17px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 750;
        }

        /* ================================================
           RESPONSIVE
        ================================================ */

        @media (max-width: 1100px) {
          .lr-content {
            grid-template-columns: 1fr;
          }

          .lr-summary {
            position: static;
          }

          .lr-summary-body {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
          }

          .lr-summary-header {
            grid-column: 1 / -1;
          }

          .lr-stats,
          .lr-summary-patient,
          .lr-summary-info,
          .lr-selected-tests,
          .lr-next,
          .lr-submit,
          .lr-cancel {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 800px) {
          .lr-header {
            padding: 0 18px;
          }

          .lr-main {
            padding: 20px 15px 35px;
          }

          .lr-title-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .lr-steps {
            width: 100%;
            justify-content: flex-start;
          }

          .lr-patient-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .lr-category-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .lr-header-line,
          .lr-portal {
            display: none;
          }

          .lr-logo {
            width: 125px;
          }

          .lr-back {
            padding: 8px 10px;
            font-size: 9px;
          }

          .lr-title {
            font-size: 24px;
          }

          .lr-patient-top {
            align-items: flex-start;
            gap: 12px;
          }

          .lr-patient-grid {
            grid-template-columns: 1fr;
          }

          .lr-tests-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .lr-toolbar {
            flex-direction: column;
          }

          .lr-select-all {
            width: 100%;
          }

          .lr-summary-body {
            display: block;
          }

          .lr-stats {
            margin-bottom: 10px;
          }

          .lr-summary-info {
            margin-bottom: 10px;
          }

          .lr-footer {
            flex-direction: column;
          }
        }
      `}</style>

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="lr-header">

        <div className="lr-brand">
         <img
  src={`${import.meta.env.BASE_URL}samplogy-logo.png`}
  alt="Samplogy"
/>

          <div className="lr-header-line" />

          <span className="lr-portal">
            Nurse Portal
          </span>
        </div>

        <button
          type="button"
          className="lr-back"
          onClick={() =>
            navigate("/register-patient")
          }
        >
          ← Back to Patient
        </button>

      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="lr-main">

        {/* Breadcrumb */}

        <div className="lr-breadcrumb">
          Dashboard&nbsp;&nbsp;/&nbsp;&nbsp;
          Patient Registration&nbsp;&nbsp;/&nbsp;&nbsp;
          <strong>Sample Request</strong>
        </div>

        {/* =================================================
            TITLE
        ================================================= */}

        <div className="lr-title-row">

          <div>
            <div className="lr-eyebrow">
              SAMPLOGY SAMPLE DELIVERY
            </div>

            <h1 className="lr-title">
              Create Sample Request
            </h1>

            <p className="lr-description">
              Select the laboratory tests required for
              this patient. Selected tests and their
              parameters will be sent to the laboratory
              for processing.
            </p>
          </div>

          <div className="lr-steps">

            <div className="lr-step">
              <div className="lr-step-circle lr-step-done">
                ✓
              </div>
              <span>Patient</span>
            </div>

            <div className="lr-step-line active" />

            <div className="lr-step">
              <div className="lr-step-circle lr-step-active">
                2
              </div>
              <span>Sample Request</span>
            </div>

            <div className="lr-step-line" />

            <div className="lr-step">
              <div className="lr-step-circle">
                3
              </div>
              <span>Delivery</span>
            </div>

          </div>
        </div>

        {/* =================================================
            PATIENT INFORMATION
        ================================================= */}

        <section className="lr-patient-card">

          <div className="lr-patient-top">

            <div className="lr-patient-heading">

              <div className="lr-patient-avatar">
                {(patient.fullName || "P")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <p className="lr-patient-label">
                  Current Patient
                </p>

                <h2 className="lr-patient-name">
                  {patient.fullName || "-"}
                </h2>
              </div>

            </div>

            <span className="lr-patient-id">
              {patient.patientId || "-"}
            </span>

          </div>

          <div className="lr-patient-grid">

            <div>
              <p className="lr-info-label">
                Date of Birth
              </p>
              <p className="lr-info-value">
                {patient.dateOfBirth || "-"}
              </p>
            </div>

            <div>
              <p className="lr-info-label">
                Sex
              </p>
              <p className="lr-info-value">
                {formattedSex}
              </p>
            </div>

            <div>
              <p className="lr-info-label">
                Phone
              </p>
              <p className="lr-info-value">
                {patient.phone || "-"}
              </p>
            </div>

            <div>
              <p className="lr-info-label">
                City / Town
              </p>
              <p className="lr-info-value">
                {patient.city || "-"}
              </p>
            </div>

            <div>
              <p className="lr-info-label">
                Health Facility
              </p>
              <p className="lr-info-value">
                {patient.facility || "-"}
              </p>
            </div>

          </div>
        </section>

        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="lr-content">

          {/* =================================================
              TEST SELECTION
          ================================================= */}

          <section className="lr-tests-card">

            <div className="lr-tests-header">

              <div>
                <h2 className="lr-section-title">
                  Laboratory Tests
                </h2>

                <p className="lr-section-subtitle">
                  Select one or more tests for this patient.
                </p>
              </div>

              <div className="lr-selected-pill">

                <span className="lr-selected-pill-number">
                  {selectedTests.length}
                </span>

                <span>
                  Tests Selected
                </span>

              </div>

            </div>

            {/* TOOLBAR */}

            <div className="lr-toolbar">

              <div className="lr-search">

                <span className="lr-search-icon">
                  ⌕
                </span>

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(e.target.value)
                  }
                  placeholder="Search tests, samples or parameters..."
                />

                {searchTerm && (
                  <button
                    type="button"
                    className="lr-clear"
                    onClick={() =>
                      setSearchTerm("")
                    }
                  >
                    ×
                  </button>
                )}

              </div>

              <button
                type="button"
                className="lr-select-all"
                onClick={selectAll}
              >
                Select All
              </button>

            </div>

            {/* CATEGORY GRID */}

            <div className="lr-category-grid">

              {filteredCategories.length === 0 ? (

                <div className="lr-no-results">

                  <div className="lr-no-results-icon">
                    ⌕
                  </div>

                  <strong>
                    No laboratory tests found
                  </strong>

                  <p>
                    Try searching with another term.
                  </p>

                </div>

              ) : (

                filteredCategories.map((category) => (

                  <div
                    key={category.id}
                    className="lr-category"
                  >

                    <div className="lr-category-header">

                      <span className="lr-category-title">
                        {category.title}
                      </span>

                      <span className="lr-category-count">
                        {category.tests.length}
                      </span>

                    </div>

                    <div className="lr-category-body">

                      {category.tests.map((test) => {

                        const selected =
                          selectedTests.some(
                            (item) =>
                              item.value === test.value
                          );

                        const expanded =
                          expandedTests.includes(
                            test.value
                          );

                        return (
                          <div
                            key={test.value}
                            className="lr-test-block"
                          >

                            {/* TEST ROW */}

                            <div
                              className={
                                `lr-test-row ${
                                  selected
                                    ? "selected"
                                    : ""
                                }`
                              }
                              onClick={() =>
                                toggleTest(test)
                              }
                            >

                              <div
                                className={
                                  `lr-checkbox ${
                                    selected
                                      ? "checked"
                                      : ""
                                  }`
                                }
                              >
                                {selected ? "✓" : ""}
                              </div>

                              <div className="lr-test-content">

                                <span className="lr-test-name">
                                  {test.label}
                                </span>

                                <span className="lr-sample">
                                  Sample: {test.sample}
                                </span>

                              </div>

                              {test.parameters?.length > 0 && (
                                <button
                                  type="button"
                                  className="lr-expand"
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    toggleExpanded(
                                      test.value
                                    );
                                  }}
                                  aria-label={
                                    expanded
                                      ? "Hide parameters"
                                      : "Show parameters"
                                  }
                                >
                                  {expanded ? "−" : "+"}
                                </button>
                              )}

                            </div>

                            {/* PARAMETERS */}

                            {expanded &&
                              test.parameters?.length > 0 && (

                                <div className="lr-parameters">

                                  <div className="lr-parameters-header">
                                    <span>
                                      Test Parameter
                                    </span>

                                    <span>
                                      Reference Range
                                    </span>
                                  </div>

                                  {test.parameters.map(
                                    (parameter) => (

                                      <div
                                        key={parameter.value}
                                        className="lr-parameter"
                                      >

                                        <div>

                                          <span className="lr-parameter-name">
                                            {parameter.label}
                                          </span>

                                          <span className="lr-parameter-unit">
                                            {parameter.unit ||
                                              "Result"}
                                          </span>

                                        </div>

                                        <span className="lr-reference">
                                          {getReferenceRange(
                                            parameter,
                                            patient.sex
                                          )}
                                        </span>

                                      </div>

                                    )
                                  )}

                                </div>

                              )}

                          </div>
                        );
                      })}

                    </div>
                  </div>

                ))
              )}

            </div>

            {/* =================================================
                NOTES
            ================================================= */}

            <div className="lr-notes">

              <div className="lr-notes-heading">

                <div className="lr-notes-icon">
                  ✎
                </div>

                <div>

                  <h3 className="lr-notes-title">
                    Clinical / Request Notes

                    <span className="lr-optional">
                      Optional
                    </span>
                  </h3>

                  <p className="lr-notes-description">
                    Add symptoms, suspected diagnosis,
                    or other information that may help
                    the laboratory.
                  </p>

                </div>

              </div>

              <textarea
                className="lr-textarea"
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value)
                }
                placeholder="Enter clinical notes or additional information..."
                maxLength={500}
              />

              <div className="lr-character-count">
                {notes.length} / 500
              </div>

            </div>

          </section>

          {/* =================================================
              REQUEST SUMMARY
          ================================================= */}

          <aside className="lr-summary">

            <div className="lr-summary-header">

              <div className="lr-summary-icon">
                ✓
              </div>

              <div>
                <h2 className="lr-summary-title">
                  Request Summary
                </h2>

                <p className="lr-summary-subtitle">
                  Review the request before submitting
                </p>
              </div>

            </div>

            <div className="lr-summary-body">

              {/* STATISTICS */}

              <div className="lr-stats">

                <div className="lr-stat">
                  <span className="lr-stat-label">
                    Selected Tests
                  </span>

                  <strong className="lr-stat-value">
                    {selectedTests.length}
                  </strong>
                </div>

                <div className="lr-stat">
                  <span className="lr-stat-label">
                    Parameters
                  </span>

                  <strong className="lr-stat-value">
                    {selectedParameterCount}
                  </strong>
                </div>

              </div>

              {/* PATIENT */}

              <div className="lr-selected-tests">

                <div className="lr-summary-patient">

                  <div className="lr-summary-avatar">
                    {(patient.fullName || "P")
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>

                    <p className="lr-summary-patient-label">
                      Patient
                    </p>

                    <p className="lr-summary-patient-name">
                      {patient.fullName || "-"}
                    </p>

                    <p className="lr-summary-patient-id">
                      {patient.patientId || "-"}
                    </p>

                  </div>

                </div>

              </div>

              {/* PATIENT DETAILS */}

              <div className="lr-summary-info">

                <div className="lr-summary-info-item">
                  <span className="lr-summary-info-label">
                    Sex
                  </span>

                  <span className="lr-summary-info-value">
                    {formattedSex}
                  </span>
                </div>

                <div className="lr-summary-info-item">
                  <span className="lr-summary-info-label">
                    City
                  </span>

                  <span className="lr-summary-info-value">
                    {patient.city || "-"}
                  </span>
                </div>

                <div className="lr-summary-info-item">
                  <span className="lr-summary-info-label">
                    Facility
                  </span>

                  <span className="lr-summary-info-value">
                    {patient.facility || "-"}
                  </span>
                </div>

                <div className="lr-summary-info-item">
                  <span className="lr-summary-info-label">
                    Requested By
                  </span>

                  <span className="lr-summary-info-value">
                    Nurse Portal
                  </span>
                </div>

              </div>

              {/* SELECTED TESTS */}

              <div className="lr-selected-tests">

                <h3 className="lr-selected-title">
                  Selected Laboratory Tests

                  <span>
                    {selectedTests.length} total
                  </span>
                </h3>

                {selectedTests.length === 0 ? (

                  <div className="lr-empty">

                    <div className="lr-empty-icon">
                      +
                    </div>

                    <strong>
                      No tests selected
                    </strong>

                    <p>
                      Select tests from the list.
                    </p>

                  </div>

                ) : (

                  <div className="lr-selected-list">

                    {selectedTests.map((test) => (

                      <div
                        key={test.value}
                        className="lr-selected-item"
                      >

                        <div className="lr-selected-check">
                          ✓
                        </div>

                        <div className="lr-selected-content">

                          <span className="lr-selected-name">
                            {test.label}
                          </span>

                          <span className="lr-selected-meta">
                            {test.sample}
                            {" • "}
                            {test.parameters?.length || 0}
                            {" parameters"}
                          </span>

                        </div>

                        <button
                          type="button"
                          className="lr-remove"
                          onClick={() =>
                            removeSelectedTest(
                              test.value
                            )
                          }
                          aria-label={`Remove ${test.label}`}
                        >
                          ×
                        </button>

                      </div>

                    ))}

                  </div>

                )}

              </div>

              {/* NEXT STEP */}

              <div className="lr-next">

                <div className="lr-next-title">
                  Next Step
                </div>

                <p>
                  After submission, the laboratory
                  will receive this request and enter
                  results for the selected tests.
                </p>

              </div>

              {/* SUBMIT */}

              <button
                type="button"
                className="lr-submit"
                disabled={
                  selectedTests.length === 0 ||
                  isSubmitting
                }
                onClick={handleSubmit}
              >
                {isSubmitting
                  ? "Submitting Request..."
                  : "Submit Laboratory Request  →"}
              </button>

              {/* CANCEL */}

              <button
                type="button"
                className="lr-cancel"
                onClick={() =>
                  navigate("/register-patient")
                }
              >
                Cancel
              </button>

            </div>

          </aside>

        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="lr-footer">

          <span>
            © 2026 Samplogy — Sample Delivery Platform
          </span>

          <span>
            Secure&nbsp; • &nbsp;Reliable&nbsp; • &nbsp;Fast
          </span>

        </footer>

      </main>
    </div>
  );
}

export default LaboratoryRequest;