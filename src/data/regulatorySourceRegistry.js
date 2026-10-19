// Local, reviewed provenance only. No legal status or product safety assertions.
const historical = require("./additiveNameReference.json");

module.exports = {
  schemaVersion: 1,
  registryVersion: "regulatory-sources-2026-10-19-v2",
  snapshotDate: "2026-10-19",
  sources: [
    {
      sourceId: historical.source.id,
      editionId: "original-2012-03-22",
      citation: historical.source,
      documentType: "regulation",
      edition: { kind: "original", date: "2012-03-22", label: historical.source.version },
      verification: {
        status: "verified",
        currency: "historical",
        lastAttemptedOn: historical.source.reviewedOn,
        lastVerifiedOn: historical.source.reviewedOn,
        verifiedThrough: null,
        evidenceType: "official-text",
        scope: "Eight identifier/name headings only; no authorization, product presence, or safety verification.",
        evidenceLocator: "Annex: E150d, E202, E211, E300, E322, E330, E415 and E500(ii). See docs/remote-barcode-lookup.md.",
        currentnessBasis: null,
        limitations: ["Original 2012 publication; not a current consolidated regulation."],
      },
    },
    {
      sourceId: "CELEX:02012R0231-20260818",
      editionId: "consolidated-2026-08-18",
      citation: {
        id: "CELEX:02012R0231-20260818",
        title: "Commission Regulation (EU) No 231/2012, consolidated 18 August 2026",
        publisher: "European Commission",
        jurisdiction: "EU",
        language: "en",
        publicationDate: null,
        publicationDateNote: "The consolidation date is known; a separate publication date was not established.",
        version: "Consolidated text, 18 August 2026",
        url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02012R0231-20260818",
        attribution: "Source: European Union, consolidated Regulation (EU) No 231/2012, 18 August 2026.",
        reuseBasis: "EUR-Lex consolidated texts: Creative Commons Attribution 4.0; acknowledge source and changes.",
        reuseNoticeUrl: "https://eur-lex.europa.eu/content/legal-notice/legal-notice.html",
        changes: "Source metadata only; no consolidated legal provisions imported.",
        scope: "Audit evidence for the same eight names; no current legal or safety determination.",
      },
      documentType: "consolidated-regulation",
      edition: { kind: "consolidated", date: "2026-08-18", label: "Consolidated text, 18 August 2026" },
      verification: {
        status: "partial",
        currency: "undetermined",
        lastAttemptedOn: "2026-10-19",
        lastVerifiedOn: null,
        verifiedThrough: null,
        evidenceType: "indexed-excerpt",
        scope: "Indexed English headings corroborate the eight existing names only.",
        evidenceLocator: "docs/additive-regulatory-audit-2026-10-19.md: verification limits and eight-mapping review.",
        currentnessBasis: null,
        limitations: [
          "Full English retrieval failed or was blocked; indexed evidence is not full-source verification.",
          "Amendment, corrigendum and use-category coverage remains incomplete.",
        ],
      },
    },
    require("./bvoRevocationSource.json"),
  ],
  // Keep old bindings when new name editions are introduced. Never resolve to latest.
  referenceBindings: [{
    referenceVersion: historical.referenceVersion,
    sourceId: historical.source.id,
    editionId: "original-2012-03-22",
  }],
};
