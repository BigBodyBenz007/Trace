import { useState } from "react";
import { NUTRITION_ENTRY_NUTRIENT_KEYS, isUnknownNutritionValue } from "../services/nutritionCalculation";
import { formatNutrientValue } from "../services/nutritionDisplay";
import { calculateWaterSummary, formatWaterAmount } from "../services/waterTracker";
import "./NutritionSummary.css";

function localDateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatSummaryValue(value, nutrient, unit = "") {
  if (value === null || value === undefined) return "Unknown";
  const decimals = nutrient === "calories" ? 0 : ["protein", "carbohydrates"].includes(nutrient) ? 1 : null;
  return formatNutrientValue(decimals === null ? value : Number(Number(value).toFixed(decimals)), nutrient, unit);
}

export function calculateDailyNutritionTotals(entries, date = new Date()) {
  const day = localDateValue(date);
  const totals = Object.fromEntries(NUTRITION_ENTRY_NUTRIENT_KEYS.map((key) => [key, { value: 0, knownCount: 0 }]));
  totals.entryCount = 0;
  entries.forEach((entry) => {
    if (localDateValue(new Date(entry.loggedAt)) !== day) return;
    totals.entryCount += 1;
    NUTRITION_ENTRY_NUTRIENT_KEYS.forEach((key) => {
      if (isUnknownNutritionValue(entry[key]) || Number(entry[key]) < 0) return;
      totals[key].value += Number(entry[key]);
      totals[key].knownCount += 1;
    });
  });
  return totals;
}

function Progress({ label, current, goal, partial = false }) {
  const hasGoal = Number(goal) > 0;
  const percent = hasGoal && current !== null ? Math.min(100, current / goal * 100) : 0;
  return (
    <div
      className="trace-nutrition-progress"
      role="progressbar"
      aria-label={`${label} progress`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={hasGoal && current !== null ? percent : undefined}
      aria-valuetext={current === null ? "Unknown" : !hasGoal ? "No goal set" : `${Math.round(current / goal * 100)}%${partial ? " · Known values only; incomplete" : ""}`}
    >
      <div style={{ width: `${percent}%` }} />
    </div>
  );
}

function Nutrient({ nutrient, label, unit = "", totals, goals, primary = false }) {
  const total = totals[nutrient];
  const optional = ["fiber", "totalSugar", "addedSugar"].includes(nutrient);
  const unknown = total.knownCount === 0 && (totals.entryCount > 0 || optional);
  const partial = total.knownCount > 0 && total.knownCount < totals.entryCount;
  const current = unknown ? null : total.value;
  const goal = Number(goals[nutrient]) || 0;
  const hasGoal = goal > 0;
  const calories = nutrient === "calories";
  const compactMacro = nutrient === "protein" || nutrient === "carbohydrates";
  const remaining = goal - total.value;

  return (
    <div className={`trace-stat-card trace-nutrition-metric${calories ? " trace-nutrition-metric--calories" : ""}`}>
      <strong className="trace-nutrition-metric__label">{partial && !compactMacro ? `Known ${label}` : label}{unit && !compactMacro ? ` (${unit})` : ""}</strong>
      <p className="trace-nutrition-metric__value" aria-describedby={partial ? "nutrition-completeness" : undefined}>
        <span>{formatSummaryValue(current, nutrient, hasGoal ? "" : unit)}</span>
        {hasGoal ? <span className="trace-nutrition-metric__goal"> / {formatSummaryValue(goal, nutrient)}{unit ? ` ${unit}` : ""}</span> : !optional && <small> · No goal set</small>}
      </p>
      {calories && hasGoal && <p className="trace-nutrition-remaining">
        {unknown || partial ? "Remaining unknown" : `${formatSummaryValue(Math.abs(remaining), nutrient)} ${remaining < 0 ? "over goal" : "left"}`}
      </p>}
      {(primary || hasGoal) && <Progress label={label} current={current} goal={goal} partial={partial} />}
    </div>
  );
}

function ActionIcon({ scan = false }) {
  return <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    {scan ? <><path d="M7 3H4a1 1 0 0 0-1 1v3m14-4h3a1 1 0 0 1 1 1v3M3 17v3a1 1 0 0 0 1 1h3m10 0h3a1 1 0 0 0 1-1v-3" /><path d="M7 7v10m4-10v10m3-10v10m3-10v10" /></> : <><circle cx="12" cy="12" r="9" /><path d="M12 8v8m-4-4h8" /></>}
  </svg>;
}

export default function NutritionSummary({ entries, goals, waterEntries, waterUnit, summaryRef, barcodeAccess, scanButtonRef, onScanBarcode, onAddFood, selectedDate: controlledDate, onDateChange }) {
  const [expanded, setExpanded] = useState(false);
  // An empty selection follows today, including after a laptop resumes on a later day.
  const [localSelectedDate, setLocalSelectedDate] = useState("");
  const selectedDate = controlledDate ?? localSelectedDate;
  const setSelectedDate = onDateChange ?? setLocalSelectedDate;
  const today = new Date();
  const dateValue = selectedDate || localDateValue(today);
  const day = new Date(`${dateValue}T12:00:00`);
  const totals = calculateDailyNutritionTotals(entries, day);
  const hasPartialTotals = NUTRITION_ENTRY_NUTRIENT_KEYS.some((key) => totals[key].knownCount > 0 && totals[key].knownCount < totals.entryCount);
  const water = calculateWaterSummary(waterEntries, day);
  const waterGoal = Number(goals.waterGoalMl) || 0;
  const nutrientProps = { totals, goals };

  return <div className="trace-nutrition-overview">
    <header className="trace-nutrition-heading">
      <h1>Nutrition</h1>
      <label className="trace-nutrition-date">
        <span aria-hidden="true">{dateValue === localDateValue(today) ? "Today" : day.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(day.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}) })} <span className="trace-nutrition-chevron" /></span>
        <input aria-label="Nutrition date" type="date" value={dateValue} onChange={(event) => setSelectedDate(event.target.value === localDateValue(today) ? "" : event.target.value)} />
      </label>
    </header>
    <section aria-labelledby="nutrition-daily-totals" className="trace-feature-surface trace-nutrition-today trace-nutrition-summary" ref={summaryRef}>
      <h2 id="nutrition-daily-totals" className="trace-nutrition-sr-only">Daily Totals</h2>
      <Nutrient {...nutrientProps} nutrient="calories" label="Calories" primary />
      <div className="trace-nutrition-macros">
        <Nutrient {...nutrientProps} nutrient="protein" label="Protein" unit="g" primary />
        <Nutrient {...nutrientProps} nutrient="carbohydrates" label="Carbs" unit="g" primary />
      </div>
      {hasPartialTotals && <p id="nutrition-completeness" className="trace-nutrition-incomplete">Totals may be incomplete: some foods have missing nutrition data.</p>}
      <button className="trace-action trace-action--secondary trace-nutrition-details-toggle" type="button" aria-expanded={expanded} aria-controls="nutrition-details" onClick={() => setExpanded((value) => !value)}>
        {expanded ? "Hide nutrition details" : "View all nutrition"}
        <span aria-hidden="true" className={`trace-nutrition-chevron${expanded ? " trace-nutrition-chevron--up" : ""}`} />
      </button>
      <div className="trace-nutrition-details" id="nutrition-details" hidden={!expanded}>
        <Nutrient {...nutrientProps} nutrient="fat" label="Fat" unit="g" />
        <Nutrient {...nutrientProps} nutrient="sodium" label="Sodium" unit="mg" />
        <div className="trace-stat-card trace-nutrition-metric">
          <strong className="trace-nutrition-metric__label">Water ({waterUnit})</strong>
          <p className="trace-nutrition-metric__value">{formatWaterAmount(water.todayMl, waterUnit)}{waterGoal > 0 && ` / ${formatWaterAmount(waterGoal, waterUnit)}`}</p>
          {waterGoal > 0 && <Progress label="Water" current={water.todayMl} goal={waterGoal} />}
        </div>
        <Nutrient {...nutrientProps} nutrient="totalSugar" label="Total Sugar" unit="g" />
        <Nutrient {...nutrientProps} nutrient="addedSugar" label="Added Sugar" unit="g" />
        <Nutrient {...nutrientProps} nutrient="fiber" label="Fiber" unit="g" />
      </div>
    </section>
    <div className="trace-nutrition-quick-actions">
      <button type="button" className="trace-action trace-action--secondary" ref={scanButtonRef} disabled={!barcodeAccess.available} aria-describedby="nutrition-scanner-access" onClick={onScanBarcode}><ActionIcon scan />Scan Barcode</button>
      <button type="button" className="trace-action trace-action--secondary" onClick={onAddFood}><ActionIcon />Add Food</button>
    </div>
    <p id="nutrition-scanner-access" className={barcodeAccess.available ? "trace-nutrition-sr-only" : "trace-nutrition-incomplete"}>{barcodeAccess.label}. {barcodeAccess.message}</p>
  </div>;
}
