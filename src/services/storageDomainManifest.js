export const STORAGE_DOMAIN_CLASSIFICATION = Object.freeze({
  DURABLE_BACKUP: "durable-backup",
  DERIVED_EXCLUDED: "derived-excluded",
  TRANSACTION_RECOVERY_EXCLUDED: "transaction-recovery-excluded",
  EPHEMERAL_EXCLUDED: "ephemeral-excluded",
});

const durableLocalStorage = (key, owner, description) => ({
  key,
  storage: "localStorage",
  classification: STORAGE_DOMAIN_CLASSIFICATION.DURABLE_BACKUP,
  backupLocation: `data.structured.${key}`,
  owner,
  description,
});

const excludedLocalStorageTransaction = (key, owner, description) => ({
  key,
  storage: "localStorage",
  classification: STORAGE_DOMAIN_CLASSIFICATION.TRANSACTION_RECOVERY_EXCLUDED,
  backupLocation: null,
  owner,
  description,
});

const excludedLocalStorageDerived = (key, owner, description) => ({
  key,
  storage: "localStorage",
  classification: STORAGE_DOMAIN_CLASSIFICATION.DERIVED_EXCLUDED,
  backupLocation: null,
  owner,
  description,
});

export const TRACE_STORAGE_DOMAIN_MANIFEST = Object.freeze([
  durableLocalStorage("memories", "App / photoStorage", "Memory metadata and IndexedDB photo references."),
  durableLocalStorage("nutritionGoals", "App", "Nutrition and water goals."),
  durableLocalStorage("userFoods", "userFoodCatalog", "User-created grocery and other saved foods."),
  durableLocalStorage("nutritionEntries", "App", "Logged nutrition, including branded and restaurant snapshots."),
  durableLocalStorage("waterEntries", "waterTracker", "Versioned water history."),
  durableLocalStorage("healthMeasurementEntries", "healthMeasurements", "Health measurement history."),
  durableLocalStorage("appSettings", "appSettings", "Settings, Home visibility, theme, units, and motion preference."),
  durableLocalStorage("medicationEntries", "App / medicationDoseSchedule / protocolCompoundOutcome", "Medication and supplement history."),
  durableLocalStorage("medicationCompounds", "compoundCatalog", "Saved medication and supplement compounds."),
  durableLocalStorage("medicationDoseSchedules", "medicationDoseSchedule", "Versioned dose schedules."),
  durableLocalStorage("medicationDoseOccurrences", "medicationDoseSchedule", "Versioned scheduled-dose occurrence state."),
  durableLocalStorage("protocols", "protocol", "Protocol definitions."),
  durableLocalStorage("protocolOccurrences", "protocolOccurrence / protocolCompoundOutcome", "Protocol completion and skip state."),
  durableLocalStorage("protocolCompoundOutcomes", "protocolCompoundOutcome", "Protocol compound results."),
  durableLocalStorage("injectionSiteEntries", "injectionSite", "Injection Site Tracker sessions and shots."),
  durableLocalStorage("injectionSiteSettings", "injectionSite", "Injection Site Tracker body-style settings."),
  durableLocalStorage("plannedWorkouts", "plannedWorkout", "Planned workouts and Today workout state."),
  durableLocalStorage("workoutTemplates", "workoutTemplate", "Reusable workout templates and editable target guidance."),
  durableLocalStorage("dailyActions", "dailyAction", "Versioned Today actions."),
  durableLocalStorage("workoutDraft", "workoutDraft", "Active workout draft, including its persistent start time."),
  durableLocalStorage("workoutEntries", "App", "Workout history and IndexedDB photo references."),
  durableLocalStorage("savedExercises", "exerciseCatalog", "Saved exercise catalog."),
  durableLocalStorage("trophyCaseEntries", "trophyCase", "Trophy Case entries."),
  durableLocalStorage("journalEntries", "journalEntry / journalVault", "Plaintext Journal entries when Privacy Lock is disabled."),
  durableLocalStorage("journalDraft", "journalEntry / journalVault", "Plaintext unfinished Journal draft when Privacy Lock is disabled."),
  durableLocalStorage("journalVault", "journalVault", "Encrypted Journal entries and draft when Privacy Lock is enabled."),
  {
    key: "tracePhotoStorage/photos/*",
    storage: "indexedDB",
    classification: STORAGE_DOMAIN_CLASSIFICATION.DURABLE_BACKUP,
    backupLocation: "data.photos",
    owner: "photoStorage",
    description: "Memory and workout photo records, including blob bytes and reference metadata.",
  },
  excludedLocalStorageTransaction(
    "journalVaultTransaction",
    "journalVault",
    "Journal Privacy Lock enable, disable, replace, and reset recovery journal."
  ),
  excludedLocalStorageTransaction(
    "medicationDoseCompletionTransaction",
    "medicationDoseSchedule",
    "Medication dose completion and undo recovery journal."
  ),
  excludedLocalStorageTransaction(
    "protocolCompoundOutcomeTransaction",
    "protocolCompoundOutcome",
    "Protocol result save and undo recovery journal."
  ),
  excludedLocalStorageDerived(
    "remoteBarcodeFoodResponses",
    "remoteBarcodeCache",
    "Versioned, bounded, rebuildable normalized remote barcode lookup responses."
  ),
  {
    key: "tracePhotoStorage/migrations/legacy-memory-photos",
    storage: "indexedDB",
    classification: STORAGE_DOMAIN_CLASSIFICATION.TRANSACTION_RECOVERY_EXCLUDED,
    backupLocation: null,
    owner: "photoStorage",
    description: "Staging and recovery marker for the legacy inline-photo migration.",
  },
  {
    key: "trace-app-shell-*",
    storage: "cacheStorage",
    classification: STORAGE_DOMAIN_CLASSIFICATION.DERIVED_EXCLUDED,
    backupLocation: null,
    owner: "service-worker",
    description: "Rebuildable application-shell and static-asset responses.",
  },
]);

export const TRACE_BACKUP_STORAGE_KEYS = Object.freeze(
  TRACE_STORAGE_DOMAIN_MANIFEST
    .filter(({ storage, classification }) =>
      storage === "localStorage" && classification === STORAGE_DOMAIN_CLASSIFICATION.DURABLE_BACKUP
    )
    .map(({ key }) => key)
);

export const TRACE_RECOVERABLE_TRANSACTION_KEYS = Object.freeze(
  TRACE_STORAGE_DOMAIN_MANIFEST
    .filter(({ storage, classification }) =>
      storage === "localStorage" &&
      classification === STORAGE_DOMAIN_CLASSIFICATION.TRANSACTION_RECOVERY_EXCLUDED
    )
    .map(({ key }) => key)
);

export function unclassifiedStorageKeys(keys) {
  const classified = new Set(TRACE_STORAGE_DOMAIN_MANIFEST.map(({ key }) => key));
  return [...new Set(keys)].filter((key) => !classified.has(key));
}
