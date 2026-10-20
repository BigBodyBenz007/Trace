import { useState } from 'react';
import { assessProduceFallback } from '../services/usdaProduceFallback';
import { evaluateTraceNutrition } from './traceNutritionConversion';
import { USDA_PRODUCE_REFERENCES } from './usdaProduceFixtures';

export default function UsdaProduceFallback() {
  const [referenceId, setReferenceId] = useState(USDA_PRODUCE_REFERENCES[0].id);
  const [confirmed, setConfirmed] = useState(false);
  const [selection, setSelection] = useState(null);
  const reference = USDA_PRODUCE_REFERENCES.find(item => item.id === referenceId);
  const reset = value => { setReferenceId(value); setConfirmed(false); setSelection(null); };
  const choose = () => setSelection(assessProduceFallback({ reference,
    productEvidence: { status: 'unknown' },
    confirmation: { referenceId, plainFreshSingleIngredient: confirmed, acceptGenericEstimate: confirmed,
      confirmedOn: new Date().toISOString().slice(0, 10) } }));
  const result = selection?.eligible ? evaluateTraceNutrition(reference) : null;
  return <details className="nutrition-pilot__card nutrition-pilot__produce">
    <summary>Try a USDA produce estimate</summary>
    <p>Unknown barcode scenario — separate from the observation above. A failed lookup does not identify the food. No scanner or saved record is connected to this demonstration.</p>
    <label>Generic USDA reference<select value={referenceId} onChange={event => reset(event.target.value)}>
      {USDA_PRODUCE_REFERENCES.map(item => <option key={item.id} value={item.id}>{item.product.name}</option>)}
    </select></label>
    <label className="nutrition-pilot__confirmation"><input type="checkbox" checked={confirmed}
      onChange={event => { setConfirmed(event.target.checked); setSelection(null); }} />
      I checked that this is the selected plain, fresh, raw, single-ingredient produce. I accept a generic estimate, not exact package nutrition.</label>
    <p>Do not use this for flavored, sweetened, dried, canned, juiced, prepared or mixed foods. If the food identity is uncertain, leave it unselected.</p>
    <button type="button" disabled={!confirmed} onClick={choose}>Use generic produce estimate</button>
    {selection && <section aria-label="USDA produce estimate" className="nutrition-pilot__produce-result">
      <h2>{reference.source.documentTitle}</h2>
      <div className="nutrition-pilot__score" aria-label="Generic nutrition rating">{result?.nutritionScore100 != null
        ? <>{result.nutritionScore100}<span>/100</span></> : <span className="nutrition-pilot__unavailable">Not available</span>}</div>
      <p><strong>USDA generic reference · user-confirmed association.</strong> Product identity remains unverified. Exact package composition and barcode matching are not established.</p>
      <p>{reference.produceIdentity.cultivar ? `Cultivar-specific USDA reference: ${reference.produceIdentity.cultivar}; still not a verified package profile.`
        : reference.produceIdentity.food === 'apple'
          ? 'Generic raw apple; no cultivar-specific match. Generic apple is not verified Gala nutrition.'
          : 'Generic food reference; no cultivar-specific or package match.'}</p>
      {selection.reasons.length > 0 && <ul>{selection.reasons.map((reason, i) => <li key={i}>{reason.message}</li>)}</ul>}
      <p>Package ingredients: unknown. Package additives: unknown. USDA food identity does not prove additive absence. Additive assessment incomplete; no additive penalties.</p>
      <p><a href={reference.source.url} target="_blank" rel="noreferrer">USDA FoodData Central {reference.source.recordId}</a> · {reference.source.edition}. Per 100 g edible portion, raw.</p>
      <details><summary>Reference nutrients &amp; provenance</summary>
        <p>{reference.source.attribution} · Source verification: {reference.source.verification || 'Previously reviewed official record'}.</p>
        <ul>{Object.entries(reference.nutrients).map(([key, n]) => <li key={key}>{key}: {n.value == null ? 'Unknown' : `${n.value} ${n.unit}`}</li>)}</ul>
        <p>Published raw points: {result?.rawScore ?? 'Unavailable'}. Experimental Trace conversion; no fruit bonus or changed formula. Generic estimates do not establish permission to use an official package label.</p>
      </details>
      <button type="button" onClick={() => { setConfirmed(false); setSelection(null); }}>Clear generic selection</button>
    </section>}
  </details>;
}
