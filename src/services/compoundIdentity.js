export const COMPOUND_CATEGORIES = new Set([
  "medication",
  "peptide",
  "supplement",
  "vitamin-mineral",
  "amino-acid",
  "anabolic-androgenic-steroid",
  "other",
]);

export const COMPOUND_CATEGORY_LABELS = {
  medication: "Medication",
  peptide: "Peptide",
  supplement: "Supplement",
  "vitamin-mineral": "Vitamin / Mineral",
  "amino-acid": "Amino Acid",
  "anabolic-androgenic-steroid": "Anabolic-Androgenic Steroid",
  other: "Other",
};

export function formatCompoundCategory(category) {
  return COMPOUND_CATEGORY_LABELS[category] || "Other";
}
