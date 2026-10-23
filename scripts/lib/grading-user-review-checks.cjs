const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
// Explicit reviewed regression expectations, independent of the scoring engine.
// Provider observations remain captured (not manufacturer-validated); milk is a
// reliable calibration reference, with an explicitly constructed unknown case.
const EXPECTED = {
  quest: { nutrition: 54, overall: 52, canUse: true, nutrients: { calories: 190, protein: 21, carbohydrates: 22, fat: 9, sodium: 220, fiber: 12, totalSugar: 1, addedSugar: 0 } },
  spam: { nutrition: 21, overall: 20, canUse: true, nutrients: { calories: 180, protein: 7, carbohydrates: 1, fat: 16, sodium: 770, fiber: 0, totalSugar: 1, addedSugar: 1 } },
  teddy: { nutrition: 20, overall: 20, canUse: true, nutrients: { calories: 129.9, protein: 2.001, carbohydrates: 21.99, fat: 3.99, sodium: 90, fiber: 0.9899999999999999, totalSugar: 7, addedSugar: 7 } },
  'milk-zero': { nutrition: 86, overall: 86, canUse: true, nutrients: { calories: 90, protein: 9, carbohydrates: 13, fat: 0, sodium: 130, fiber: 0, totalSugar: 12, addedSugar: 0 } },
  'milk-unknown': { nutrition: 61, overall: 61, canUse: true, nutrients: { calories: 90, protein: 9, carbohydrates: 13, fat: 0, sodium: 130, fiber: 0, totalSugar: 12, addedSugar: null } },
  cheerios: { nutrition: 39, overall: 39, canUse: false, nutrients: { calories: 140, protein: 3, carbohydrates: null, fat: 2, sodium: 210, fiber: 3, totalSugar: 12, addedSugar: 12 } },
  unavailable: { nutrition: null, overall: null, canUse: true, nutrients: { calories: 0.9, protein: 0, carbohydrates: 0, fat: 0, sodium: 0, fiber: null, totalSugar: null, addedSugar: null } },
};
module.exports = async function run({ records, client, evaluate, until, click, input, capture, open, output, progress, wait, exceptions, consoleErrors }) {
  const rows = [], flows = [], themes = [];
  const summary = () => evaluate(`(() => {
    const article=document.querySelector('[aria-label="Barcode product review"]'), section=article.querySelector('.trace-barcode-grade');
    const expected=window.reviewExpected, score=expected.overall.overallScore100??expected.nutrition.nutritionScore100;
    const main=section.querySelector('strong'), body=document.querySelector('.trace-barcode-dialog__content');
    const details=Array.from(article.querySelectorAll('details'));
    return {title:article.querySelector('h3').textContent,mainScore:main.textContent,expectedScore:score,
      nutrition:expected.nutrition.nutritionScore100,overall:expected.overall.overallScore100,status:expected.overall.status,
      canUse:expected.candidate.canUse,useDisabled:Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Use This Food').disabled,
      reasons:Array.from(section.querySelectorAll('[aria-label="Main nutrition factors"] li')).map(el=>el.textContent),
      expectedReasons:expected.highlights.map(item=>item.text),
      collapsed:details.every(d=>!d.open)&&article.querySelector('[aria-label="Product ingredients"] button').getAttribute('aria-expanded')==='false',
      overflow:body.scrollWidth>body.clientWidth+1||document.documentElement.scrollWidth>innerWidth,
      scoreInViewport:main.getBoundingClientRect().top>=0&&main.getBoundingClientRect().bottom<=innerHeight,
      initialScrollTop:body.scrollTop,
      primaryNutritionVisible:Array.from(article.querySelector(':scope > dl').querySelectorAll('dd')).every(el=>el.getBoundingClientRect().bottom<=body.getBoundingClientRect().bottom),
      source:expected.candidate.display.attribution,scope:section.querySelector('[aria-label="Manufacturer label correction"]')?.textContent,
      confidence:section.querySelector('.trace-barcode-grade__confidence').textContent,
      missing:article.querySelector('.trace-barcode-dialog__nutrition-details')?.textContent||'',
      loggingReason:document.querySelector('#trace-barcode-logging-reason')?.textContent||'',
      sugarNote:section.querySelector('[aria-label="Sugar basis note"]')?.textContent||'',
      visibleScope:section.querySelector('[aria-label="Score evidence scope"]')?.textContent||'',
      warnings:expected.nutrition.warnings,providerNutrients:expected.candidate.display.nutrients,
      effectiveSelection:expected.candidate.selection,lookupCalls:window.reviewLookups.length};
  })()`);
  const controls = () => evaluate(`(() => {
    const body=document.querySelector('.trace-barcode-dialog__content');
    const footer=document.querySelector('.trace-barcode-dialog__footer').getBoundingClientRect();
    return Array.from(document.querySelectorAll('.trace-barcode-dialog__footer button,.trace-barcode-dialog__close')).map(button=>{
      const r=button.getBoundingClientRect(), hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return {name:button.getAttribute('aria-label')||button.textContent,disabled:button.disabled,unobstructed:button.contains(hit)&&r.top>=0&&r.bottom<=innerHeight&&body.getBoundingClientRect().bottom<=footer.top+1,top:r.top,bottom:r.bottom,footerTop:footer.top};
    });
  })()`);
  const formValues = () => evaluate(`Object.fromEntries(['Calories','Protein (g)','Carbohydrates (g)','Fat (g)','Fiber (g)','Sodium (mg)','Total Sugar (g)','Added Sugar (g)'].map(label=>[label,document.querySelector('input[aria-label="'+label+'"]')?.value??null]))`);
  const nutrientLabels = { calories: 'Calories', protein: 'Protein (g)', carbohydrates: 'Carbohydrates (g)', fat: 'Fat (g)', fiber: 'Fiber (g)', sodium: 'Sodium (mg)', totalSugar: 'Total Sugar (g)', addedSugar: 'Added Sugar (g)' };
  for (const layout of [{id:'mobile',width:390,height:844,mobile:true},{id:'desktop',width:1440,height:1000,mobile:false}]) {
    await client.send('Emulation.setDeviceMetricsOverride',{width:layout.width,height:layout.height,deviceScaleFactor:1,mobile:layout.mobile});
    for (const record of records) {
      progress({phase:'capturing-and-checking',layout:layout.id,case:record.id,completedScreens:rows.length});
      await open(record); const data=await summary();
      assert.equal(data.collapsed,true,record.id+': disclosures start collapsed');assert.equal(data.overflow,false,record.id+': horizontal clipping');
      assert.equal(data.scoreInViewport,true,record.id+': headline visible');assert.equal(data.useDisabled,!data.canUse);
      assert.equal(data.initialScrollTop,0,record.id+': review starts at top');
      assert.equal(data.primaryNutritionVisible,true,record.id+': primary nutrients initially visible');
      assert.deepEqual(data.reasons,data.expectedReasons);assert(data.reasons.length<=3);assert.equal(data.lookupCalls,1);
      const expected = EXPECTED[record.id]; assert(expected, 'Every review case needs independent expectations');
      assert.equal(data.mainScore,expected.overall===null?'Score unavailable':expected.overall+'/100');
      assert.equal(data.expectedScore,expected.overall,record.id+': calculated main score');
      assert.equal(data.nutrition,expected.nutrition,record.id+': nutrition unchanged');
      assert.equal(data.overall,expected.overall,record.id+': combined score unchanged');
      assert.equal(data.status,expected.nutrition===null?'nutrition-unavailable':'provisional',record.id+': status unchanged');
      assert.equal(data.canUse,expected.canUse,record.id+': logging readiness unchanged');
      assert.deepEqual(data.providerNutrients,expected.nutrients,record.id+': all effective nutrient values unchanged');
      if(record.id==='milk-unknown'){assert.equal(data.providerNutrients.addedSugar,null);assert(data.sugarNote.includes('score uses total sugars'));}
      if(record.id==='teddy')assert(data.visibleScope.includes('other values from provider'));
      const actions=await controls(); assert(actions.every(action=>action.unobstructed),record.id+': controls initially visible and unobstructed');
      const file=await capture(layout.id+'-'+record.id+'.png');
      await evaluate(`document.querySelector('.trace-barcode-dialog__nutrition-details').open=true;document.querySelector('[aria-label="Why this score"]').open=true;document.querySelector('.trace-barcode-dialog__content').scrollTop=99999`);
      await wait(100);
      const scrolledActions=await controls();
      assert(scrolledActions.every(action=>action.unobstructed),record.id+': actions and close remain accessible with expanded details and scrolling');
      assert.deepEqual(scrolledActions.map(({name,disabled})=>({name,disabled})),actions.map(({name,disabled})=>({name,disabled})));
      await evaluate(`document.querySelectorAll('[aria-label="Barcode product review"] details').forEach(el=>el.open=false);document.querySelector('.trace-barcode-dialog__content').scrollTop=0`);
      if(record.id==='cheerios'){
        assert.equal(data.useDisabled,true);assert(data.loggingReason.includes('carbohydrates per serving'));
        assert(data.missing.includes('Carbohydrates'));assert(actions.some(a=>a.name==='Complete This Food'));
        if(layout.id==='mobile')await capture('mobile-cheerios-logging.png');
      }
      if(layout.id==='mobile'&&['spam','teddy'].includes(record.id)){
        await evaluate(`document.querySelector('[aria-label="Why this score"]').open=true;document.querySelector('.trace-barcode-dialog__content').scrollTop=250`);
        await capture('mobile-'+record.id+'-evidence.png');
      }
      rows.push({id:record.id,layout:layout.id,file,evidenceType:record.kind,...data,effectiveSelection:undefined,actions,scrolledActions});
      fs.writeFileSync(path.join(output,'results-in-progress.json'),JSON.stringify({rows,flows,themes},null,2));
      if(layout.id==='mobile'&&record.quantity){
        await click('Use This Food');await until(`!document.querySelector('[aria-label="Close barcode scanner"]')`);
        const selection=data.effectiveSelection;
        const quantitySelector=await evaluate(`(()=>{const el=Array.from(document.querySelectorAll('label')).find(label=>label.textContent.trim()==='Number of servings').querySelector('input');el.id='review-serving-quantity';return '#review-serving-quantity';})()`);
        await input(quantitySelector,record.quantity);
        const values=await formValues();
        for(const [key,label]of Object.entries(nutrientLabels)){
          const expected=selection.nutrients[key]===null?null:selection.nutrients[key]*record.quantity;
          if(expected===null)assert.equal(values[label],'',record.id+': unknown '+key);
          else assert.equal(values[label],await evaluate(`window.reviewFormat(${JSON.stringify(key)},${expected})`),record.id+': formatted form '+key);
        }
        if(record.id==='quest'){
          await evaluate(`document.querySelector('input[aria-label="Calories"]').closest('section')?.scrollIntoView({block:'start'})`);
          await capture('mobile-quest-125-serving.png');
        }
        const before=await evaluate(`JSON.parse(localStorage.getItem('nutritionEntries')||'[]')`);
        await click('Save Entry');await until(`JSON.parse(localStorage.getItem('nutritionEntries')||'[]').length===${before.length+1}`);
        const saved=await evaluate(`JSON.parse(localStorage.getItem('nutritionEntries')).find(entry=>!${JSON.stringify(before.map(entry=>entry.id))}.includes(entry.id))`);
        for(const key of Object.keys(nutrientLabels)){
          const expected=selection.nutrients[key]===null?null:selection.nutrients[key]*record.quantity;
          if(expected===null)assert.equal(saved[key],null,record.id+': saved unknown');
          else assert(Math.abs(saved[key]-expected)<1e-8,record.id+': saved '+key);
        }
        assert(!/nutritionScore100|overallScore100|methodVersion|"grade"|scoreReady/.test(JSON.stringify(saved)),'Scores must never be saved');
        assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('nutritionEntries')).filter(entry=>${JSON.stringify(before.map(entry=>entry.id))}.includes(entry.id))`),before);
        // Reload the actual App; use its actual entry edit path, not a test callback.
        await client.send('Page.reload');await until(`Boolean(document.querySelector('.trace-home-page h1'))`);await click('Nutrition');
        await until(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Edit')`);
        await evaluate(`(()=>{const buttons=Array.from(document.querySelectorAll('button')).filter(b=>b.textContent.trim()==='Edit');const button=buttons.find(b=>b.closest('article')?.textContent.includes(${JSON.stringify(saved.name)}))||buttons[0];button.click();})()`);
        await until(`Boolean(document.querySelector('input[aria-label="Calories"]'))`);
        const reopened=await formValues();assert.deepEqual(reopened,values,record.id+': saved quantity survives reopening');
        flows.push({id:record.id,quantity:record.quantity,savedId:saved.id,nutrients:values,reopened,previousEntriesUnchanged:true,noGradesPersisted:true});
      }
    }
  }
  await client.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  for(const theme of ['modern-heirloom','river','haunted-forest','gnome-village','desert-journey','outer-space-journey','to-kingdoms-ahead']){
    await open(records[0],theme);const data=await summary();assert.equal(data.collapsed,true);assert.equal(data.overflow,false);assert.equal(data.initialScrollTop,0);
    const initialActions=await controls();assert(initialActions.every(action=>action.unobstructed));
    await evaluate(`document.querySelector('.trace-barcode-dialog__nutrition-details').open=true;document.querySelector('.trace-barcode-dialog__content').scrollTop=99999`);await wait(100);
    assert((await controls()).every(action=>action.unobstructed));
    await evaluate(`document.querySelector('.trace-barcode-dialog__nutrition-details').open=false;document.querySelector('.trace-barcode-dialog__content').scrollTop=0`);
    const colors=await evaluate(`({theme:document.documentElement.dataset.traceShellTheme,foreground:getComputedStyle(document.querySelector('.trace-barcode-grade')).color,background:getComputedStyle(document.querySelector('.trace-barcode-grade')).backgroundColor})`);
    assert.equal(colors.theme,theme);themes.push({...colors,file:await capture('theme-'+theme+'.png')});
  }
  assert.equal(new Set(themes.map(theme=>theme.background)).size,7);
  await click('Scan Again');await until(`!document.querySelector('[aria-label="Barcode product review"]')`);
  await until(`Boolean(document.querySelector('.trace-barcode-dialog__manual input'))`);
  await click('Return to Food Search');await until(`!document.querySelector('[aria-label="Close barcode scanner"]')`);
  assert(await evaluate(`Boolean(document.querySelector('input[aria-label="Calories"]'))`),'Manual entry remains accessible');
  const catalogSearch=await evaluate(`Array.from(document.querySelectorAll('input')).some(el=>/search/i.test(el.placeholder))`);
  assert(catalogSearch,'Existing catalog search remains accessible');
  assert.equal(exceptions.length,0);
  assert.equal(consoleErrors.length,0);
  const report={actualApp:true,fixturesAtLookupBoundary:true,liveLookupCount:0,rows,flows,themes,scanAgain:true,manualLoggingAccessible:true,exceptions,consoleErrors,
    catalogSearchAccessible:catalogSearch,reviewOnly:true,scientificValidation:false,publicGradingEnabled:false,isolatedStorage:true,userProfileAccessed:false};
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2));
  const escape=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const picture=(file,caption)=>`<figure><a href="${file}"><img loading="lazy" src="${file}" alt="${escape(caption)}"></a><figcaption>${escape(caption)}</figcaption></figure>`;
  const mobile=rows.filter(row=>row.layout==='mobile');
  const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Trace experimental grading — review</title>
  <style>body{max-width:1150px;margin:32px auto;padding:0 20px;font:16px/1.5 system-ui;color:#202b35;background:#faf9f6}h1{font-size:28px}h2{font-size:21px;margin-top:32px}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid #c8c8c8;padding:8px;text-align:left}.pair{display:grid;grid-template-columns:minmax(0,390px) minmax(0,1fr);gap:16px}figure{margin:0}img{max-width:100%;height:auto;border:1px solid #bbb}figcaption,small{font-size:13px;color:#45505a}.themes{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px}details{margin:20px 0}section{border-top:1px solid #ccc;margin-top:30px;padding-top:8px}@media(max-width:750px){.pair{grid-template-columns:1fr}}</style>
  <h1>Trace experimental grading: user review</h1>
  <p>Actual running Trace App, Nutrition page, barcode review and save/edit flow. Only lookup/camera adapters are supplied by the local test boundary. <strong>No live product lookup is claimed.</strong> Captures: 390×844 mobile and 1440×1000 desktop. Development experiment; no scientific validation or market-coverage claim. Public grading remains disabled.</p>
  <table><thead><tr><th>Case</th><th>Nutrition</th><th>Overall / status</th><th>Logging</th></tr></thead><tbody>${mobile.map(row=>`<tr><td><a href="#${row.id}">${escape(records.find(r=>r.id===row.id).title)}</a></td><td>${row.nutrition??'Unavailable'}</td><td>${row.overall??'Unavailable'} — ${escape(row.status)}</td><td>${row.canUse?'Available':'Disabled; missing serving data'}</td></tr>`).join('')}</tbody></table>
  <p>Milk’s 86 versus 61 isolates declared zero versus unknown added sugar on the same reference. Unknown values are not filled. Teddy’s main score compares the manufacturer reference, while new logging retains the provider panel with verified sugar corrections only. SPAM’s supported additive finding remains qualified and experimental.</p>
  ${mobile.map(row=>{const record=records.find(r=>r.id===row.id),desktop=rows.find(r=>r.id===row.id&&r.layout==='desktop');return `<section id="${row.id}"><h2>${escape(record.title)}</h2><p>${escape(record.kind)}</p><p><strong>${escape(row.mainScore)}</strong> · ${escape(row.status)}. ${row.canUse?'Use This Food is available.':escape(row.loggingReason||'Assessment unavailable; see source limitations.')} ${escape(row.missing)}</p><div class="pair">${picture(row.file,'Mobile: '+record.title)}${picture(desktop.file,'Desktop: '+record.title)}</div>${['spam','teddy'].includes(row.id)?`<p><a href="mobile-${row.id}-evidence.png">Expanded source evidence screenshot</a></p>`:''}${row.id==='cheerios'?'<p><a href="mobile-cheerios-logging.png">Disabled logging and missing-input explanation</a>. Existing Complete This Food, manual entry and catalog search remain available; no carbohydrate value was invented.</p>':''}</section>`;}).join('')}
  <h2>Actual save and reopen checks</h2><p>Disposable isolated browser storage only. Each saved entry was reopened after reloading the real App. Previously saved test records remained unchanged, and no grades were persisted.</p><table><tr><th>Case</th><th>Servings</th><th>Saved and reopened</th></tr>${flows.map(flow=>`<tr><td>${escape(flow.id)}</td><td>${flow.quantity}</td><td>${Object.entries(flow.nutrients).map(([key,value])=>escape(key)+': '+escape(value===''?'Unknown':value)).join('; ')}</td></tr>`).join('')}</table><p><a href="mobile-quest-125-serving.png">Quest form at 1.25 servings</a> · <a href="results.json">Detailed assertions and source snapshots</a></p>
  <details><summary>All seven themes — Quest review</summary><div class="themes">${themes.map(theme=>picture(theme.file,theme.theme)).join('')}</div></details>
  <p>Known limits: manufacturer references do not identify the user’s package revision; a partial correction is not whole-panel verification. Captured provider records can be stale, incomplete or wrong. Provisional additive screening is not measured exposure or proof of product harm. No physical camera check or production milk grading is claimed.</p></html>`;
  fs.writeFileSync(path.join(output,'index.html'),html);
  progress({phase:'captured-awaiting-visual-inspection',cases:7,layouts:2,flows:flows.length,themes:themes.length});
  console.log(JSON.stringify({rows:rows.map(r=>({id:r.id,layout:r.layout,score:r.mainScore,status:r.status})),flows:flows.length,themes:themes.length,exceptions:exceptions.length}));
};

// Four bounded captured cases for the concise Preview disclosure. No provider
// requests or saved test entries. Reuses the actual App/camera-boundary tooling.
module.exports.runConcise = async function runConcise({records,client,evaluate,until,click,input,capture,open,output,progress,wait,exceptions,consoleErrors}) {
 const expected={quest:[54,52],dymatize:[null,null],teddy:[20,20],conflicted:[null,null]},rows=[];
 const controls=()=>evaluate(`Array.from(document.querySelectorAll('.trace-barcode-dialog__footer button,.trace-barcode-dialog__close')).map(b=>{const r=b.getBoundingClientRect();return {name:b.getAttribute('aria-label')||b.textContent.trim(),disabled:b.disabled,visible:r.top>=0&&r.bottom<=innerHeight&&b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}})`);
 const key=async name=>{const codes={Enter:13,Tab:9};await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:name,code:name,windowsVirtualKeyCode:codes[name],...(name==='Enter'?{text:'\r',unmodifiedText:'\r'}:{})});await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:name,code:name,windowsVirtualKeyCode:codes[name]});await wait(80)};
 const data=()=>evaluate(`(()=>{const a=document.querySelector('[aria-label="Barcode product review"]'),score=a.querySelector('.trace-barcode-grade'),additives=a.querySelector('[aria-label="Product additives"]'),expected=window.reviewExpected;const text=node=>{const clone=node.cloneNode(true);clone.querySelectorAll('p,li,summary,div,ul').forEach(e=>e.append(document.createTextNode(' ')));return clone.textContent};const explanation=text(score)+' '+text(additives);return {score:score.querySelector('strong').textContent,categoryBoundary:expected.nutrition.ratingStatus==='not-rated-category',nutrition:expected.nutrition.nutritionScore100,overall:expected.overall.overallScore100,canUse:expected.candidate.canUse,source:window.reviewCase.kind,allCollapsed:Array.from(a.querySelectorAll('details')).every(e=>!e.open)&&a.querySelector('[aria-label="Product ingredients"] button').getAttribute('aria-expanded')==='false',words:explanation.trim().split(/\\s+/).length,explanation,clipping:document.querySelector('.trace-barcode-dialog__content').scrollWidth>document.querySelector('.trace-barcode-dialog__content').clientWidth+1,ingredientText:expected.candidate.display.ingredients?.text,sourceLinks:Array.from(a.querySelectorAll('.trace-barcode-grade a,.trace-barcode-additives a')).map(e=>({label:e.getAttribute('aria-label')||e.textContent,href:e.href}))}})()`);
 for(const layout of [{id:'mobile',width:390,height:844,mobile:true},{id:'desktop',width:1440,height:1000,mobile:false}]){
  await client.send('Emulation.setDeviceMetricsOverride',{width:layout.width,height:layout.height,deviceScaleFactor:1,mobile:layout.mobile});
  for(const record of records){
   progress({phase:'concise-visual-review',layout:layout.id,case:record.id,completed:rows.length});await open(record);const row={id:record.id,layout:layout.id,...await data()};
   assert.deepEqual([row.nutrition,row.overall],expected[record.id]);assert(row.allCollapsed);assert(!row.clipping);assert(row.words<180,'Bounded total copy including identities/source labels');assert(!/grade=null|scoreReady|proteinApplied|round\(nutrition|raw deduction|Unreviewed ingredient phrase|concernBurden|policy:/i.test(row.explanation));assert((await controls()).every(c=>c.visible));
   row.screenshots=[await capture(layout.id+'-'+record.id+'-collapsed.png')];
   if(row.categoryBoundary){
    assert.equal(row.score,'Overall rating not available for protein supplements.');
    assert(!/\d+\s*\/\s*100|deduction|adjustment|lowers the score/i.test(row.explanation));
    await evaluate("document.querySelector('.trace-barcode-dialog__nutrition-details').open=true;document.querySelector('.trace-barcode-dialog__nutrition-details').scrollIntoView({block:'center'})");await wait(80);
    assert((await controls()).every(c=>c.visible));row.screenshots.push(await capture(layout.id+'-'+record.id+'-nutrition-expanded.png'));
    await evaluate("document.querySelector('.trace-barcode-dialog__nutrition-details').open=false;document.querySelector('.trace-barcode-grade a').focus()");
    assert.equal(await evaluate('document.activeElement.tagName'),'A');
   }else{
   await evaluate(`document.querySelector('[aria-label="Why this score"] summary').focus()`);await key('Enter');await until(`document.querySelector('[aria-label="Why this score"]').open`);
   await evaluate(`document.querySelector('[aria-label="Why this score"]').scrollIntoView({block:'center'})`);await wait(80);assert((await controls()).every(c=>c.visible));row.screenshots.push(await capture(layout.id+'-'+record.id+'-score-expanded.png'));
   await evaluate(`document.querySelector('[aria-label="Why this score"] summary').focus()`);await key('Tab');assert.equal(await evaluate(`document.activeElement.tagName`),'A','Score source is keyboard reachable');
   }
   await evaluate(`document.querySelector('[aria-label="Why this score"]')?.removeAttribute('open');document.querySelector('[aria-label="Product additives"] summary').focus()`);await key('Enter');await until(`document.querySelector('[aria-label="Product additives"]').open`);await evaluate(`document.querySelector('[aria-label="Product additives"]').scrollIntoView({block:'center'})`);await wait(80);assert((await controls()).every(c=>c.visible));row.screenshots.push(await capture(layout.id+'-'+record.id+'-additives-expanded.png'));
   assert(row.sourceLinks.every(s=>s.label.trim()&&s.href.startsWith('https:')),'Source labels and secure links retained');
   await evaluate(`document.querySelector('[aria-label="Product additives"] summary').focus()`);await key('Tab');assert.equal(await evaluate(`document.activeElement.tagName`),'A','Ingredient/concern sources are keyboard reachable');
   await evaluate(`document.querySelector('[aria-label="Product additives"]').open=false;document.querySelector('[aria-label="Product ingredients"] button').click()`);
   const ingredients=await evaluate(`document.querySelector('[aria-label="Product ingredients"]').textContent`);if(row.ingredientText)assert(ingredients.includes(row.ingredientText),'Full ingredient declaration accessible separately');
   assert((await controls()).every(c=>c.visible));row.keyboardDisclosureAndSources=true;row.fullIngredientsAccessible=true;
   await click('Scan Again');await until(`!document.querySelector('[aria-label="Barcode product review"]')`);row.scanAgain=true;
   assert.equal(await evaluate(`JSON.parse(localStorage.getItem('nutritionEntries')||'[]').length`),0);
   rows.push(row);fs.writeFileSync(path.join(output,'concise-results-in-progress.json'),JSON.stringify(rows,null,2));
  }
 }
 assert.equal(exceptions.length,0);assert.equal(consoleErrors.length,0);
 const report={actualApp:true,capturedLookupBoundary:true,liveLookupCount:0,rows,runtimeErrors:exceptions,consoleErrors,noEntriesSaved:true,userProfileAccessed:false};
 fs.writeFileSync(path.join(output,'concise-results.json'),JSON.stringify(report,null,2));
 const escape=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const html='<!doctype html><html lang="en"><meta charset="utf-8"><title>Trace concise grading review</title><style>body{font:16px/1.5 system-ui;max-width:1200px;margin:24px auto}img{max-width:100%;border:1px solid #aaa}.shots{display:flex;gap:12px}.shots a{flex:1;min-width:0}section{margin:30px 0}</style><h1>Concise grading: captured-case review</h1><p>Actual Trace application; captured responses at the lookup boundary. No live lookup is claimed in these screenshots. Mobile 390×844 and desktop 1440×1000. Full ingredient declarations remain separate.</p>'+rows.map(row=>'<section><h2>'+escape(row.id+' / '+row.layout)+'</h2><p>Nutrition '+row.nutrition+'; overall '+row.overall+'. '+row.words+' words including identity/source labels. '+escape(row.source)+'</p><div class="shots">'+row.screenshots.map(file=>'<a href="'+file+'"><img src="'+file+'" alt="'+escape(file)+'"></a>').join('')+'</div></section>').join('')+'</html>';
 fs.writeFileSync(path.join(output,'index.html'),html);progress({phase:'concise-screenshots-awaiting-inspection',cases:records.length,layouts:2,images:rows.length*3});console.log(JSON.stringify({output,rows:rows.map(({id,layout,words,nutrition,overall})=>({id,layout,words,nutrition,overall})),runtimeErrors:0,consoleErrors:0,noEntriesSaved:true}));
};

// Actual shared pages and portal dialogs; reuses the captured food-review path.
module.exports.runLightTheme = async function runLightTheme(ctx) {
  const {records,client,evaluate,until,click,input,capture,open,output,progress,wait,exceptions,consoleErrors,base}=ctx;
  if(!process.argv.includes('--shared-pages-only')) await module.exports.runConcise(ctx);
  const rows=[];
  const inspect=async(name)=>{
    const data=await evaluate(`(()=>{const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width&&r.height&&r.bottom>0&&r.top<innerHeight&&s.visibility!=='hidden'&&s.display!=='none'};return {theme:document.documentElement.dataset.traceShellTheme,colorScheme:getComputedStyle(document.documentElement).colorScheme,bodyBackground:getComputedStyle(document.body).backgroundColor,overflow:document.documentElement.scrollWidth>innerWidth+1,fields:[...document.querySelectorAll('input,select,textarea')].filter(visible).map(e=>({label:e.getAttribute('aria-label')||e.placeholder||e.name,bg:getComputedStyle(e).backgroundColor,text:getComputedStyle(e).color,placeholder:getComputedStyle(e,'::placeholder').color,scheme:getComputedStyle(e).colorScheme})),inlineColors:[...document.querySelectorAll('[style]')].filter(visible).filter(e=>e.style.color||e.style.background||e.style.backgroundColor).map(e=>({tag:e.tagName,className:e.className,text:e.textContent.trim().slice(0,70),color:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor}))}})()`);
    assert(!data.overflow,name+': page clipping');
    if(data.theme==='modern-heirloom')assert.equal(data.colorScheme,'light','System dark must not change the selected light theme');
    rows.push({name,...data,screenshot:await capture(name+'.png')});
    fs.writeFileSync(path.join(output,'light-theme-results-in-progress.json'),JSON.stringify(rows,null,2));
  };
  for(const layout of [{id:'mobile',width:390,height:844,mobile:true},{id:'desktop',width:1440,height:1000,mobile:false}]) {
    await client.send('Emulation.setDeviceMetricsOverride',{...layout,deviceScaleFactor:1});
    await client.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});
    await client.send('Page.navigate',{url:base+'/?case=quest&theme=modern-heirloom&barcodeGrading=1'});
    await until(`Boolean(document.querySelector('.trace-home-page h1'))`);
    await inspect(layout.id+'-home-system-dark');
    await evaluate(`document.querySelector('button[aria-label="Settings"]').click()`);
    await until(`Boolean(document.querySelector('[data-testid="settings-page"]'))`);
    await inspect(layout.id+'-settings');
    await evaluate(`document.querySelector('.journal-privacy-settings').scrollIntoView({block:'start'})`);
    await inspect(layout.id+'-settings-privacy');
    await click('Set up Journal Lock');
    await until(`Boolean(document.querySelector('.journal-privacy-dialog'))`);
    await inspect(layout.id+'-privacy-portal-dialog');
    await click('Cancel');await click('Back to Timeline');
    await until(`Boolean(document.querySelector('.trace-home-page:not([hidden]) h1'))`);
    await click('Add Memory');await until(`Boolean(document.querySelector('.trace-memory-editor'))`);
    await inspect(layout.id+'-memory-entry');
    const memoryTitle='Synthetic theme review '+layout.id;
    await input('.trace-memory-editor__field--title',memoryTitle);
    await evaluate(`(()=>{const el=document.querySelector('.trace-memory-editor__field--story');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,'Synthetic layout check only. No personal content.');el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await click('Save Memory');
    const memorySelector='[aria-label="Open memory '+memoryTitle+'"]';
    await until(`Boolean(document.querySelector(${JSON.stringify(memorySelector)}))`);
    await evaluate(`document.querySelector(${JSON.stringify(memorySelector)}).click()`);
    await until(`Boolean(document.querySelector('.trace-memory-detail'))`);
    await wait(100);await inspect(layout.id+'-memory-detail');
    await evaluate(`document.querySelector('.trace-memory-detail__action--edit').click()`);
    await until(`Boolean(document.querySelector('[aria-label="Close Edit Memory"]'))`);
    await inspect(layout.id+'-memory-edit');
    await client.send('Page.navigate',{url:base+'/?case=quest&theme=modern-heirloom&barcodeGrading=1'});
    await until(`Boolean(document.querySelector('.trace-home-page h1'))`);await click('Nutrition');
    await until(`Boolean(document.querySelector('.trace-nutrition-today'))`);
    await inspect(layout.id+'-nutrition');
    await open(records.find(r=>r.id==='quest'));await click('Use This Food');
    await until(`Boolean(document.querySelector('input[aria-label="Sodium (mg)"]'))`);
    await evaluate(`document.querySelector('input[aria-label="Sodium (mg)"]').scrollIntoView({block:'center'});document.querySelector('input[aria-label="Sodium (mg)"]').focus()`);
    await inspect(layout.id+'-nutrition-form-focused');
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('nutritionEntries')||'[]').length`),0);
  }
  await client.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  for(const theme of ['river','haunted-forest','gnome-village','desert-journey','outer-space-journey','to-kingdoms-ahead']){
    progress({phase:'other-theme-controls',theme});await open(records.find(r=>r.id==='quest'),theme);await inspect('control-'+theme);
  }
  assert.equal(exceptions.length,0);assert.equal(consoleErrors.length,0);
  fs.writeFileSync(path.join(output,'light-theme-results.json'),JSON.stringify({rows,runtimeErrors:exceptions,consoleErrors,capturedLookup:true,noSavedNutritionEntries:true,syntheticLocalMemoryOnly:true,systemDark:true},null,2));
};

// Bounded action styling review using the real App and existing Quest capture.
module.exports.runButtonContrast = async function runButtonContrast({records,client,evaluate,until,click,input,capture,output,progress,wait,exceptions,consoleErrors,base}) {
  const rows=[],quest=records.find(r=>r.id==='quest');
  await client.send('DOM.enable');await client.send('CSS.enable');
  const style=selector=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),s=getComputedStyle(e),r=e.getBoundingClientRect();return {text:e.textContent.trim(),background:s.backgroundColor,color:s.color,outline:s.outlineColor,outlineWidth:s.outlineWidth,outlineOffset:s.outlineOffset,disabled:e.disabled,scheme:getComputedStyle(document.documentElement).colorScheme,visible:r.width>0&&r.height>0,overflow:document.documentElement.scrollWidth>innerWidth+1}})()`);
  const contrast=(a,b)=>{const luminance=c=>{const rgb=c.match(/[\d.]+/g).slice(0,3).map(n=>{const v=Number(n)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  const checkAction=async(selector,label)=>{const s=await style(selector);assert.equal(s.background,'rgb(40, 104, 94)',label+': solid action fill');assert.equal(s.color,'rgb(255, 255, 255)',label+': light text/icons');assert(contrast(s.background,s.color)>=4.5,label+': text contrast');assert.equal(s.scheme,'light');assert(!s.overflow);return {label,...s,contrast:contrast(s.background,s.color)}};
  const force=async(selector,states)=>{const doc=await client.send('DOM.getDocument');const {nodeId}=await client.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector});assert(nodeId);await client.send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:states});await evaluate(`(async()=>{const el=document.querySelector(${JSON.stringify(selector)});getComputedStyle(el).backgroundColor;await Promise.all(el.getAnimations().map(animation=>animation.finished.catch(()=>{})));})()`);await wait(30)};
  for(const layout of [{id:'mobile',width:390,height:844,mobile:true},{id:'desktop',width:1440,height:1000,mobile:false}]) {
    progress({phase:'button-contrast',layout:layout.id});
    await client.send('Emulation.setDeviceMetricsOverride',{width:layout.width,height:layout.height,deviceScaleFactor:1,mobile:layout.mobile});
    await client.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});
    await client.send('Page.navigate',{url:base+'/?case=quest&theme=modern-heirloom&barcodeGrading=1'});await until(`Boolean(document.querySelector('.trace-home-page h1'))`);
    const home=await evaluate(`Array.from(document.querySelectorAll('.trace-feature-navigation button,.trace-home-utilities button')).map(e=>'.'+e.classList[0])`);
    for(const selector of [...new Set(home)])rows.push(await checkAction(selector,layout.id+' '+selector));
    await capture(layout.id+'-home.png');
    const primary='.trace-feature-action--primary';
    await force(primary,['hover']);let state=await style(primary);assert.equal(state.background,'rgb(32, 86, 78)');
    await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await evaluate(`document.querySelector(${JSON.stringify(primary)}).focus()`);assert.equal(await evaluate(`document.querySelector(${JSON.stringify(primary)}).matches(':focus-visible')`),true);
    await force(primary,['active','focus-visible']);state=await style(primary);assert.equal(state.background,'rgb(32, 86, 78)');assert(parseFloat(state.outlineWidth)>=3);assert(parseFloat(state.outlineOffset)>=2);await capture(layout.id+'-home-pressed-focus.png');await force(primary,[]);
    await click('Nutrition');await until(`Boolean(document.querySelector('.trace-nutrition-today'))`);
    for(const selector of ['.trace-nutrition-back','.trace-nutrition-details-toggle','.trace-nutrition-goals-toggle','.trace-nutrition-quick-actions button:first-child','.trace-nutrition-quick-actions button:last-child'])rows.push(await checkAction(selector,layout.id+' '+selector));
    await capture(layout.id+'-nutrition.png');
    await click('View all nutrition');assert.equal(await evaluate(`document.querySelector('.trace-nutrition-details-toggle').getAttribute('aria-expanded')`),'true');await click('Hide nutrition details');
    await input('.trace-food-search input','apple');await until(`Boolean(document.querySelector('.trace-search-result'))`);const result=await style('.trace-search-result');assert(contrast(result.background,result.color)>=4.5,'Food result cards remain readable');assert.equal(result.background,'rgb(255, 255, 255)');await input('.trace-food-search input','');
    await click('Scan Barcode');await until(`Boolean(document.querySelector('.trace-barcode-dialog__manual input'))`);
    const disabled=await style('.trace-barcode-dialog__manual button');assert(disabled.disabled);assert(contrast(disabled.background,disabled.color)>=4.5,'Disabled label readable');assert.notEqual(disabled.background,'rgb(40, 104, 94)');await capture(layout.id+'-scanner-disabled.png');
    await input('.trace-barcode-dialog__manual input',quest.code);await click('Look Up Barcode');await until(`Boolean(document.querySelector('[aria-label="Experimental nutrition assessment"]'))`);
    const score=await evaluate(`window.reviewExpected.overall.overallScore100`);assert.equal(score,52);
    for(const selector of ['.trace-barcode-dialog__close','.trace-barcode-dialog__review-actions button:first-child','.trace-barcode-dialog__review-actions button:last-child','.trace-barcode-dialog__secondary-actions button'])rows.push(await checkAction(selector,layout.id+' '+selector));
    const disclosure=await style('.trace-barcode-ingredients__toggle');assert.equal(disclosure.background,'rgb(255, 255, 255)');assert(contrast(disclosure.background,disclosure.color)>=4.5,'Disclosure stays a light row');
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('.trace-barcode-dialog__footer button')).every(b=>{const r=b.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})`),true);
    await capture(layout.id+'-quest-review.png');await click('Scan Again');await until(`!document.querySelector('[aria-label="Barcode product review"]')`);
    await client.send('Page.navigate',{url:base+'/?case=quest&theme=modern-heirloom&barcodeGrading=1'});await until(`Boolean(document.querySelector('.trace-home-page h1'))`);await evaluate(`document.querySelector('[aria-label="Settings"]').click()`);await until(`Boolean(document.querySelector('[data-testid="settings-page"]'))`);await click('Set up Journal Lock');await until(`Boolean(document.querySelector('.journal-privacy-dialog'))`);
    rows.push(await checkAction('.journal-actions .trace-action--primary',layout.id+' portal primary'));rows.push(await checkAction('.journal-actions .trace-action--secondary',layout.id+' portal secondary'));await capture(layout.id+'-portal-actions.png');
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('nutritionEntries')||'[]').length`),0);
  }
  assert.deepEqual(exceptions,[]);assert.deepEqual(consoleErrors,[]);
  fs.writeFileSync(path.join(output,'button-contrast-results.json'),JSON.stringify({rows,mobile:'390x844',desktop:'1440x1000',systemDark:true,realApp:true,capturedQuest:true,noSavedEntries:true,runtimeErrors:exceptions,consoleErrors},null,2));
  progress({phase:'button-contrast-passed',checks:rows.length,screenshots:12});
};
