import { assessBarcodeNutrition } from './barcodeNutritionAssessment';
import { normalizeProductAdditives } from '../services/productAdditives';
import { getAdditiveNameSource } from '../services/additiveNameReference';
import { explainNutritionPoints, getNutritionHighlights } from './barcodeReviewInformation';
import { assessAdditiveProfile, assessOverallFoodQuality } from './traceOverallFoodQuality';
import './BarcodeNutritionReview.css';
export { assessLookupForGrading } from './barcodeAssessmentFallback';
export { getBarcodeReviewName } from './barcodeReviewInformation';

export default function BarcodeNutritionReview({ candidate, identifier }) {
  const assessment = assessBarcodeNutrition(candidate, identifier);
  const personal = candidate.personalLabel;
  const reviewedLabel = assessment.evidence.reviewedManufacturerLabel;
  const replacement = reviewedLabel?.mode === 'replacement-panel';
  const score = assessment.nutritionScore100;
  const overall = assessOverallFoodQuality(candidate, assessment);
  const combined = overall.overallScore100;
  const factors = getNutritionHighlights(assessment.result);
  const market = assessment.evidence.market?.status;
  const confidence = personal ? 'Your confirmed label. Not independently authenticated.' : reviewedLabel ? 'Package revision unconfirmed.' : market === 'unknown' ? 'Product market is unknown.'
    : market === 'foreign-or-multi-market' ? 'US formulation unconfirmed; multi-market record.' : 'US formulation unconfirmed.';
  if (assessment.ratingStatus === 'not-rated-category') return <section className="trace-barcode-grade" aria-label="Experimental nutrition assessment">
    <strong className="trace-barcode-grade__category-title">{assessment.ratingBoundary.message}</strong>
    <p>{personal && 'Your confirmed label. '}Nutrition and ingredient information remain available. Unrated does not mean unhealthy or unsafe.</p>
    {candidate.display.sourceUrl && <p><a href={candidate.display.sourceUrl} target="_blank" rel="noreferrer noopener">{personal ? 'Original provider record' : 'Provider nutrition'}</a></p>}
  </section>;
  return <section className="trace-barcode-grade" aria-label="Experimental nutrition assessment">
    <div aria-label="Opening score summary">
      <div className="trace-barcode-grade__headline"><strong aria-label={combined == null ? 'Experimental nutrition rating' : 'Experimental overall rating'} data-unavailable={score == null}>{score == null ? 'Score unavailable' : <>{combined ?? score}<small>/100</small></>}</strong>
        <span>{score == null ? 'Assessment unavailable' : combined == null ? 'Nutrition only' : reviewedLabel && !replacement ? 'Reference overall score' : 'Overall score'}<small>Experimental</small>{overall.provisional && <small aria-label="Provisional overall score">Provisional</small>}</span></div>
      {factors.length > 0 && <ul aria-label="Main nutrition factors">{factors.map(factor => <li key={factor.key}>{factor.text}</li>)}</ul>}
      {(score == null || combined == null) && <p aria-label="Overall assessment status">{score == null ? assessment.reasons[0] || 'Nutrition information is incomplete.'
        : 'Nutrition-only. Additive review is incomplete.'}</p>}
      {overall.deductions.length > 0 && <p aria-label="Additive deduction reasons">{overall.deductions.slice(0, 2).map(item => item.summary).join(' ')}{overall.deductions.length > 2 && ' More in Additives.'}</p>}
      <p className="trace-barcode-grade__confidence">{overall.provisional && 'Additive review incomplete. '}{confidence}</p>
    </div>
    {personal && <p aria-label="Score evidence scope">Your confirmed nutrition{personal.ingredientsConfirmed ? ' and ingredients' : '; ingredients not confirmed for this package'}. Original provider evidence is retained separately.</p>}
    {reviewedLabel && <p aria-label="Score evidence scope">
      {replacement ? <>Nutrition &amp; ingredients: <a href={reviewedLabel.source.url} target="_blank" rel="noreferrer noopener">manufacturer label</a>.</>
        : <>Score: manufacturer reference. Logging: <a href={reviewedLabel.source.url} target="_blank" rel="noreferrer noopener">corrected sugars</a>; other values from provider.</>}
    </p>}
    {assessment.result?.sugarMode === 'totalSugar'
      && (assessment.result.normalized.originalNutrients?.addedSugar == null || assessment.result.excludedNutrients?.includes('addedSugar'))
      && <p aria-label="Sugar basis note">Added sugars unavailable or unusable; score uses total sugars.</p>}
    <details aria-label="Why this score"><summary>Why this score</summary>
      {score != null && <><p aria-label={combined != null ? 'Experimental nutrition rating' : 'Nutrition subtotal'}><strong>Nutrition {score}/100.</strong></p>
        <p>{explainNutritionPoints(assessment.result, { concise: true })}</p></>}
      {score == null && <p>Missing or conflicting nutrition prevents a score.</p>}
      <p aria-label="Additive score effect">{combined == null ? 'An overall score needs a usable nutrition score and ingredient review.'
        : overall.deductions.length ? overall.additiveDeduction > 0
          ? `${overall.deductions.map(item => item.name).join(', ')}: ${overall.additiveDeduction}-point additive adjustment.`
          : 'The additive adjustment is too small to change the whole-number score.'
          : 'No supported additive deduction so far.'}</p>
      {reviewedLabel && !replacement && <p aria-label="Manufacturer label correction">Manufacturer reference: 7 g added and total sugars per 30 g. Other logged nutrients remain provider values, not independently verified.</p>}
      {candidate.display.sourceSelection?.outcome === 'fallback-selected' && <p>A more complete provider record was selected.</p>}
      <p className="trace-barcode-grade__confidence">Experimental rating, not a health-risk measurement.</p>
      <p aria-label="Nutrition sources">{reviewedLabel && <><a href={reviewedLabel.source.nutritionUrl || reviewedLabel.source.url} target="_blank" rel="noreferrer noopener">{replacement ? 'Manufacturer nutrition' : 'Manufacturer reference'}</a>{' · '}</>}
        {candidate.display.sourceUrl && <a href={candidate.display.sourceUrl} target="_blank" rel="noreferrer noopener">{personal ? 'Original provider record' : 'Provider nutrition'}</a>}</p>
    </details>
  </section>;
}

function SourceLinks({ sources, name }) {
  const unique = [...new Map(sources.filter(source => source?.url).map(source => [source.url, source])).values()];
  return <span className="trace-barcode-additives__sources">{unique.map((source, index) => {
    const publisher = source.publisher || source.title || 'Source';
    const label = /FDA/i.test(publisher) ? 'FDA' : /EFSA/i.test(publisher) ? 'EFSA (EU)' : /NTP/i.test(publisher) ? 'NTP study' : 'Research';
    return <span key={source.url}>{index > 0 ? ' · ' : ' '}<a href={source.url} target="_blank" rel="noreferrer noopener" aria-label={`${label}: ${name}`}>{label}</a></span>;
  })}</span>;
}

function additiveName(item) {
  const short = { 'flavor-mixture': 'Flavoring (unspecified)', E322: 'Lecithins', E500ii: 'Baking soda', 'E960-unspecified': 'Stevia sweetener (form unknown)' };
  const name = short[item.identifier] || item.name || 'Unrecognized additive';
  const code = /^E\d+[a-z0-9]*$/i.test(item.identifier) ? ' (' + item.identifier + ')' : '';
  return name + code + (item.packagingOnly ? '; packaging only' : item.conflict || item.conditionalPresence ? '; presence uncertain' : '');
}

function AdditiveList({ evidence }) {
  const concerns = evidence.items.filter(item => item.concernBurden > 0);
  const other = evidence.items.filter(item => !(item.concernBurden > 0));
  return <>
    {concerns.length > 0 && <ul aria-label="Additive concerns">{concerns.map(item => <li key={item.identifier}>
      <strong>{additiveName(item)}</strong>. {item.review.consumerSummary}
      <SourceLinks sources={item.review.sources} name={item.name || item.identifier} />
    </li>)}</ul>}
    {other.length > 0 && <p aria-label="Identified additives">{concerns.length ? 'Other identified: ' : 'Identified: '}{other.map(additiveName).join('; ')}.</p>}
    {evidence.items.flatMap(item => item.historicalEvents).map(event => <p key={event.eventId}>{event.jurisdiction} historical record: {event.substance}. Effective {event.dates.effectiveOn}{event.dates.complianceOn && '; compliance ' + event.dates.complianceOn}. {event.qualifications.join(' ')}{' '}
      {event.sources.map(source => <a key={source.editionId} href={source.url} target="_blank" rel="noreferrer noopener">Dated {event.jurisdiction} rule</a>)}</p>)}
  </>;
}

export function BarcodeAdditives({ candidate }) {
  const evidence = assessAdditiveProfile(candidate);
  const value = candidate.display.additives;
  const additives = normalizeProductAdditives(value, value?.source);
  const reported = additives?.status === 'reported';
  const groups = evidence.items.filter(item => item.providerIdentifiers.length > 0);
  const count = reported ? groups.length : null;
  const reference = reported ? additives.items.find(item => item.nameReference)?.nameReference : null;
  const nameSource = reference && getAdditiveNameSource(reference);
  return <details className="trace-barcode-additives" aria-label="Product additives">
    <summary>Additives · {count == null ? 'provider list unavailable' : count === 0 ? 'empty provider list' : `${count} provider-reported${count !== additives.items.length ? ' groups' : ''}`}</summary>
    <p>{reported ? count === 0 ? 'The provider reports an empty list; this does not prove there are no additives.'
      : 'Provider-reported identities; amounts are unknown.' : 'No provider additive list. Named ingredients may still be reviewed.'}</p>
    {evidence.items.length > 0 && <AdditiveList evidence={evidence} />}
    <p>{!evidence.originalIngredientText ? 'Ingredient information is unavailable; a clean assessment cannot be established.'
      : evidence.status !== 'reviewed' ? 'Review incomplete. Unfamiliar ingredients are not automatically concerning.'
        : 'Available ingredients reviewed; amounts and package contents remain unverified.'}</p>
    <p aria-label="Ingredient sources">{evidence.source.url && <a href={evidence.source.url} target="_blank" rel="noreferrer noopener">{candidate.display.ingredientSource ? 'Manufacturer ingredients' : 'Provider ingredients'}</a>}
      {nameSource && <>{' · '}<a href={nameSource.url} target="_blank" rel="noreferrer noopener">EU name reference ({reference.sourcePublicationDate.slice(0, 4)})</a></>}</p>
  </details>;
}
