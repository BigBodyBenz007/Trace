// Offline replay of a frozen real-product sample. Never fetches providers,
// touches browser storage or rewrites the original evidence/selection.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),babel=require('@babel/core');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'docs/barcode-grade-coverage-2026-10-21');
const mode=process.argv[2],baselineHead='12bc90c32194d9f545bf6d7ca1385a1d7969f0a3';
if(!['before','after','cached-after'].includes(mode))throw Error('Use before, after or cached-after');
const changedBrowserModules=new Set(['src/development/barcodeNutritionEvidence.js',
  'src/development/barcodeNutritionAssessment.js','src/development/additiveScreeningPolicy.js',
  'src/development/traceOverallFoodQuality.js',
  'src/services/remoteBarcodeLookup.js']);
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const loader=require.extensions['.js'];
require.extensions['.css']=()=>{};
const source=file=>mode==='before'&&changedBrowserModules.has(path.relative(root,file).split(path.sep).join('/'))
  ?execFileSync('git',['show',baselineHead+':'+path.relative(root,file).split(path.sep).join('/')],{cwd:root,encoding:'utf8',windowsHide:true})
  :fs.readFileSync(file,'utf8');
const compile=(module,file)=>module._compile(babel.transformSync(source(file),{
  filename:file,babelrc:false,configFile:false,presets:[[require.resolve('@babel/preset-react'),{runtime:'automatic'}]],
  plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]}).code,file);
require.extensions['.js']=(module,file)=>file.startsWith(path.join(root,'src')+path.sep)?compile(module,file):loader(module,file);
require.extensions['.jsx']=compile;
global.fetch=()=>{throw Error('Offline replay cannot make network requests');};
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {lookupRemoteBarcode}=require('../api/nutrition/_barcodeGateway.cjs');
const {createRemoteBarcodeLookup}=require('../src/services/remoteBarcodeLookup');
const {createRemoteBarcodeCache}=require('../src/services/remoteBarcodeCache');
const {createBarcodeNutritionCandidate}=require('../src/services/barcodeNutritionSelection');
const {assessBarcodeNutrition}=require('../src/development/barcodeNutritionAssessment');
const {assessOverallFoodQuality}=require('../src/development/traceOverallFoodQuality');
const Review=require('../src/development/BarcodeNutritionReview.jsx').default;
const {reconcileBarcodeDatasets}=require('../src/development/barcodeNutritionEvidence');
const {evaluateTraceUsNutritionV2}=require('../src/development/traceUsNutritionScoringV2');
const {resolveGrainEvidence}=require('../src/development/traceFoodQualityEvidence');
const {shouldLoadBarcodeGrading}=require('../src/development/barcodeGradingMode');
const tagless=value=>value.replace(/<[^>]*>/g,'').replace(/&[^;]+;/g,' ').trim();
function diagnose(candidate,nutrition,overall){
  const groups=[];
  if(!candidate)return ['no-review-candidate'];
  const reasons=nutrition.reasons.join(' ');
  if(nutrition.nutritionScore100===null){
    if(/usable nutrition profile.*not captured/i.test(reasons))groups.push('missing-assessment-capture');
    if(/provenance.*not match/i.test(reasons))groups.push('identity-or-source-mismatch');
    if(/Edited food/i.test(reasons))groups.push('edited-source-mismatch');
    if(/measurement basis|mass or volume|dimension|quantity/i.test(reasons))groups.push('unknown-or-incompatible-basis');
    if(/energy.*conflict/i.test(reasons))groups.push('energy-source-conflict');
    if(/Energy is missing/i.test(reasons))groups.push('missing-energy');
    if(/Sodium is missing/i.test(reasons))groups.push('missing-sodium');
    if(/Saturated fat.*missing|fat-quality.*missing/i.test(reasons))groups.push('missing-saturated-fat-or-fat-quality');
    if(/Added sugars and total sugars.*missing/i.test(reasons))groups.push('missing-sugars');
    if(/invalid|unsupported unit|conflicting/i.test(reasons))groups.push('invalid-or-conflicting-nutrient');
    if(/exceed|physical|overflow/i.test(reasons))groups.push('contradictory-or-impossible-values');
    if(!groups.length)groups.push('other-nutrition-block');
  }
  if(!candidate.display.ingredients?.text?.trim())groups.push('missing-ingredient-declaration');
  if(!overall.additiveAssessment.source.url||!overall.additiveAssessment.source.attribution)groups.push('missing-ingredient-attribution');
  if(overall.additiveAssessment.status==='nutrition-only'&&candidate.display.ingredients?.text?.trim())groups.push('no-supported-ingredient-review');
  return groups;
}
function alternatePanels(candidate,nutrition){
  if(nutrition.nutritionScore100!==null||!candidate.display.assessmentInputs)return [];
  const input=candidate.display.assessmentInputs,category=nutrition.evidence.category?.categories?.[0];
  if(!category)return [];
  return reconcileBarcodeDatasets(input).records.filter(record=>record.quantity
    && record.quantity.unit===(category==='beverage'?'ml':'g')&&record.energyEvidence.accepted
    && ['calories','saturatedFat','sodium'].every(key=>!['invalid','unsupported-unit','conflicting'].includes(record.nutrients[key].status)))
    .map(record=>{
      const result=evaluateTraceUsNutritionV2({category,basis:record.quantity,nutrients:record.nutrients,
        source:input.source,grainEvidence:resolveGrainEvidence(candidate.display.ingredients,input.source)});
      return {id:record.dataset.id,quantity:record.quantity,score:result.nutritionScore100,reasons:result.reasons};
    });
}
async function assess(lookup,metadata,cachedLookup=null){
  const result={...metadata,gatewayStatus:lookup.status,lookupStatus:null,provider:null,
    nutritionScore:null,nutritionStatus:'unavailable',nutritionReasons:[],overallScore:null,overallStatus:'unavailable',
    overallReasons:[],causes:[],display:{rendered:false},failedStage:null};
  let stage='browser-lookup';
  try{
    const data=new Map(),clock=()=>Date.parse(metadata.capturedAt)+1000;
    const storage=cachedLookup?{getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)}:null;
    if(storage)createRemoteBarcodeCache({storage,clock}).set(metadata.barcode,cachedLookup);
    result.refreshRequests=0;
    const browser=createRemoteBarcodeLookup({storage,clock,runtime:()=>({isWeb:true,isOnline:true}),
      fetchImpl:async()=>{result.refreshRequests+=1;return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify(lookup)};}});
    const selected=await browser.lookup(metadata.barcode);
    result.lookupStatus=selected.status;result.provider=selected.food?.provider?.id||selected.food?.sourceType||null;
    if(!selected.food){result.causes=['lookup-'+selected.status];return result;}
    stage='candidate';const candidate=createBarcodeNutritionCandidate(selected);
    if(!candidate){result.causes=['no-review-candidate'];return result;}
    result.logReady=candidate.canUse;result.selectedName=candidate.display.name;result.brand=candidate.display.brand;
    result.ingredientsAvailable=Boolean(candidate.display.ingredients?.text);result.additiveState=candidate.display.additives?.status||'not-collected';
    result.measurementEvidence=candidate.display.assessmentInputs?{
      serving:candidate.display.assessmentInputs.serving,
      datasets:candidate.display.assessmentInputs.datasets.map(d=>({id:d.id,basis:d.basis,quantity:d.quantity})),
    }:null;
    stage='nutrition';const nutrition=assessBarcodeNutrition(candidate,selected.identifier);
    stage='overall';const overall=assessOverallFoodQuality(candidate,nutrition);
    assert.equal(nutrition.grade,null);assert.equal(nutrition.scoreReady,false);
    assert.equal(overall.grade,null);assert.equal(overall.scoreReady,false);
    Object.assign(result,{nutritionScore:nutrition.nutritionScore100,nutritionStatus:nutrition.nutritionScore100===null?'unavailable':'scored',
      nutritionReasons:nutrition.reasons,nutritionWarnings:nutrition.warnings,
      overallScore:overall.overallScore100,overallStatus:overall.status,overallReasons:[overall.reason,...overall.additiveAssessment.reasons],
      ingredientReview:overall.additiveAssessment.status,unresolvedAdditives:overall.additiveAssessment.items.filter(i=>i.concernBurden===null).map(i=>i.identifier),
      selectedDataset:nutrition.evidence.selectedDatasetId||null,category:nutrition.evidence.category||null,
      market:nutrition.evidence.market||null,rawNutrition:nutrition.result?.rawScore??null,
      source:candidate.display.assessmentInputs?.source||null,correctionId:candidate.display.nutritionCorrection?.id||null,
      causes:diagnose(candidate,nutrition,overall),alternatePanels:alternatePanels(candidate,nutrition)});
    stage='development-review';const html=renderToStaticMarkup(React.createElement(Review,{candidate,identifier:selected.identifier}));
    const headline=html.match(/<strong[^>]*aria-label="(Experimental (?:overall|nutrition) rating)"[^>]*>([\s\S]*?)<\/strong>/);
    const expected=overall.overallScore100??nutrition.nutritionScore100;
    const displayText=headline?tagless(headline[2]):null;
    result.display={rendered:true,kind:headline?.[1]||null,text:displayText,
      matchesComputed:expected===null?html.includes('Score unavailable'):displayText?.startsWith(String(expected))===true};
    assert(result.display.matchesComputed,'Computed result lost in development review');
  }catch(error){result.failedStage=stage;result.error=error.message;result.causes.push('error-'+stage);}
  return result;
}
(async()=>{
  const selection=read('docs/barcode-grade-coverage-2026-10-21/selection.json');
  const captures=fs.readFileSync(path.join(folder,'raw-responses.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
  const products=[];
  for(const row of captures){let lookup=row.lookup;
    if(mode!=='before'&&row.responses.some(response=>response.body)){
      const response=row.responses.find(response=>response.body);
      lookup=await lookupRemoteBarcode({barcode:row.barcode,now:()=>Date.parse(row.capturedAt),
        env:{OPEN_FOOD_FACTS_USER_AGENT:'Trace-offline-captured-replay'},
        fetchImpl:async()=>({ok:response.httpStatus>=200&&response.httpStatus<300,status:response.httpStatus,
          headers:{get:()=>null},body:null,text:async()=>JSON.stringify(response.body)})});
    }
    products.push(await assess(lookup,{barcode:row.barcode,selectedName:row.selectedName,selectionGroup:row.selectionGroup,
      evidenceType:row.evidenceType,rawProductAvailable:Boolean(row.responses.find(r=>r.body?.product)),
      rawSourceUrl:row.responses[0]?.url||null,capturedAt:row.capturedAt},mode==='cached-after'?row.lookup:null));
  }
  const causes={};for(const product of products)for(const cause of product.causes)(causes[cause]??=[]).push(product.barcode);
  const overlaps={};for(const product of products){const key=[...product.causes].sort().join(' + ')||'none';overlaps[key]=(overlaps[key]||0)+1;}
  const report={mode,head:baselineHead,browserModuleEdition:mode==='before'?baselineHead:'working-tree',
    planned:selection.selected,evaluated:products.length,
    actualRawProducts:products.filter(p=>p.rawProductAvailable).length,
    identified:products.filter(p=>['found','incomplete'].includes(p.lookupStatus)).length,
    gatewayIdentified:products.filter(p=>['found','incomplete'].includes(p.gatewayStatus)).length,
    loggingReady:products.filter(p=>p.logReady).length,nutritionScores:products.filter(p=>p.nutritionScore!==null).length,
    overallScores:products.filter(p=>p.overallScore!==null).length,
    overallReviewed:products.filter(p=>p.overallStatus==='reviewed').length,overallProvisional:products.filter(p=>p.overallStatus==='provisional').length,
    reviewRendered:products.filter(p=>p.display.rendered).length,errors:products.filter(p=>p.failedStage).length,
    seededCache:mode==='cached-after',gatewayRequests:products.reduce((sum,p)=>sum+(p.refreshRequests||0),0),
    causeCounts:Object.fromEntries(Object.entries(causes).map(([cause,barcodes])=>[cause,barcodes.length])),causes,overlaps,
    productionGating:{grade:null,scoreReady:false,
      developmentAllowed:shouldLoadBarcodeGrading('development','localhost','?barcodeGrading=1'),
      productionWithFlags:shouldLoadBarcodeGrading('production','localhost','?barcodeGrading=1&nutritionPilot=1')},
    interpretation:'Same preselected real records, not manufacturer validation or a market coverage estimate. OFF gateway configuration only; browser catalog precedence is preserved. No nutrition/ingredient data are filled.',products};
  fs.writeFileSync(path.join(folder,mode+'.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({...report,causes:undefined,products:undefined},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
