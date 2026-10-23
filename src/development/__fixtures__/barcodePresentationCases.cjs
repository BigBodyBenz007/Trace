const fs=require('node:fs'),path=require('node:path');
const {normalizeOpenFoodFactsProduct}=require('../../../api/nutrition/_barcodeGateway.cjs');
function barcodePresentationCases(){
 const archive=fs.readFileSync(path.join(__dirname,'../../../docs/barcode-grade-coverage-2026-10-21/raw-responses.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse);
 const fairlife=archive.find(row=>row.barcode==='0856312002757');
 const raw=fairlife.responses.find(r=>r.body?.product).body.product;
 const normalized=normalizeOpenFoodFactsProduct(raw,fairlife.barcode,fairlife.capturedAt);
 const providers=require('../../services/__fixtures__/manufacturerProviderLookups.json').observations;
 const dymatize=require('./dymatizeCocoaPebblesLookup.json');
 return [
  {id:'quest',code:'888849000012',title:'Quest Cookie Dough',kind:'Existing captured USDA response with the verified manufacturer replacement',result:providers.find(row=>row.request.body.barcode==='888849000012').response},
  {id:'dymatize',code:'705016356201',title:'Dymatize Cocoa Pebbles',kind:dymatize.evidenceType,result:dymatize.lookup},
  {id:'teddy',code:'044000045586',title:'Teddy Grahams Honey',kind:'Existing captured USDA response; partial sugar correction and separate manufacturer reference',result:providers.find(row=>row.request.body.barcode==='044000045586').response},
  {id:'conflicted',code:fairlife.barcode,title:'Fairlife sodium/salt conflict',kind:'Existing captured raw OFF response normalized by the gateway',result:{status:normalized.logReady?'found':'incomplete',identifier:{scheme:'gtin',value:fairlife.barcode},food:normalized,providerAttempts:[{provider:'open-food-facts',status:'found'},{provider:'usda-fdc',status:'not-found'}]}}
 ];
}
module.exports={barcodePresentationCases};
