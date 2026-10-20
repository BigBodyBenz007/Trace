// Explicit offline edition bindings. Historical documents are never rewritten.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const EDITIONS = require("../../src/data/experimentalUsNutritionEngineEditions.json");
const normalizedHash = source => crypto.createHash("sha256").update(source.replace(/\r\n/g, "\n")).digest("hex");

function assertEngineCompatibility(engineSource, pinnedHash, intakeVersion = 1) {
  const currentHash = normalizedHash(engineSource);
  const helperHash = normalizedHash(fs.readFileSync(path.join(__dirname, "../../src/services/reviewedManufacturerLabelIdentity.js"), "utf8"));
  const edition = EDITIONS.editions.find(e => e.engineSha256 === currentHash && e.identityValidatorSha256 === helperHash);
  assert(edition, "Unregistered experimental engine/identity-validator edition");
  assert(pinnedHash === currentHash || (intakeVersion === 1 && edition.replaysLegacySha256.includes(pinnedHash)),
    "Input engine edition is not explicitly compatible with this intake version");
  return { engineSha256: currentHash, identityValidatorSha256: helperHash, edition: edition.id };
}

module.exports = { assertEngineCompatibility, normalizedHash };
