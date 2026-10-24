// Offline, bounded sensitivity check. No application imports this candidate.
// node scripts/check-protein-powder-comparison.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');
const reportPath = path.join(root, 'docs/protein-powder-comparison-2026-10-22.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const originalLoader = require.extensions['.js'];
require.extensions['.js'] = (module, filename) => filename.startsWith(path.join(root, 'src') + path.sep)
  ? module._compile(babel.transformSync(fs.readFileSync(filename, 'utf8'), {filename, babelrc:false, configFile:false,
    plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]}).code, filename) : originalLoader(module, filename);
global.fetch = () => { throw Error('This comparison is offline.'); };
const {evaluateTraceUsNutritionV2: active} = require('../src/development/traceUsNutritionScoringV2');
const {createBarcodeNutritionCandidate} = require('../src/services/barcodeNutritionSelection');
const {assessBarcodeNutrition} = require('../src/development/barcodeNutritionAssessment');
const {assessOverallFoodQuality} = require('../src/development/traceOverallFoodQuality');
const {resolveGrainEvidence} = require('../src/development/traceFoodQualityEvidence');
const {shouldLoadBarcodeGrading} = require('../src/development/barcodeGradingMode');
const units = {calories:'kcal', saturatedFat:'g', sodium:'mg', addedSugar:'g', totalSugar:'g', fiber:'g', protein:'g', fat:'g', carbohydrates:'g'};
const clone = value => JSON.parse(JSON.stringify(value));
const clamp = value => Math.max(0, Math.min(1, value));
const ramp = (value, low, high) => clamp((value-low)/(high-low));
const close = (a,b,message) => assert(Math.abs(a-b)<1e-8,message);

// Form comes from the bounded, attributed evidence inventory, never a protein
// cutoff. Not a runtime category resolver. Ambiguous/unsupported forms pass through.
function powderSupported(input, evidence) {
  return input.category === 'general' && input.basis.unit === 'g'
    && evidence?.productForm === 'dry-protein-powder' && evidence.url === input.source.url
    && ((evidence.sourceField === 'Official product Category' && evidence.sourceValue === 'Protein Powders')
      || (evidence.sourceField === 'Captured provider product name and mass scoop'
        && evidence.sourceValue === input.productEvidence?.name && /\bprotein powder\b/i.test(evidence.sourceValue)
        && evidence.servingUnit === 'g'));
}
function candidate(input, evidence) {
  const current = active(input);
  if (!powderSupported(input,evidence) || current.nutritionScore100 === null) return current;
  // Validate the genuine dry mass/units with the unchanged engine first. Do not
  // disguise kcal as grams or feed an invented prepared volume to the engine.
  if (!(input.nutrients.calories.value > 0)) return current;
  const per100Kcal = Object.fromEntries(Object.entries(input.nutrients).map(([k,v])=>[k,v.value===null?null:v.value*100/input.nutrients.calories.value]));
  const added = current.excludedNutrients.includes('addedSugar') ? null : per100Kcal.addedSugar;
  const sugar = [added===null?null:ramp(added,2.5,25),per100Kcal.totalSugar===null?null:ramp(per100Kcal.totalSugar,4.5,45)].filter(v=>v!==null);
  // The report does not create a new missing-data policy. Incomplete limiting
  // inputs keep the active result; no null is turned into zero.
  if (!sugar.length || per100Kcal.saturatedFat===null || per100Kcal.sodium===null) return current;
  const burdens = {sugar:Math.max(...sugar),saturatedFat:ramp(per100Kcal.saturatedFat,1,10),salt:ramp(per100Kcal.sodium,90,900)};
  const weighted=.4*burdens.sugar+.3*burdens.saturatedFat+.3*burdens.salt;
  const strongest=Math.max(...Object.values(burdens)),limiting=Math.max(weighted,.8*strongest);
  const credits={fiber:per100Kcal.fiber===null?0:8*clamp(per100Kcal.fiber/5.6),proteinApplied:per100Kcal.protein===null?0:2*clamp(per100Kcal.protein/10),wholeGrain:0};
  // Same whole-grain rule and capped amount as the active general-food method.
  const grain=input.grainEvidence;
  if(grain?.status==='whole-grain-first'&&grain.firstIngredient&&grain.source?.url===input.source.url&&grain.source?.attribution===input.source.attribution)credits.wholeGrain=5;
  const appliedCredits=Object.fromEntries(Object.entries(credits).map(([k,v])=>[k,v*(1-limiting)]));
  const raw=85-60*limiting+Object.values(appliedCredits).reduce((a,b)=>a+b,0);
  return {grade:null,scoreReady:false,nutritionScore100:Math.round(Math.max(0,Math.min(100,raw))),rawScore:raw,
    candidate:report.candidate.id,comparisonBasis:{amount:100,unit:'kcal'},per100Kcal,burdens,weighted,strongest,limiting,
    energyDensityDeduction:0,limitingDeduction:60*limiting,credits,appliedCredits};
}
const captured=JSON.parse(fs.readFileSync(path.join(root,report.dymatizeCapture),'utf8'));
const food=createBarcodeNutritionCandidate(captured.lookup),rated=assessBarcodeNutrition(food,captured.lookup.identifier);
// Preserve the pre-boundary diagnostic comparison; this script never activates it.
const assessment=rated.diagnostics?.nutrition || rated;
const source=captured.lookup.food.assessmentInputs.source;
const dymatizeInput={category:assessment.result.methodCategory,basis:assessment.result.normalized.originalBasis,
  nutrients:Object.fromEntries(Object.entries(assessment.result.normalized.originalNutrients).map(([k,v])=>[k,{value:v,unit:units[k]}])),
  source,grainEvidence:assessment.result.comparison.grainEvidence,
  productEvidence:{name:captured.lookup.food.name,categories:captured.lookup.food.assessmentInputs.categories,source}};
assert.equal(assessment.nutritionScore100,41);assert.equal(active(dymatizeInput).rawScore,assessment.result.rawScore);
const cases=[{id:'dymatize-cocoa-pebbles',name:captured.displayedName,input:dymatizeInput,food,
  formEvidence:{productForm:'dry-protein-powder',sourceField:'Captured provider product name and mass scoop',sourceValue:captured.lookup.food.name,servingUnit:'g',url:source.url}},
  ...report.controls.map(ref=>{const input={category:'general',basis:ref.serving,nutrients:ref.nutrients,source:ref.source,
    grainEvidence:resolveGrainEvidence(ref.ingredients,ref.source)};
    return{id:ref.id,name:ref.name,input,formEvidence:ref.formEvidence,
      food:{display:{name:ref.name,ingredients:ref.ingredients,sourceUrl:ref.source.url,attribution:ref.source.attribution}}};})];
const results=cases.map(row=>{
  const original=JSON.stringify(row),current=active(row.input),alternative=candidate(row.input,row.formEvidence);
  const overall=assessOverallFoodQuality(row.food,current),candidateOverall=assessOverallFoodQuality(row.food,alternative);
  assert.deepEqual(overall.additiveAssessment,candidateOverall.additiveAssessment,'Candidate must not change additive screening');
  assert.equal(JSON.stringify(row),original);assert.equal(current.grade,null);assert.equal(alternative.grade,null);
  assert.equal(current.scoreReady,false);assert.equal(alternative.scoreReady,false);
  return {id:row.id,name:row.name,input:row.input,formEvidence:row.formEvidence,current,candidate:alternative,
    combined:{current:overall.overallScore100,candidate:candidateOverall.overallScore100,status:overall.status,
      candidateStatus:candidateOverall.status,concernKnown:overall.additiveAssessment.concernBurden,
      identified:overall.additiveAssessment.items.map(item=>({id:item.identifier,concernBurden:item.concernBurden,classification:item.classification})),
      reasons:overall.additiveAssessment.reasons,policy:overall.policy},
    noInputMutation:true};
});
const checks=[];
for(const row of cases){
  const base=candidate(row.input,row.formEvidence),score=active(row.input);
  const labelAmount=row.id==='dymatize-cocoa-pebbles'?captured.lookup.food.serving.amount:row.input.basis.amount;
  const factors=[...new Set([.5,2,100/row.input.basis.amount,labelAmount/row.input.basis.amount])];
  for(const factor of factors){
    const x=clone(row.input);x.basis.amount*=factor;Object.values(x.nutrients).forEach(n=>{if(n.value!==null)n.value*=factor});
    close(active(x).rawScore,score.rawScore,'Active representation');close(candidate(x,row.formEvidence).rawScore,base.rawScore,'Candidate representation');
  }
  // Constructed water addition changes only mass. Never a prepared label claim;
  // a powder is still compared on the same measured nutrient/calorie ratio.
  for(const waterMass of [100,500]){const x=clone(row.input);x.basis.amount+=waterMass;close(candidate(x,row.formEvidence).rawScore,base.rawScore,'Water cannot improve candidate');}
  for(const [key,delta]of [['sodium',100],['addedSugar',1],['saturatedFat',1]]){
    const x=clone(row.input);x.nutrients[key].value+=delta;
    if(key==='addedSugar'){x.nutrients.totalSugar.value=Math.max(x.nutrients.totalSugar.value,x.nutrients.addedSugar.value);x.nutrients.carbohydrates.value=Math.max(x.nutrients.carbohydrates.value,x.nutrients.totalSugar.value);}
    if(key==='saturatedFat')x.nutrients.fat.value=Math.max(x.nutrients.fat.value,x.nutrients.saturatedFat.value);
    assert(candidate(x,row.formEvidence).nutritionScore100<=base.nutritionScore100,'Increasing a burden cannot improve candidate');
  }
  const missing=clone(row.input);missing.nutrients.sodium.value=null;assert.equal(candidate(missing,row.formEvidence).nutritionScore100,null);
  const badUnits=clone(row.input);badUnits.nutrients.sodium.unit='g';assert.equal(candidate(badUnits,row.formEvidence).nutritionScore100,null);
  const unknownAdded=clone(row.input);unknownAdded.nutrients.addedSugar.value=null;assert.equal(candidate(unknownAdded,row.formEvidence).per100Kcal.addedSugar,null);
  const wrongSource={...row.formEvidence,url:'https://example.invalid/unmatched'};assert.deepEqual(candidate(row.input,wrongSource),active(row.input));
  const ambiguous={...row.formEvidence,productForm:'unknown'};assert.deepEqual(candidate(row.input,ambiguous),active(row.input));
  checks.push({id:row.id,servingRepresentations:factors,labelServingIncluded:true,unknownAddedSugarPreserved:true,sourceMismatchUnchanged:true,constructedWaterMasses:[100,500],burdenMonotonicity:3,unknownPreserved:true,unsupportedUnitsRejected:true,ambiguousFormUnchanged:true});
}
const batch=JSON.parse(fs.readFileSync(path.join(root,'docs/nutrition-v2-calibration-2026-10-21.json'),'utf8'));
const nonPowders=batch.references.map(ref=>{
  const source={url:ref.source.url,attribution:ref.source.attribution||ref.source.provider};
  const milkSection=/\/milk-cream\/(?:regular-milk|flavored-milk)\//.test(ref.source.url)&&ref.source.documentTitle;
  const input={source,basis:ref.basis,nutrients:ref.nutrients,category:ref.category,
    productEvidence:milkSection?{name:ref.source.documentTitle,source,categories:[{field:'official-product-page.section',values:['fluid-dairy-milk']}]}:null,
    grainEvidence:resolveGrainEvidence(ref.ingredients,source),usZeroFatLabelServing:ref.usZeroFatLabelServing===true};
  const before=active(input),after=candidate(input,null);assert.deepEqual(after,before);
  const recorded=batch.results.references.find(row=>row.id===ref.id).implemented;assert.equal(before.nutritionScore100,recorded.score);
  const food={display:{ingredients:ref.ingredients,attribution:source.attribution,sourceUrl:source.url}};
  assert.deepEqual(assessOverallFoodQuality(food,before),assessOverallFoodQuality(food,after));
  return{id:ref.id,current:before.nutritionScore100,candidate:after.nutritionScore100,fullResultUnchanged:true,combinedUnchanged:true};
});
assert.equal(nonPowders.length,16);
// A high-protein ordinary food or milk ingredient alone never supplies form evidence.
const unsupportedForms=['protein bar','yogurt','fluid dairy milk','egg','meat','milk chocolate','coffee with milk','unknown powder'];
for(const productForm of unsupportedForms)assert.deepEqual(candidate(dymatizeInput,{...cases[0].formEvidence,productForm}),active(dymatizeInput));
assert.equal(shouldLoadBarcodeGrading('production','trace-umber.vercel.app','?barcodeGrading=1&nutritionPilot=1'), true);
const serving=captured.lookup.food.serving,perServing=Object.fromEntries(Object.entries(dymatizeInput.nutrients).map(([k,v])=>[k,{value:v.value===null?null:v.value*serving.amount/dymatizeInput.basis.amount,unit:v.unit}]));
report.results={methodVersion:assessment.result.methodVersion,engineSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'src/development/traceUsNutritionScoringV2.js'))).digest('hex'),
  dymatizeTrace:{responseLevel:'Existing captured gateway response with retained USDA observations; not a recaptured complete upstream FDC response',captureType:captured.evidenceType,source,serving,perServing,rawObservations:captured.lookup.food.assessmentInputs.datasets,
    selectedDatasetId:assessment.evidence.selectedDatasetId,categoryEvidence:assessment.evidence.category,
    originalGatewayFoodNutrients:captured.lookup.food.nutrients,providerWarnings:assessment.warnings,
    qualification:'Sugar and fiber in this capture are provider calculations from less-than declarations; retained unchanged, not independently measured label precision.',
    preparation:'No preparation quantity or final prepared yield in this capture. None inferred.'},
  powders:results,nonPowders,checks,unsupportedFormsUnchanged:unsupportedForms,networkRequests:0,
  activeFilesChanged:false,grade:null,scoreReady:false};
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({powders:results.map(row=>({id:row.id,current:row.current.nutritionScore100,candidate:row.candidate.nutritionScore100,currentOverall:row.combined.current,candidateOverall:row.combined.candidate,status:row.combined.status,raw:row.current.rawScore,points:row.current.points,candidateRaw:row.candidate.rawScore})),nonPowdersUnchanged:nonPowders.length,controls:checks,productionGate:true,applicationFilesChanged:false},null,2));
