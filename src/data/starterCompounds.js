const definition = (id, name, aliases, category) => ({
  id,
  schemaVersion: 1,
  name,
  aliases,
  category,
  provenance: { source: "trace-catalog", sourceId: id },
});

const starterCompounds = [
  definition("trace:compound:metformin", "Metformin", [], "medication"),
  definition("trace:compound:lisinopril", "Lisinopril", [], "medication"),
  definition("trace:compound:atorvastatin", "Atorvastatin", [], "medication"),
  definition("trace:compound:levothyroxine", "Levothyroxine", [], "medication"),
  definition("trace:compound:amoxicillin", "Amoxicillin", [], "medication"),
  definition("trace:compound:sertraline", "Sertraline", [], "medication"),
  definition("trace:compound:omeprazole", "Omeprazole", [], "medication"),
  definition("trace:compound:acetaminophen", "Acetaminophen", ["Paracetamol"], "medication"),
  definition("trace:compound:ibuprofen", "Ibuprofen", [], "medication"),
  definition("trace:compound:diphenhydramine", "Diphenhydramine", [], "medication"),

  definition("trace:compound:semaglutide", "Semaglutide", [], "peptide"),
  definition("trace:compound:tirzepatide", "Tirzepatide", ["LY3298176"], "peptide"),
  definition("trace:compound:retatrutide", "Retatrutide", ["LY3437943"], "peptide"),
  definition("trace:compound:tesamorelin", "Tesamorelin", [], "peptide"),
  definition("trace:compound:cjc-1295", "CJC-1295", [], "peptide"),
  definition("trace:compound:ipamorelin", "Ipamorelin", [], "peptide"),
  definition("trace:compound:bpc-157", "BPC-157", ["Body Protection Compound 157"], "peptide"),

  definition("trace:compound:creatine-monohydrate", "Creatine Monohydrate", ["Creatine"], "supplement"),
  definition("trace:compound:fish-oil", "Fish Oil", ["Omega-3 Fish Oil"], "supplement"),
  definition("trace:compound:coenzyme-q10", "Coenzyme Q10", ["CoQ10", "Ubiquinone"], "supplement"),
  definition("trace:compound:glucosamine", "Glucosamine", [], "supplement"),
  definition("trace:compound:melatonin", "Melatonin", [], "supplement"),
  definition("trace:compound:psyllium-husk", "Psyllium Husk", ["Psyllium"], "supplement"),
  definition("trace:compound:ashwagandha", "Ashwagandha", ["Withania somnifera"], "supplement"),

  definition("trace:compound:cholecalciferol", "Vitamin D3", ["Cholecalciferol"], "vitamin-mineral"),
  definition("trace:compound:cyanocobalamin", "Cyanocobalamin", ["Vitamin B12"], "vitamin-mineral"),
  definition("trace:compound:ascorbic-acid", "Vitamin C", ["Ascorbic Acid"], "vitamin-mineral"),
  definition("trace:compound:magnesium-glycinate", "Magnesium Glycinate", [], "vitamin-mineral"),
  definition("trace:compound:zinc", "Zinc", [], "vitamin-mineral"),
  definition("trace:compound:iron", "Iron", [], "vitamin-mineral"),

  definition("trace:compound:l-leucine", "L-Leucine", ["Leucine"], "amino-acid"),
  definition("trace:compound:glycine", "Glycine", [], "amino-acid"),
  definition("trace:compound:l-glutamine", "L-Glutamine", ["Glutamine"], "amino-acid"),
  definition("trace:compound:l-citrulline", "L-Citrulline", ["Citrulline"], "amino-acid"),
  definition("trace:compound:beta-alanine", "Beta-Alanine", [], "amino-acid"),

  definition("trace:compound:testosterone", "Testosterone", [], "anabolic-androgenic-steroid"),
  definition("trace:compound:nandrolone", "Nandrolone", [], "anabolic-androgenic-steroid"),
  definition("trace:compound:oxandrolone", "Oxandrolone", ["Anavar"], "anabolic-androgenic-steroid"),
  definition("trace:compound:stanozolol", "Stanozolol", ["Winstrol"], "anabolic-androgenic-steroid"),
  definition("trace:compound:methandienone", "Methandienone", ["Methandrostenolone", "Dianabol"], "anabolic-androgenic-steroid"),
  definition("trace:compound:trenbolone", "Trenbolone", [], "anabolic-androgenic-steroid"),
];

export default starterCompounds;
