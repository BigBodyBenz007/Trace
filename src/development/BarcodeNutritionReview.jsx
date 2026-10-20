import { assessBarcodeNutrition } from './barcodeNutritionAssessment';
import { normalizeProductAdditives } from '../services/productAdditives';
import { getAdditiveNameSource } from '../services/additiveNameReference';
import { explainNutritionPoints, getBarcodeAdditiveInformation } from './barcodeReviewInformation';
import './BarcodeNutritionReview.css';

export default function BarcodeNutritionReview({ candidate, identifier }) {
  const assessment = assessBarcodeNutrition(candidate, identifier);
  const score = assessment.nutritionScore100;
  return <section className="trace-barcode-grade" aria-label="Experimental nutrition assessment">
    <div className="trace-barcode-grade__headline"><strong aria-label="Experimental nutrition rating" data-unavailable={score == null}>{score == null ? 'Score unavailable' : <>{score}<small>/100</small></>}</strong>
      <span>Experimental nutrition{score != null && <small>Per 100 {assessment.result.normalized.basis.unit}</small>}</span></div>
    {score != null ? <p>{explainNutritionPoints(assessment.result)} No separate additive-risk penalty is applied.</p>
      : <p>{assessment.reasons.slice(0, 3).join(' ')}{assessment.reasons.length > 3 && ' Further gaps are listed below.'}</p>}
    <p className="trace-barcode-grade__confidence">{assessment.confidence}</p>
    <details aria-label="Score details & limitations"><summary>Score details &amp; limitations</summary>
      <p>GTIN: {identifier?.value || 'Unknown'}. Source: {candidate.display.attribution}. Edition: {candidate.display.assessmentInputs?.source?.revisionDate || 'Undated'}.</p>
      <p>{candidate.display.basisMessage} Package: {candidate.display.packageQuantity || 'Unknown'}. Servings per container: {candidate.display.servingsPerContainer ?? 'Unknown'}.</p>
      <ul>{assessment.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
      {assessment.result && <p>Published raw points: {assessment.result.rawScore ?? 'Unresolved'}. Updated nutrient profiling with Trace's experimental numerical calibration.</p>}
      {assessment.result && <ul>{Object.entries(assessment.result.points).filter(([key]) =>
        ['energy', 'sugar', 'saturatedFat', 'salt', 'fiber', 'proteinApplied', 'plant', 'nonNutritiveSweeteners'].includes(key))
        .map(([key, value]) => <li key={key}>{key}: {value.min === value.max ? value.min : `${value.min}–${value.max}`} points</li>)}</ul>}
      <p>Not an official score, FDA endorsement, safety judgment or health-risk percentage. A score of 100 does not mean perfect health. Provider market claims do not verify a specific US formulation.</p>
      <p>Public grade=null; scoreReady=false. This assessment is not saved with the food.</p>
    </details>
  </section>;
}

function InformationSource({ source }) {
  return <small><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> · {source.jurisdiction} · {source.provision} · {source.edition} · Reviewed {source.reviewedOn}</small>;
}

export function BarcodeAdditives({ candidate }) {
  const value = candidate.display.additives;
  const additives = normalizeProductAdditives(value, value?.source);
  const reported = additives?.status === 'reported';
  const count = reported ? additives.items.length : null;
  const references = reported ? [...new Map(additives.items.filter(item => item.nameReference).map(item =>
    [`${item.nameReference.sourceId}:${item.nameReference.referenceVersion}`, item.nameReference])).values()] : [];
  return <details className="trace-barcode-additives" aria-label="Product additives">
    <summary>Additives · {count == null ? 'unknown' : count === 0 ? 'empty provider list' : `${count} provider-reported`}</summary>
    {reported ? <>
      <p>Source: Open Food Facts contributors · structured additives_tags. Presence is provider-reported, not independently confirmed.</p>
      {count === 0 && <p>The provider reports an empty list. This does not prove the product contains no additives.</p>}
      {count > 0 && <p>Verified general functions are listed below; the manufacturer’s purpose and amounts in this product are not confirmed.</p>}
      <ul>{additives.items.map(item => {
        const info = item.nameReference ? getBarcodeAdditiveInformation(item.standardizedIdentifier) : null;
        return <li key={item.providerIdentifier}><strong>{item.standardizedIdentifier || 'Unrecognized identifier'}</strong> — {item.name || 'Name unknown'}
          <small>Original: {item.providerIdentifier} · {item.source}</small>
          {info ? <><p>{info.function}<InformationSource source={info.functionSource} /></p>
            {info.concern && <p>Scientific context: {info.concern.text}<InformationSource source={info.concern.source} /></p>}
            {info.regulation ? <p>Verified US provision: {info.regulation.text}<InformationSource source={info.regulation.source} /></p>
              : <p>US regulatory conditions have not been reviewed here for this identifier.</p>}
            <p>Scientific assessment incomplete; no product-specific risk conclusion.</p>
          </> : <p>Identity not verified in this reference; function, scientific assessment and US regulatory conditions remain unknown.</p>}
        </li>;
      })}</ul>
      {references.map(reference => {
        const source = getAdditiveNameSource(reference);
        return source ? <p key={`${reference.sourceId}:${reference.referenceVersion}`}>Verified name reference: <a href={source.url} target="_blank" rel="noreferrer">{source.title || source.documentTitle}</a> · {reference.jurisdiction} · publication {reference.sourcePublicationDate} · {reference.referenceVersion}. Name matching does not establish regulatory authorization.</p> : null;
      })}
    </> : <p>Structured additive information is unavailable or incomplete. Absence of data does not establish absence of additives.</p>}
    <p>No safety classification or additive-risk penalty. Dated source information is not a finding about product safety or current compliance. Historical regulatory events are not evaluated here.</p>
  </details>;
}
