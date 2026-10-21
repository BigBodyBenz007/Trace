import { assessBarcodeNutrition } from './barcodeNutritionAssessment';
import { normalizeProductAdditives } from '../services/productAdditives';
import { getAdditiveNameSource } from '../services/additiveNameReference';
import { explainNutritionPoints, getBarcodeAdditiveInformation } from './barcodeReviewInformation';
import { assessAdditiveProfile, assessOverallFoodQuality } from './traceOverallFoodQuality';
import './BarcodeNutritionReview.css';

export default function BarcodeNutritionReview({ candidate, identifier }) {
  const assessment = assessBarcodeNutrition(candidate, identifier);
  const score = assessment.nutritionScore100;
  const overall = assessOverallFoodQuality(candidate, assessment);
  const combined = overall.overallScore100;
  return <section className="trace-barcode-grade" aria-label="Experimental nutrition assessment">
    <div className="trace-barcode-grade__headline"><strong aria-label={combined == null ? 'Experimental nutrition rating' : 'Experimental overall rating'} data-unavailable={score == null}>{score == null ? 'Score unavailable' : <>{combined ?? score}<small>/100</small></>}</strong>
      <span>{score == null ? 'Assessment unavailable' : combined == null ? 'Nutrition-only' : 'Experimental overall'}{overall.provisional && <small><b aria-label="Provisional overall score">PROVISIONAL</b></small>}{combined != null && <small aria-label="Experimental nutrition rating">Nutrition {score}/100 · additive deduction {overall.additiveDeduction} {overall.additiveDeduction === 1 ? 'point' : 'points'}</small>}{score != null && <small>Comparison: {Number(assessment.result.normalized.basis.amount.toFixed(1))} {assessment.result.normalized.basis.unit}</small>}</span></div>
    <p aria-label="Overall assessment status">{overall.reason}</p>
    {overall.deductions.length > 0 && <p aria-label="Additive deduction reasons">Precautionary findings: {overall.deductions.map(item => item.name).join('; ')}.{overall.additiveDeduction === 0 && ' Finding retained; whole-number score unchanged by rounding.'}</p>}
    {score != null ? <p>{explainNutritionPoints(assessment.result)}</p>
      : <p>{assessment.reasons.slice(0, 3).join(' ')}{assessment.reasons.length > 3 && ' Further gaps are listed below.'}</p>}
    <p className="trace-barcode-grade__confidence">{assessment.confidence}</p>
    <details aria-label="Score details & limitations"><summary>Score details &amp; limitations</summary>
      <div aria-label="Overall assessment evidence">
        <p>{overall.additiveAssessment.summary} {overall.additiveAssessment.limitation}</p>
        <p>Overall candidate: round(nutrition × (1 − 0.20 × known concern)). Concern is capped at 1. Unassessed items remain unknown; a partial review uses supported deductions only. No organic component.</p>
        {overall.deductions.length > 0 && <div aria-label="Additive calculation">
          <ul>{overall.deductions.map(item => <li key={item.identifier}>{item.name} ({item.identifier}): weight {item.weight}; {Number(item.rawDeduction.toFixed(4))} points before rounding. {item.rationale}</li>)}</ul>
          <p>Total raw deduction: {Number(overall.rawAdditiveDeduction.toFixed(4))}. {overall.nutritionScore100} − {Number(overall.rawAdditiveDeduction.toFixed(4))} = {Number(overall.rawOverall.toFixed(4))}, rounded once to {combined}/100. Contributions share the capped budget proportionally; they are precautionary policy adjustments, not measured harm.</p>
        </div>}
        {overall.possibleRange && <p aria-label="Possible overall range">Possible range under this budget: {overall.possibleRange.min}–{overall.possibleRange.max}/100. Further review could lower the provisional number; this is not a confidence interval.</p>}
        <p>Policy: {overall.policy.version}. {overall.limitation}</p>
        {overall.additiveAssessment.reviewRule && <p>{overall.additiveAssessment.reviewRule} Source: <a href={overall.additiveAssessment.source.url} target="_blank" rel="noreferrer">{overall.additiveAssessment.source.attribution}</a>.</p>}
        <ul>{overall.additiveAssessment.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
        <AdditiveScreeningEvidence evidence={overall.additiveAssessment} />
      </div>
      <p>GTIN: {identifier?.value || 'Unknown'}. Source: {candidate.display.attribution}. Edition: {candidate.display.assessmentInputs?.source?.revisionDate || 'Undated'}.</p>
      <p>{candidate.display.basisMessage} Package: {candidate.display.packageQuantity || 'Unknown'}. Servings per container: {candidate.display.servingsPerContainer ?? 'Unknown'}.</p>
      <ul>{assessment.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
      <ul>{assessment.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
      {assessment.evidence.market && <p>Provider market claims: {assessment.evidence.market.claims.flatMap(entry => entry.values).join('; ') || 'Unknown'}. Exact US formulation verified: no.</p>}
      {assessment.evidence.category?.basis.map(basis => <p key={basis}>{basis}</p>)}
      {assessment.evidence.plantContent?.status !== 'unknown' && assessment.evidence.plantContent?.basis && <p aria-label="Plant-content evidence">
        {assessment.evidence.plantContent.status === 'verified-zero' ? 'Qualifying plant content: 0%. ' : 'Qualifying plant content unresolved. '}
        {assessment.evidence.plantContent.basis} {assessment.evidence.plantContent.verificationScope}{' '}
        Source: {assessment.evidence.plantContent.source.attribution}.{' '}
        <a href={assessment.evidence.plantContent.method.url} target="_blank" rel="noreferrer">Updated component rules</a>.
      </p>}
      {assessment.evidence.energy?.length > 0 && <details aria-label="Original energy evidence"><summary>Original energy evidence</summary>
        {assessment.evidence.energy.map(entry => <p key={entry.datasetId}>{entry.datasetId} ({entry.quantity?.amount ?? '?'} {entry.quantity?.unit || 'unknown basis'}): {entry.observations.map(value => `${value.field}: ${value.derivation?.startsWith('off:modifier:') ? value.derivation.slice('off:modifier:'.length) : ''}${value.rawValue ?? 'unknown'} ${value.rawUnit || ''}`).join('; ')}. {entry.accepted ? entry.excludedQualifiedFields?.length ? 'Qualified approximations retained separately from reported energy' : 'Compatible representations' : 'Unresolved conflict'}. Calorie rounding allowance: {entry.calorieRoundingAllowance}. <a href={entry.qualificationSource || entry.source} target="_blank" rel="noreferrer">Energy evidence reference</a>.</p>)}
      </details>}
      {assessment.result && <p>Trace US nutrition model: {assessment.result.methodVersion}. Independent development calculation; FDA guidance informs the references, not this numerical formula.</p>}
      {assessment.result?.sugarMode && <p>Sugar input: {assessment.result.sugarMode === 'addedSugar' ? 'Added sugars' : assessment.result.sugarMode === 'totalSugar' ? 'Total sugars, not an estimate of added sugars' : 'Unknown; no sugar value has been assumed'}. {assessment.result.sugarMode === 'totalSugar' && 'The total-sugar reference is Trace-specific; FDA has no total-sugar Daily Value.'}</p>}
      {assessment.result && <ul>{Object.entries(assessment.result.points).filter(([key]) =>
        ['energy', 'sugar', 'saturatedFat', 'salt', 'fiber', 'proteinApplied', 'wholeGrain', 'plant', 'nonNutritiveSweeteners'].includes(key))
          .map(([key, value]) => <li key={key}>{key}: {value.min === value.max ? Number(value.min.toFixed(2)) : `${value.min}–${value.max}`} points</li>)}</ul>}
      <p>Not an official score, FDA endorsement, safety judgment or health-risk percentage. A score of 100 does not mean perfect health. Provider market claims do not verify a specific US formulation.</p>
      <p>Public grade=null; scoreReady=false. This assessment is not saved with the food.</p>
    </details>
  </section>;
}

function InformationSource({ source }) {
  return <small><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> · {source.jurisdiction} · {source.provision} · {source.edition} · Reviewed {source.reviewedOn}</small>;
}

function AdditiveScreeningEvidence({ evidence }) {
  return <ul aria-label="Ingredient screening evidence">{evidence.items.map(item => <li key={item.identifier}>
    <strong>{item.name || item.identifier}</strong> · {item.identifier} · {item.concernBurden === null ? 'Unresolved; no supported weight' : item.concernBurden > 0 ? `Trace ${item.classification} precautionary concern` : 'Reviewed; no qualifying concern identified'}
    <small>Evidence: {item.origins.map(origin => origin.identifier || origin.text).join('; ')}. {item.packagingOnly && 'Packaging statement only. '}{item.conditionalPresence && 'Alternative presence unresolved. '}Exact exposure unknown.</small>
    {item.origins.some(origin => origin.ambiguousParent) && <small>A shared parent reference does not confirm this specific subtype.</small>}
    {item.review ? <>
      <p>{item.function} {item.review.rationale}</p>
      <p>{item.review.evidence} Conditions: {item.review.conditions} Limitations/conflicting findings: {item.review.conflicts}</p>
      {item.review.sources.map(source => <p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.publisher}: {source.title}</a> · {source.jurisdiction} · {source.edition} · Reviewed {source.reviewedOn}</p>)}
    </> : <p>No reviewed local identity/scientific classification. Unknown does not mean harmless.</p>}
  </li>)}</ul>;
}

export function BarcodeAdditives({ candidate }) {
  const evidence = assessAdditiveProfile(candidate);
  const value = candidate.display.additives;
  const additives = normalizeProductAdditives(value, value?.source);
  const reported = additives?.status === 'reported';
  const groups = evidence.items.filter(item => item.providerIdentifiers.length > 0);
  const count = reported ? groups.length : null;
  const references = reported ? [...new Map(additives.items.filter(item => item.nameReference).map(item =>
    [`${item.nameReference.sourceId}:${item.nameReference.referenceVersion}`, item.nameReference])).values()] : [];
  return <details className="trace-barcode-additives" aria-label="Product additives">
    <summary>Additives · {count == null ? 'unknown' : count === 0 ? 'empty provider list' : `${count} provider-reported${count !== additives.items.length ? ' groups' : ''}`}</summary>
    {reported ? <>
      <p>Source: Open Food Facts contributors · structured additives_tags. Presence is provider-reported, not independently confirmed.</p>
      {count === 0 && <p>The provider reports an empty list. This does not prove the product contains no additives.</p>}
      {count > 0 && <p>Verified general functions are listed below; the manufacturer’s purpose and amounts in this product are not confirmed.</p>}
      {count > 0 && count !== additives.items.length && <p>{additives.items.length} original provider tags grouped into {count} identities. Parent/subtype overlap is counted once; distinct subtypes stay separate.</p>}
      <ul aria-label="Grouped provider additives">{groups.map(finding => {
        const members = additives.items.filter(item => finding.providerIdentifiers.includes(item.providerIdentifier));
        const item = members.find(entry => entry.standardizedIdentifier === finding.identifier) || members[0];
        const info = item.nameReference ? getBarcodeAdditiveInformation(item.standardizedIdentifier) : null;
        return <li key={finding.identifier}><strong>{finding.identifier || 'Unrecognized identifier'}</strong> — {finding.name || 'Name unknown'}
          <small>Original: {members.map(entry => entry.providerIdentifier).join('; ')} · {item.source}</small>
          {info ? <><p>{info.function}<InformationSource source={info.functionSource} /></p>
            {info.concern && <p>Scientific context: {info.concern.text}<InformationSource source={info.concern.source} /></p>}
            {info.regulation ? <p>Verified US provision: {info.regulation.text}<InformationSource source={info.regulation.source} /></p>
              : <p>US regulatory conditions have not been reviewed here for this identifier.</p>}
            <p>Scientific assessment incomplete; no product-specific risk conclusion.</p>
          </> : finding?.review ? <p>Local screening note and its sources appear below. This does not add a historical name-reference entry or establish US authorization.</p>
            : <p>Identity not verified in this reference; function, scientific assessment and US regulatory conditions remain unknown.</p>}
          {finding?.historicalEvents.map(event => <div key={event.eventId}>
            <p>Historical regulatory evidence · {event.jurisdiction} · {event.substance}. Published {event.dates.publishedOn}; effective {event.dates.effectiveOn}; compliance date {event.dates.complianceOn || 'not a universal deadline'}. Reviewed {event.reviewedOn}. {event.scope}</p>
            <ul>{event.qualifications.map(qualification => <li key={qualification}>{qualification}</li>)}</ul>
            {event.sources.map(source => <p key={`${source.sourceId}:${source.editionId}`}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> · {source.editionId} · {source.provisions.join('; ')}. Source currency: {source.verification.currency}.</p>)}
            <p>{event.limitations.join(' ')} No automatic score deduction or product-compliance conclusion.</p>
          </div>)}
        </li>;
      })}</ul>
      {references.map(reference => {
        const source = getAdditiveNameSource(reference);
        return source ? <p key={`${reference.sourceId}:${reference.referenceVersion}`}>Verified name reference: <a href={source.url} target="_blank" rel="noreferrer">{source.title || source.documentTitle}</a> · {reference.jurisdiction} · publication {reference.sourcePublicationDate} · {reference.referenceVersion}. Name matching does not establish regulatory authorization.</p> : null;
      })}
    </> : <p>Structured additive information is unavailable or incomplete. Absence of data does not establish absence of additives.</p>}
    <p>{evidence.summary} Missing or empty provider data earns no automatic safety credit. Dated legal evidence is separate from scientific risk and does not establish current product compliance.</p>
    <p>Ingredient-text screening also includes explicitly named substances absent from provider tags. Aliases count once; functions describe general uses, not confirmed manufacturer intent.</p>
    <AdditiveScreeningEvidence evidence={evidence} />
  </details>;
}
