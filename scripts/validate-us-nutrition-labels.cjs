// Offline CLI. Reads local observations only; outputs are research documents.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { analyzeCollection } = require("./lib/us-nutrition-label-intake.cjs");
const { importArchive, digest } = require("./lib/us-nutrition-label-archive.cjs");
const ROOT = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));

function markdown(report) {
  if (!report.summary) return `# Rejected intake collection\n\n${JSON.stringify(report.issues, null, 2)}\n\nPublic grade=null; scoreReady=false.\n`;
  const lines = ["# Offline US-label intake coverage", "", `As of: ${report.asOf}. Internal research only. Public grade=null; scoreReady=false.`, "",
    "Purposive archived observations, not a national coverage estimate or scientific validation.", "",
    `Complete nine-nutrient profiles: ${report.summary.completeNineNutrients}/${report.summary.observations}. Eligible: ${report.summary.eligible}. Rejected: ${report.summary.rejected}.`, "",
    "Counts overlap: nutrient gaps, identity/formulation restrictions, category scope and contradictions are independent gates.", "",
    "| Observation | Numeric inputs | Exact engine rejection codes | Intake errors |", "| --- | --- | --- | --- |"];
  report.records.forEach(r => lines.push(`| ${r.id} | ${r.coverage.present.length}/9 | ${r.eligibility.engineReasonCodes.join(", ") || "eligible for internal research"} | ${r.eligibility.intakeRejectionReasons.map(v => v.code).join(", ") || "none"} |`));
  lines.push("", "See coverage.json for original-path rejection reasons, ambiguous/non-numeric declarations, conflicts, formulation verification and source-specific recovery opportunities.", "",
    "Recovery entries distinguish documented fields awaiting transcription, candidates requiring new verification, and nutrients not numerically declared in the observed source. No value was filled or fetched.", "");
  return lines.join("\n");
}

function main(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 2) {
    assert(["--input", "--archive", "--output-dir"].includes(argv[i]) && argv[i + 1], "Use --input file OR --archive directory, optionally --output-dir new-directory");
    assert(!options[argv[i]], "Duplicate CLI option"); options[argv[i]] = argv[i + 1];
  }
  assert(!(options["--input"] && options["--archive"]), "Choose input or archive");
  const provenance = [];
  let collection;
  if (options["--input"]) {
    const file = path.resolve(options["--input"]); collection = read(file);
    provenance.push({ path: path.relative(ROOT, file).replace(/\\/g, "/"), sha256: digest(fs.readFileSync(file)) });
    const engineHash = digest(fs.readFileSync(path.join(ROOT, "src/services/experimentalUsNutritionScoring.js"), "utf8").replace(/\r\n/g, "\n"));
    assert.equal(collection.engineNormalizedSourceSha256, engineHash, "Intake must bind the unchanged experimental engine edition");
  } else {
    const dir = path.resolve(options["--archive"] || path.join(ROOT, "docs/nutrition-validation/2026-10-19"));
    for (const name of ["products.json", "results.json", "source-captures.json"]) {
      const file = path.join(dir, name); provenance.push({ path: path.relative(ROOT, file).replace(/\\/g, "/"), sha256: digest(fs.readFileSync(file)) });
    }
    const catalog = read(path.join(dir, "products.json")), captures = read(path.join(dir, "source-captures.json"));
    assert.equal(digest(fs.readFileSync(path.join(dir, "products.json"))), read(path.join(dir, "results.json")).catalogSha256);
    assert.equal(digest(fs.readFileSync(path.join(dir, "source-captures.json"))), read(path.join(dir, "results.json")).sourceCaptureManifestSha256);
    collection = importArchive({ catalog, captures, results: read(path.join(dir, "results.json")),
      engineSource: fs.readFileSync(path.join(ROOT, "src/services/experimentalUsNutritionScoring.js"), "utf8") });
  }
  const report = { ...analyzeCollection(collection), inputFiles: provenance };
  if (options["--output-dir"]) {
    const dir = path.resolve(options["--output-dir"]), relative = path.relative(ROOT, dir);
    assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative), "Output must be a new directory inside Trace");
    // No overwrite of historical evidence or inputs. Exclusive creation makes
    // interrupted output recoverable in a fresh directory, never destructive.
    assert(!fs.existsSync(dir), "Output directory exists; choose a fresh directory");
    let ancestor = path.dirname(dir);
    while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
    const resolved = path.relative(fs.realpathSync(ROOT), fs.realpathSync(ancestor));
    assert(!resolved.startsWith("..") && !path.isAbsolute(resolved), "Output ancestor escapes workspace");
    fs.mkdirSync(dir, { recursive: true });
    for (const [name, value] of [["intake.json", collection], ["coverage.json", report]]) {
      fs.writeFileSync(path.join(dir, name), `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
    }
    fs.writeFileSync(path.join(dir, "README.md"), markdown(report), { flag: "wx" });
  }
  console.log(JSON.stringify({ ...report.summary, validIntake: report.valid, grade: null, scoreReady: false,
    ...(!report.valid ? { issues: report.issues,
      rejectedRecords: report.records.filter(r => !r.validIntake).map(r => ({ id: r.id, reasons: r.eligibility.intakeRejectionReasons })) } : {}) }, null, 2));
  if (!report.valid) process.exitCode = 1;
  return report;
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { main, markdown };
