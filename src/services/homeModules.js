export const HOME_MODULES = Object.freeze([
  Object.freeze({ id: "schedule", label: "Today's Schedule", group: "core" }),
  Object.freeze({ id: "nutrition", label: "Nutrition", group: "core" }),
  Object.freeze({ id: "health", label: "Health", group: "core" }),
  Object.freeze({ id: "workouts", label: "Workouts", group: "secondary" }),
  Object.freeze({ id: "medications", label: "Medications & Supplements", group: "secondary" }),
  Object.freeze({ id: "protocols", label: "Protocols", group: "secondary" }),
  Object.freeze({ id: "journal", label: "Journal", group: "utility" }),
  Object.freeze({ id: "trophyCase", label: "Trophy Case", group: "utility" }),
]);

export const DEFAULT_HOME_VISIBILITY = Object.freeze(Object.fromEntries(
  HOME_MODULES.map(({ id }) => [id, true])
));

export function normalizeHomeVisibility(value) {
  return Object.fromEntries(HOME_MODULES.map(({ id }) => [
    id,
    value?.[id] !== false,
  ]));
}

export function homeModulesInGroup(group) {
  return HOME_MODULES.filter((module) => module.group === group);
}
