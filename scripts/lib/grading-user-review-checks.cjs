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
      await evaluate(`document.querySelector('.trace-barcode-dialog__nutrition-details').open=true;document.querySelector('[aria-label="Score details & limitations"]').open=true;document.querySelector('.trace-barcode-dialog__content').scrollTop=99999`);
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
        await evaluate(`document.querySelector('[aria-label="Score details & limitations"]').open=true; document.querySelector('[aria-label="Manufacturer label comparison"]').open=true;document.querySelector('.trace-barcode-dialog__content').scrollTop=250`);
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
