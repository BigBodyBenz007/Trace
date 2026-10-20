import { useEffect, useState } from 'react';
import BarcodeIngredients from '../components/BarcodeIngredients';
import { APP_THEMES, normalizeAppThemeId } from '../services/appThemes';
import { SOURCES } from './updatedNutritionScoring';
import { evaluateTraceNutrition } from './traceNutritionConversion';
import { PROFILES, OBSERVATIONS } from './updatedNutritionFixtures';
import { NAMES } from './nutritionPilotScoring';
import './NutritionPilot.css';
import UsdaProduceFallback from './UsdaProduceFallback';

const number = value => value == null ? 'Unknown' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
const unit = key => key === 'calories' ? 'kcal' : key === 'energyKj' ? 'kJ' : key === 'sodium' ? 'mg' : 'g';
const quantity = (values, key) => values?.[key] == null ? 'Unknown' : `${number(values[key])} ${unit(key)}`;
const span = value => value ? value.min === value.max ? value.min : `${value.min}–${value.max}` : 'Unknown';
const categories = { general: 'General food', beverage: 'Beverage', cheese: 'Cheese', 'red-meat': 'Red meat', 'fats-nuts-seeds': 'Fats, nuts & seeds', water: 'Plain water' };
const pointNames = { energy: 'Energy component', sugar: 'Total sugars', saturatedFat: 'Saturated fat component', salt: 'Salt', fiber: 'Fiber', plant: 'Eligible plant content', proteinApplied: 'Protein counted', nonNutritiveSweeteners: 'Beverage sweetener rule' };
// Historical linear presentation, only for the before/after comparison table.
const rows = OBSERVATIONS.map(profile => {
  const result = evaluateTraceNutrition(profile);
  const scores = [...new Set(result.rawCandidates.flatMap(({ category, rawScores }) => rawScores.map(raw =>
    category === 'water' ? 100 : Math.floor((category === 'beverage' ? 99 * (54 - raw) : 100 * (55 - raw)) / 72 + 0.5))))].sort((a, b) => a - b);
  return { profile, result, old: { nutritionScore100: scores.length === 1 ? scores[0] : null,
    scoreRange: scores.length ? [scores[0], scores[scores.length - 1]] : null } };
});
const scoreText = result => result.nutritionScore100 != null ? `${result.nutritionScore100}`
  : result.scoreRange ? `${result.scoreRange[0]}–${result.scoreRange[1]} possible` : 'Unavailable';

function AdditiveSummary({ profile }) {
  const additives = profile.additives;
  const reported = additives?.status === 'reported' && Array.isArray(additives.items);
  const summary = !reported ? 'Provider additive list unknown' : additives.items.length
    ? `${additives.items.length} provider-reported identifiers` : 'Provider reports an empty additive list';
  return <section id="pilot-ingredients" className="nutrition-pilot__card nutrition-pilot__ingredients" aria-label="Ingredients and additives">
    <h2>Ingredients &amp; additives</h2>
    <p className="nutrition-pilot__strong">{summary}</p>
    <p className="nutrition-pilot__muted">{profile.synthetic ? 'Synthetic control; no real product assessment.' : 'Scientific additive assessment: incomplete. No additive risk points are included.'}</p>
    <p className="nutrition-pilot__muted">Regulatory concerns: no product-specific review completed. Verified historical legal events require the relevant substance, use, jurisdiction and date.</p>
    {reported && <p className="nutrition-pilot__muted">Provider reporting is not independent confirmation. Empty lists do not prove absence.</p>}
    {reported && additives.items.length > 0 && <details>
      <summary>View reported additives</summary>
      <ul>{additives.items.map(item => <li key={item.providerIdentifier}>
        <strong>{item.standardizedIdentifier || item.providerIdentifier}</strong>: {item.name || 'Name not in the verified reference'}
        <div className="nutrition-pilot__muted">Original tag: {item.providerIdentifier} · {item.source}</div>
      </li>)}</ul>
      <p className="nutrition-pilot__muted">Verified names and historical legal records do not establish additive risk or product safety.</p>
    </details>}
    <BarcodeIngredients key={profile.id} ingredients={profile.ingredients} attribution={profile.source?.provider} />
  </section>;
}

function Reasons({ result }) {
  if (!Object.keys(result.points).length && result.methodCategory !== 'water') return <ul className="nutrition-pilot__reasons">{result.reasons.map((r, i) => <li key={i}>{r.message}</li>)}</ul>;
  if (result.methodCategory === 'water') return <p className="nutrition-pilot__reasons">Plain water receives the method’s highest beverage band.</p>;
  const points = result.points;
  const adverse = ['sugar', 'saturatedFat', 'salt'].filter(key => points[key]?.max > 0)
    .sort((a, b) => points[b].max - points[a].max);
  const descriptions = { sugar: 'Total sugars contribute to this result.', saturatedFat: 'Saturated fat contributes to this result.', salt: 'Salt contributes to this result.' };
  const benefits = [points.fiber?.min > 0 && 'fiber', points.proteinApplied?.min > 0 && 'protein', points.plant?.min > 0 && 'eligible plant content'].filter(Boolean);
  return <ul className="nutrition-pilot__reasons">
    <li>{adverse.length ? descriptions[adverse[0]] : 'Sugars, saturated fat and salt fall in the method’s lowest bands.'}</li>
    {benefits.length > 0 && <li>The method credits this profile for {benefits.join(', ')}.</li>}
    {points.nonNutritiveSweeteners?.min > 0 && <li>The published beverage rule accounts for non-nutritive sweeteners; this is not a toxicity assessment.</li>}
    {result.nutritionScore100 === null && <li>More ingredient or formulation evidence is needed for a single score.</li>}
  </ul>;
}

function SourceConfidence({ profile }) {
  const market = profile.evidence?.market;
  const confidence = profile.synthetic ? 'Synthetic example; no real product.'
    : profile.sourceState?.unresolvedConflicts?.length ? 'Unresolved source / panel conflict; formulation not established.'
      : profile.sourceState?.cacheStale || profile.sourceState?.superseded ? 'Archived source is stale or superseded; current formulation not established.'
        : profile.source?.kind === 'government-composition' ? 'USDA generic composition; no product formulation match.'
      : market?.claim !== 'US' ? 'US formulation not established.'
        : market.verification === 'matched-formulation' ? 'US panel and presentation linked in archived evidence.'
          : 'US-oriented source; exact formulation match incomplete.';
  return <div className="nutrition-pilot__source-summary" aria-label="Source and formulation confidence">
    <p><strong>Source:</strong> {profile.source?.url ? <a href={profile.source.url} target="_blank" rel="noreferrer">{profile.source.provider}</a> : profile.source?.provider || 'Unknown'}</p>
    <p>{confidence} {!profile.synthetic && 'Current shelf / barcode match unconfirmed.'}</p>
  </div>;
}

export default function NutritionPilot() {
  const params = new URLSearchParams(window.location.search);
  const [selected, setSelected] = useState(PROFILES.some(p => p.id === params.get('profile')) ? params.get('profile') : 'plain-yogurt');
  const [theme, setTheme] = useState(normalizeAppThemeId(params.get('theme')));
  const profile = PROFILES.find(p => p.id === selected);
  const result = evaluateTraceNutrition(profile);
  const declared = Object.fromEntries(Object.entries(profile.nutrients || {}).map(([key, measurement]) => [key, measurement.value]));
  useEffect(() => {
    const priorTheme = document.documentElement.dataset.traceShellTheme;
    document.documentElement.dataset.traceShellTheme = theme;
    return () => { if (priorTheme) document.documentElement.dataset.traceShellTheme = priorTheme;
      else delete document.documentElement.dataset.traceShellTheme; };
  }, [theme]);
  return <main className="nutrition-pilot" data-trace-shell-theme={theme}>
    <header className="nutrition-pilot__header">
      <div><p className="nutrition-pilot__eyebrow">TRACE / LOCAL PREVIEW</p><h1>Nutrition, explained.</h1></div>
      <a href="/">Return to Trace</a>
    </header>
    <p className="nutrition-pilot__intro">Experimental nutrition score · local preview</p>
    <div className="nutrition-pilot__controls">
      <label>Food or test profile<select value={selected} onChange={event => setSelected(event.target.value)}>
        <optgroup label="18 dated US observations">{PROFILES.filter(p => !p.synthetic).map(p => <option key={p.id} value={p.id}>{p.product.name}</option>)}</optgroup>
        <optgroup label="Synthetic mechanics controls">{PROFILES.filter(p => p.synthetic).map(p => <option key={p.id} value={p.id}>{p.product.name}</option>)}</optgroup>
      </select></label>
      <label>Preview theme<select value={theme} onChange={event => setTheme(event.target.value)}>
        {APP_THEMES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select></label>
    </div>
    <div className="nutrition-pilot__grid">
      <section className="nutrition-pilot__card" aria-label="Nutrition assessment">
        <p className="nutrition-pilot__eyebrow">{profile.synthetic ? 'SYNTHETIC CONTROL' : profile.product.brand || 'GENERIC FOOD COMPOSITION'}</p>
        <h2 className="nutrition-pilot__product">{profile.product.name}</h2>
        <div className="nutrition-pilot__score-row">
          <div className="nutrition-pilot__score" aria-label="Nutrition rating">{result.nutritionScore100 != null
            ? <>{result.nutritionScore100}<span>/100</span></>
            : <span className="nutrition-pilot__unavailable">Not available</span>}</div>
          <div><strong>Nutrition score</strong><p className="nutrition-pilot__muted">{categories[result.methodCategory] || 'Category unresolved'} · per 100 {result.normalized.basis.unit || '?'}</p></div>
        </div>
        {result.nutritionScore100 === null && result.scoreRange && <p className="nutrition-pilot__muted" aria-label="Possible nutrition score">Possible score: {result.scoreRange.join('–')}/100. No single score assigned.</p>}
        <p className="nutrition-pilot__muted">Experimental nutrition only. A score of 100 does not mean perfect health or zero risk.</p>
        <Reasons result={result} />
        <SourceConfidence profile={profile} />
        <p className="nutrition-pilot__additive-link"><a href="#pilot-ingredients">Additive assessment incomplete · view ingredients</a></p>
      </section>
      <AdditiveSummary profile={profile} />
      <details className="nutrition-pilot__card">
        <summary>Nutrition &amp; calculation</summary>
        <p>Declared basis: {number(profile.basis?.amount)} {profile.basis?.unit || '(unit unknown)'}. Unknown values remain unknown.</p>
        <div className="nutrition-pilot__table-wrap"><table>
          <thead><tr><th>Nutrient</th><th>Declared</th><th>Per 100 {result.normalized.basis.unit || '?'}</th></tr></thead>
          <tbody>{Object.entries(NAMES).filter(([key]) => key !== 'freeSugar' || profile.nutrients?.freeSugar).map(([key, label]) => <tr key={key}>
            <th scope="row">{label}</th><td>{quantity(declared, key)}</td><td>{quantity(result.normalized.nutrients, key)}</td>
          </tr>)}</tbody>
        </table></div>
        <p>Total sugars determine points. Added and free sugars remain separate; neither is substituted for total sugars.</p>
        <p>Published raw points: {result.rawScore ?? (result.rawRange ? result.rawRange.join(' to ') : 'Unavailable')}. Trace numerical result: {scoreText(result)}.</p>
        <ul>{Object.entries(pointNames).filter(([key]) => result.points[key]).map(([key, label]) => <li key={key}>{label}: {span(result.points[key])} points</li>)}</ul>
        <p>Updated eligible plant fraction: {profile.updatedFvlContent ? `${profile.updatedFvlContent.percent}% · ${profile.updatedFvlContent.basis}` : 'Unknown; possible point bands tested without assigning a percentage.'}</p>
        <ul>{(result.categoryRules || []).map(item => <li key={item}>{item}</li>)}</ul>
        <ul>{result.normalized.conversions.map(item => <li key={item}>{item}</li>)}</ul>
        {result.warnings.length > 0 && <details><summary>Input qualifications</summary><ul>{result.warnings.map(item => <li key={item}>{item}</li>)}</ul></details>}
      </details>
      <details className="nutrition-pilot__card">
        <summary>Sources &amp; product match</summary>
        <p>Variant: {profile.product.variant || 'Not recorded'}<br />Presentation: {profile.product.packageDescription || 'Not recorded'}<br />GTIN: {profile.product.gtin || 'Unknown'}</p>
        <p>Market evidence: {profile.evidence?.market?.statement || profile.evidence?.market?.claim || 'Unknown'}.</p>
        <p>Source edition: {profile.source?.edition || 'Unknown'} · reviewed {profile.evidence?.reviewedOn || 'date unknown'}.</p>
        <p className="nutrition-pilot__hash">Source SHA-256: {profile.source?.artifact?.sha256 || 'Not recorded'}</p>
        <ul>{(profile.updatedMethodNotes || []).map(item => <li key={item}>{item}</li>)}</ul>
        <p>Barcode match: not established by this preview. A calculable profile does not prove a current US shelf formulation or scan match.</p>
        <p>Generic USDA profiles are complete composition records, not missing values spliced into manufacturer observations.</p>
      </details>
      <details className="nutrition-pilot__card">
        <summary>Method &amp; limitations</summary>
        <p>Updated Nutri-Score (2022 food / 2023 beverage revisions). Version: {result.methodVersion}.</p>
        <p>Trace maps the published nutritional categories into numerical ranges: 80–99, 60–79, 40–59, 20–39 and 0–19, from most to least favorable. Within them, a continuous piecewise line converts raw points; the final number is rounded down. Exact anchors are recorded in the development report. Plain water retains its categorical reference of 100; other profiles cannot receive 100.</p>
        <p>The numerical ranges, halfway boundaries and interpolation are Trace choices, not an official conversion or validated health-risk measurement. Narrow published raw intervals produce larger display changes per raw point. Within-category differences remain experimental.</p>
        <p>Identical raw points and categories receive identical numbers. Thresholds, component tradeoffs and rounding can create ties. Compare substitutes or foods serving a similar meal role; category-specific rules do not establish a universal ranking of foods or portions.</p>
        <p>Energy, total sugars, saturated fat and salt contribute adverse points. Fiber, eligible plant content and permitted protein contribute favorable points. Fats, nuts, seeds, cheese, red meat and beverages have specific rules. The beverage sweetener rule is part of nutrition mathematics, not an additive safety rating.</p>
        <p>Combined rating unavailable: no combined method is defined for this numerical presentation. Additive and regulatory assessments remain separate; these numbers are never fed into the previous composite.</p>
        <p>This European method is applied to dated US observations. It does not imply FDA endorsement, current product compliance, safety or a verified Yuka rating.</p>
        <p><a href={SOURCES.guide}>Official updated rules</a> · <a href={SOURCES.calculator}>Official updated calculator</a></p>
        <p>Public grade=null; scoreReady=false. No consumer grades, automatic additive risk penalties, saved scores or scanner changes.</p>
      </details>
    </div>
    <UsdaProduceFallback />
    <details className="nutrition-pilot__card nutrition-pilot__comparison"><summary>Compare 18 observations · {rows.filter(r => r.result.nutritionScore100 != null).length} nutrition scores available</summary>
      <p>Before: the theoretical-endpoint linear conversion. Revised: calibration to published nutritional categories, using the same raw points and product data. A numerical change is not a measured health change. Ranges preserve unresolved inputs.</p>
      <div className="nutrition-pilot__table-wrap"><table><thead><tr><th>Observation</th><th>Before /100</th><th>Updated /100</th><th>Remaining gap / interpretation</th></tr></thead>
        <tbody>{rows.map(({ profile: p, old, result: r }) => <tr key={p.id}><th scope="row">{p.product.name}</th>
          <td>{scoreText(old)}</td><td>{scoreText(r)}</td>
          <td>{r.reasons.map(reason => reason.message).join(' ') || 'Dated observation; no current shelf or barcode match inferred.'}</td>
        </tr>)}</tbody>
      </table></div>
    </details>
  </main>;
}
