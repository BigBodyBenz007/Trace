import {
  DOSE_UNIT_OPTIONS,
  ROUTE_OPTIONS,
} from "../constants/medicationOptions";

export const MEDICATION_COMPOUNDS_STORAGE_KEY = "medicationCompounds";

const DOSE_UNITS = new Set(DOSE_UNIT_OPTIONS.map(({ value }) => value));
const ROUTES = new Set(ROUTE_OPTIONS.map(({ value }) => value));

function meaningfulText(value) {
  return /[a-z0-9]/i.test(String(value || "").trim());
}

export function normalizeCompoundName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function getCompoundDefinitionError(draft) {
  if (!meaningfulText(draft?.name)) return "Enter a compound name.";

  if (!DOSE_UNITS.has(draft?.doseUnit)) return "Choose a valid dose unit.";
  if (draft.doseUnit === "custom" && !meaningfulText(draft.customDoseUnit)) {
    return "Enter a meaningful custom dose unit.";
  }

  if (!ROUTES.has(draft?.route)) return "Choose a valid method or route.";
  if (draft.route === "other" && !meaningfulText(draft.customRoute)) {
    return "Enter a meaningful custom method or route.";
  }

  if (draft.defaultDoseAmount !== undefined && draft.defaultDoseAmount !== "") {
    const amount = Number(draft.defaultDoseAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return "Enter a default dose amount greater than zero or leave it blank.";
    }
  }

  return "";
}

export function createCompoundDefinition(draft, now = new Date()) {
  if (getCompoundDefinitionError(draft)) return null;

  const normalizedName = normalizeCompoundName(draft.name);
  const sourceId = encodeURIComponent(normalizedName);
  const timestamp = now.toISOString();

  return {
    id: `user-saved:${sourceId}`,
    schemaVersion: 1,
    name: String(draft.name).trim().replace(/\s+/g, " "),
    defaults: {
      dose: {
        ...(draft.defaultDoseAmount !== undefined &&
        draft.defaultDoseAmount !== ""
          ? { amount: Number(draft.defaultDoseAmount) }
          : {}),
        unit: draft.doseUnit,
        ...(draft.doseUnit === "custom"
          ? {
              customUnit: String(draft.customDoseUnit)
                .trim()
                .replace(/\s+/g, " "),
            }
          : {}),
      },
      route: {
        code: draft.route,
        ...(draft.route === "other"
          ? {
              customLabel: String(draft.customRoute)
                .trim()
                .replace(/\s+/g, " "),
            }
          : {}),
      },
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function definitionsMatch(firstCompound, secondCompound) {
  const firstDose = firstCompound.defaults?.dose;
  const secondDose = secondCompound.defaults?.dose;
  const firstRoute = firstCompound.defaults?.route;
  const secondRoute = secondCompound.defaults?.route;

  return (
    firstDose?.amount === secondDose?.amount &&
    firstDose?.unit === secondDose?.unit &&
    firstDose?.customUnit === secondDose?.customUnit &&
    firstRoute?.code === secondRoute?.code &&
    firstRoute?.customLabel === secondRoute?.customLabel
  );
}

export function addCompoundDefinition(compounds, compound) {
  if (!compound) {
    return {
      compounds,
      added: false,
      existingCompound: null,
      matchesDefinition: false,
    };
  }

  const normalizedName = normalizeCompoundName(compound.name);
  const existingCompound = compounds.find(
    (item) => normalizeCompoundName(item.name) === normalizedName
  );

  return existingCompound
    ? {
        compounds,
        added: false,
        existingCompound,
        matchesDefinition: definitionsMatch(existingCompound, compound),
      }
    : {
        compounds: [...compounds, compound],
        added: true,
        existingCompound: null,
        matchesDefinition: true,
      };
}

export function updateCompoundDefinition(
  compounds,
  id,
  draft,
  now = new Date()
) {
  const validationError = getCompoundDefinitionError(draft);
  if (validationError) {
    return { compounds, updatedCompound: null, error: validationError };
  }

  const existingCompound = compounds.find((compound) => compound.id === id);
  if (!existingCompound) {
    return {
      compounds,
      updatedCompound: null,
      error: "The saved compound could not be found.",
    };
  }

  const normalizedName = normalizeCompoundName(draft.name);
  const hasNameCollision = compounds.some(
    (compound) =>
      compound.id !== id && normalizeCompoundName(compound.name) === normalizedName
  );
  if (hasNameCollision) {
    return {
      compounds,
      updatedCompound: null,
      error: "Another saved compound already uses that name.",
    };
  }

  const replacement = createCompoundDefinition(draft, now);
  const updatedCompound = {
    ...replacement,
    id: existingCompound.id,
    createdAt: existingCompound.createdAt,
    updatedAt: now.toISOString(),
  };

  return {
    compounds: compounds.map((compound) =>
      compound.id === id ? updatedCompound : compound
    ),
    updatedCompound,
    error: "",
  };
}

export function readCompoundDefinitions(storage) {
  const savedCompounds = storage.getItem(MEDICATION_COMPOUNDS_STORAGE_KEY);
  if (!savedCompounds) return [];

  const parsedCompounds = JSON.parse(savedCompounds);
  if (!Array.isArray(parsedCompounds)) {
    throw new Error("Invalid saved compound data.");
  }

  return parsedCompounds;
}

export function writeCompoundDefinitions(storage, compounds) {
  storage.setItem(
    MEDICATION_COMPOUNDS_STORAGE_KEY,
    JSON.stringify(compounds)
  );
}
