import { normalizePlannedWorkouts } from "./plannedWorkout";
import { normalizeWorkoutDraft } from "./workoutDraft";
import { normalizeJournalDraft } from "./journalEntry";
import { normalizeWaterCollection } from "./waterTracker";
import { normalizeDailyActionCollection } from "./dailyAction";
import { normalizeProtocolOccurrenceCollection } from "./protocolOccurrence";
import { normalizeProtocolCompoundOutcomeCollection } from "./protocolCompoundOutcome";
import {
  normalizeInjectionSiteCollection,
  normalizeInjectionSiteSettings,
} from "./injectionSite";
import {
  normalizeMedicationDoseOccurrenceCollection,
  normalizeMedicationDoseScheduleCollection,
} from "./medicationDoseSchedule";
import { validateJournalVaultEnvelope } from "./journalVaultCrypto";
import { JOURNAL_VAULT_STORAGE_KEY } from "./journalVault";
import { isValidLocalDate } from "./protocol";
import { normalizeProductIdentifiers } from "./productIdentifiers";

const NUTRIENT_KEYS = ["calories", "protein", "carbohydrates", "fat", "fiber", "sodium", "totalSugar", "addedSugar"];
const DATE_FIELDS = ["createdAt", "updatedAt", "occurredAt", "loggedAt", "startedAt", "finishedAt", "endedAt", "achievedAt", "addedToTrophyCaseAt"];

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return typeof value === "string" && Boolean(value.trim());
}

function validTimestamp(value) {
  return typeof value === "string" && Boolean(value) && !Number.isNaN(Date.parse(value));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function optionalText(record, fields, domain) {
  fields.forEach((field) => {
    if (record[field] !== undefined && record[field] !== null) {
      assert(typeof record[field] === "string", `The backup contains invalid ${domain} ${field} data.`);
    }
  });
}

function optionalTimestamps(record, domain) {
  DATE_FIELDS.forEach((field) => {
    if (record[field] !== undefined && record[field] !== null) {
      assert(validTimestamp(record[field]), `The backup contains an invalid ${domain} ${field} timestamp.`);
    }
  });
}

function optionalLocalDate(value, domain) {
  if (value !== undefined && value !== null && value !== "") {
    assert(isValidLocalDate(value), `The backup contains an invalid ${domain} date.`);
  }
}

function recordArray(value, domain, validateRecord, { requireIds = true } = {}) {
  assert(Array.isArray(value), `The backup contains invalid ${domain} data.`);
  const ids = new Set();
  value.forEach((record) => {
    assert(object(record), `The backup contains a malformed ${domain} record.`);
    if (requireIds) {
      assert(text(record.id) && !ids.has(record.id), `The backup contains duplicate or missing ${domain} IDs.`);
      ids.add(record.id);
    } else if (record.id !== undefined && record.id !== null) {
      assert(text(record.id) && !ids.has(record.id), `The backup contains duplicate or malformed ${domain} IDs.`);
      ids.add(record.id);
    }
    optionalTimestamps(record, domain);
    validateRecord?.(record);
  });
}

function optionalObject(value, domain) {
  if (value !== undefined && value !== null) assert(object(value), `The backup contains invalid ${domain} data.`);
}

function optionalProductIdentifiers(value, domain) {
  if (value === undefined || value === null) return;
  const normalized = normalizeProductIdentifiers(value);
  assert(
    normalized !== null &&
      normalized.length === value.length &&
      normalized.every((identifier, index) =>
        identifier.scheme === value[index].scheme &&
        identifier.value === value[index].value
      ),
    `The backup contains invalid ${domain} product identifiers.`
  );
}

function validateNumbers(record, fields, domain, { nullable = true, positive = false } = {}) {
  fields.forEach((field) => {
    const value = record[field];
    if (value === undefined || (nullable && value === null)) return;
    assert(typeof value === "number" && Number.isFinite(value) && (!positive || value > 0),
      `The backup contains invalid ${domain} ${field} data.`);
  });
}

function validateSugarValues(record, domain) {
  ["totalSugar", "addedSugar"].forEach((field) => {
    const value = record[field];
    if (value === undefined || value === null) return;
    assert(value >= 0, `The backup contains invalid ${domain} ${field} data.`);
  });
  if (record.totalSugar !== undefined && record.totalSugar !== null &&
      record.addedSugar !== undefined && record.addedSugar !== null) {
    assert(
      record.addedSugar <= record.totalSugar,
      `The backup contains ${domain} addedSugar greater than totalSugar.`
    );
  }
}

function validateNutritionShape(record, domain) {
  validateNumbers(record, NUTRIENT_KEYS, domain);
  validateSugarValues(record, domain);
  optionalText(record, ["name", "notes"], domain);
  if (record.loggedAt !== undefined) assert(validTimestamp(record.loggedAt), `The backup contains an invalid ${domain} timestamp.`);
  ["foodReference", "portion", "nutritionBasis", "nutritionCompleteness"].forEach((field) => optionalObject(record[field], `${domain} ${field}`));
  optionalProductIdentifiers(record.foodReference?.identifiers, `${domain} food reference`);
  if (record.nutritionBasis) {
    validateNumbers(record.nutritionBasis, NUTRIENT_KEYS, `${domain} nutrition basis`);
    validateSugarValues(record.nutritionBasis, `${domain} nutrition basis`);
  }
  if (record.portion?.amount !== undefined) {
    assert(Number.isFinite(record.portion.amount) && record.portion.amount > 0, `The backup contains an invalid ${domain} portion.`);
  }
}

function validatePhotoReferences(values, domain) {
  assert(Array.isArray(values), `The backup contains invalid ${domain} photo references.`);
  values.forEach((value) => {
    assert((typeof value === "string" && Boolean(value)) || (object(value) && text(value.id)),
      `The backup contains a malformed ${domain} photo reference.`);
  });
}

function validateMemory(record) {
  optionalText(record, ["title", "description"], "Memory");
  optionalLocalDate(record.date, "Memory");
  if (record.favorite !== undefined) assert(typeof record.favorite === "boolean", "The backup contains invalid Memory favorite data.");
  if (record.categories !== undefined) {
    assert(Array.isArray(record.categories) && record.categories.every((value) => typeof value === "string"),
      "The backup contains invalid Memory category data.");
  }
  if (record.images !== undefined) validatePhotoReferences(record.images, "Memory");
}

function validateUserFood(record) {
  optionalText(record, ["name", "brand", "notes", "sourceType", "dataType", "category", "categoryLabel"], "user food");
  optionalObject(record.serving, "user food serving");
  optionalObject(record.nutrients, "user food nutrients");
  optionalObject(record.provenance, "user food provenance");
  optionalProductIdentifiers(record.identifiers, "user food");
  if (record.nutrients) {
    validateNumbers(record.nutrients, NUTRIENT_KEYS, "user food nutrients");
    validateSugarValues(record.nutrients, "user food nutrients");
  }
}

function validateHealth(record) {
  optionalObject(record.measurements, "Health measurement values");
  if (record.measurements) {
    Object.entries(record.measurements).forEach(([key, measurement]) => {
      assert(object(measurement), `The backup contains invalid Health measurement ${key} data.`);
      if (key === "height" && measurement.unit === "ft-in") {
        assert(Number.isInteger(measurement.feet) && measurement.feet >= 0 &&
          Number.isFinite(measurement.inches) && measurement.inches >= 0 && measurement.inches < 12,
        "The backup contains invalid Health measurement height data.");
      } else {
        const value = key === "height" ? (measurement.value ?? measurement.centimeters) : measurement.value;
        assert(Number.isFinite(value) && value > 0 && text(measurement.unit),
          `The backup contains invalid Health measurement ${key} data.`);
      }
    });
  }
  optionalText(record, ["notes"], "Health measurement");
}

function validateMedication(record) {
  optionalText(record, ["name", "notes"], "medication entry");
  optionalObject(record.dose, "medication dose");
  optionalObject(record.route, "medication route");
  optionalObject(record.compoundReference, "medication compound reference");
  if (record.dose) {
    assert(Number.isFinite(record.dose.amount) && record.dose.amount > 0 && text(record.dose.unit),
      "The backup contains invalid medication dose data.");
  }
  if (record.route) assert(text(record.route.code), "The backup contains invalid medication route data.");
}

function validateCompound(record) {
  optionalText(record, ["name"], "saved compound");
  optionalObject(record.defaults, "saved compound defaults");
  if (record.defaults) {
    optionalObject(record.defaults.dose, "saved compound dose");
    optionalObject(record.defaults.route, "saved compound route");
    if (record.defaults.dose?.amount !== undefined) {
      assert(Number.isFinite(record.defaults.dose.amount) && record.defaults.dose.amount > 0,
        "The backup contains invalid saved compound dose data.");
    }
  }
}

function validateProtocol(record) {
  optionalText(record, ["name", "notes", "status"], "Protocol");
  optionalLocalDate(record.startDate, "Protocol start");
  optionalLocalDate(record.endDate, "Protocol end");
  if (record.items !== undefined) {
    recordArray(record.items, "Protocol item", (item) => {
      optionalObject(item.compound, "Protocol compound");
      optionalObject(item.dose, "Protocol dose");
      optionalObject(item.route, "Protocol route");
      optionalObject(item.schedule, "Protocol schedule");
      if (item.schedule?.weekdays !== undefined) {
        assert(Array.isArray(item.schedule.weekdays) &&
          item.schedule.weekdays.every((day) => Number.isInteger(day) && day >= 1 && day <= 7) &&
          new Set(item.schedule.weekdays).size === item.schedule.weekdays.length,
        "The backup contains invalid Protocol weekdays.");
      }
    });
  }
}

function validateWorkout(record) {
  optionalText(record, ["title", "notes", "intensity", "type", "plannedWorkoutId"], "workout");
  validateNumbers(record, ["activeDurationMinutes", "caloriesBurned"], "workout", { positive: true });
  if (record.photos !== undefined) validatePhotoReferences(record.photos, "workout");
  if (record.exercises !== undefined) {
    recordArray(record.exercises, "workout exercise", (exercise) => {
      optionalText(exercise, ["name", "notes", "roadmapStatus", "roadmapSkipReason"], "workout exercise");
      optionalObject(exercise.exerciseReference, "workout exercise reference");
      if (exercise.sets !== undefined) {
        recordArray(exercise.sets, "workout set", (set) => {
          validateNumbers(set, ["reps", "actualRepsAtFailure"], "workout set");
          optionalObject(set.load, "workout set load");
          if (set.drops !== undefined) recordArray(set.drops, "workout drop set", null, { requireIds: false });
        }, { requireIds: false });
      }
    }, { requireIds: false });
  }
}

function validateSavedExercise(record) {
  optionalText(record, ["name"], "saved exercise");
  optionalObject(record.defaults, "saved exercise defaults");
  optionalObject(record.defaults?.load, "saved exercise load defaults");
}

function validateTrophy(record) {
  optionalText(record, ["sourceType", "sourceKey", "title", "description", "sourceRecordType"], "Trophy Case");
  optionalObject(record.sourceSnapshot, "Trophy Case source snapshot");
  optionalObject(record.metadata, "Trophy Case metadata");
}

function validateJournalEntries(value) {
  recordArray(value, "Journal", (entry) => {
    assert(entry.visibility === "private", "The backup contains invalid Journal visibility data.");
    assert(text(entry.body), "The backup contains an invalid empty Journal entry.");
    optionalLocalDate(entry.date, "Journal");
    if (entry.time !== undefined) assert(/^\d{2}:\d{2}$/.test(entry.time), "The backup contains invalid Journal time data.");
  });
}

export function validateTraceStructuredDomains(data) {
  if (data.memories != null) recordArray(data.memories, "Memory", validateMemory);
  if (data.nutritionGoals != null) {
    assert(object(data.nutritionGoals), "The backup contains invalid nutrition goal data.");
    validateNumbers(data.nutritionGoals, ["calories", "protein", "carbohydrates", "fat", "sodium", "waterGoalMl"], "nutrition goal", { positive: false });
  }
  if (data.userFoods != null) recordArray(data.userFoods, "user food", validateUserFood);
  if (data.nutritionEntries != null) recordArray(data.nutritionEntries, "nutrition entry", (record) => validateNutritionShape(record, "nutrition entry"));
  if (data.waterEntries != null) {
    const normalized = normalizeWaterCollection(data.waterEntries);
    assert(normalized && normalized.entries.length === data.waterEntries.entries?.length, "The backup contains invalid water entry data.");
  }
  if (data.healthMeasurementEntries != null) recordArray(data.healthMeasurementEntries, "Health measurement", validateHealth);
  if (data.appSettings != null) assert(object(data.appSettings), "The backup contains invalid app settings data.");
  if (data.medicationEntries != null) recordArray(data.medicationEntries, "medication entry", validateMedication);
  if (data.medicationCompounds != null) recordArray(data.medicationCompounds, "saved compound", validateCompound);
  if (data.medicationDoseSchedules != null) assert(normalizeMedicationDoseScheduleCollection(data.medicationDoseSchedules), "The backup contains invalid medication dose schedule data.");
  if (data.medicationDoseOccurrences != null) assert(normalizeMedicationDoseOccurrenceCollection(data.medicationDoseOccurrences), "The backup contains invalid medication dose occurrence data.");
  if (data.protocols != null) recordArray(data.protocols, "Protocol", validateProtocol);
  if (data.protocolOccurrences != null) assert(normalizeProtocolOccurrenceCollection(data.protocolOccurrences), "The backup contains invalid Protocol occurrence data.");
  if (data.protocolCompoundOutcomes != null) assert(normalizeProtocolCompoundOutcomeCollection(data.protocolCompoundOutcomes), "The backup contains invalid Protocol compound outcome data.");
  if (data.injectionSiteEntries != null) assert(normalizeInjectionSiteCollection(data.injectionSiteEntries, data.protocols || []), "The backup contains invalid injection site data.");
  if (data.injectionSiteSettings != null) assert(normalizeInjectionSiteSettings(data.injectionSiteSettings), "The backup contains invalid injection site settings.");
  if (data.plannedWorkouts != null) assert(normalizePlannedWorkouts(data.plannedWorkouts), "The backup contains invalid planned workout data.");
  if (data.dailyActions != null) assert(normalizeDailyActionCollection(data.dailyActions), "The backup contains invalid daily action data.");
  if (data.workoutDraft != null) assert(normalizeWorkoutDraft(data.workoutDraft), "The backup contains invalid active workout draft data.");
  if (data.workoutEntries != null) recordArray(data.workoutEntries, "workout", validateWorkout);
  if (data.savedExercises != null) recordArray(data.savedExercises, "saved exercise", validateSavedExercise);
  if (data.trophyCaseEntries != null) recordArray(data.trophyCaseEntries, "Trophy Case", validateTrophy);
  if (data.journalEntries != null) validateJournalEntries(data.journalEntries);
  if (data.journalDraft != null) assert(normalizeJournalDraft(data.journalDraft), "The backup contains invalid Journal draft data.");
  if (data[JOURNAL_VAULT_STORAGE_KEY] != null) {
    validateJournalVaultEnvelope(data[JOURNAL_VAULT_STORAGE_KEY]);
    assert(data.journalEntries == null && data.journalDraft == null, "The backup mixes encrypted and plaintext Journal data.");
  }
}
