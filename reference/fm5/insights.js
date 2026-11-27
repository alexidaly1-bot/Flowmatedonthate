
// =========================================================
// TESTING: scenarios, automated runs, rule impact
// =========================================================
function condAnswers(p,d){return outConns(p,d.id).filter(k=>k.type!=='reference'&&k.type!=='read'&&p.entities[k.to]&&!['data','setting'].includes(p.entities[k.to].kind))}
function decisionSetting(p,d){return outConns(p,d.id).map(k=>p.entities[k.to]).find(e=>e&&e.kind==='setting')||inConns(p,d.id).map(k=>p.entities[k.from.entity]).find(e=>e&&e.kind==='setting')}
function suggestedAnswer(p,d,value){const conds=condAnswers(p,d);const on=isOnVal(value);const k=conds.find(k=>on?/^(yes|on|true|allowed|ok)/i.test(k.label||''):/^(no|off|false|not)/i.test(k.label||''));return k?(k.label||entityLabel(p,k.to)):null}
/* Decisions reached from a button (through functions and other decisions) */
function decisionsFrom(p,pageId,elId){const out=[];const seen=new Set();const q=outConns(p,pageId,elId).map(c=>c.to);
  while(q.length){const id=q.shift();if(seen.has(id))continue;seen.add(id);const e=p.entities[id];if(!e||e.kind==='page')continue;if(e.kind==='decision')out.push(e);if(seen.size<30)for(const c of outConns(p,id))if(PASS.has(c.type))q.push(c.to)}
  return out}
/* Run one saved journey against the current map, without opening Play */
function runScenario(p,path,over={}){
  const steps=path.steps||[];const res={id:path.id,name:path.name,ok:true,why:'',differs:[],at:Date.now(),steps:steps.length};
  if(!steps.length||!p.entities[steps[0].page])return Object.assign(res,{ok:false,why:'its start page was deleted'});
  for(let i=1;i<steps.length;i++){
    const from=steps[i-1].page,s=steps[i];const pg=p.entities[s.page];
    if(!pg){res.ok=false;res.why=`the page in step ${i+1} was deleted`;break}
    if(path.role&&pg.roles&&pg.roles.length&&!pg.roles.includes(path.role)){res.ok=false;res.why=`${roleName(p,path.role)} can't open “${pg.name}” any more`;break}
    if(s.kind==='tap'&&s.el){
      const el=findElement(p,from,s.el);if(!el){res.ok=false;res.why=`the button it tapped is gone from “${entityLabel(p,from)}”`;break}
      const reach=derivedEdges(p).filter(d=>d.from.entity===from&&d.from.element===s.el).map(d=>d.to);
      const back=i>1&&s.page===steps[i-2].page&&outConns(p,from,s.el).some(c=>c.type==='back');
      if(!reach.includes(s.page)&&s.page!==from&&!back){res.ok=false;res.why=`“${el.label}” no longer leads to “${pg.name}”`;break}
      if(s.choice)for(const d of decisionsFrom(p,from,s.el)){const set=decisionSetting(p,d);if(!set)continue;
        const base=(s.sim&&s.sim.settings&&s.sim.settings[set.id]!=null)?s.sim.settings[set.id]:effectiveSetting(p,set,from,path.role)??set.defaultValue;
        const v=over[set.id]!=null?over[set.id]:base;const sug=suggestedAnswer(p,d,v);
        if(sug&&sug!==s.choice&&condAnswers(p,d).some(k=>(k.label||entityLabel(p,k.to))===s.choice))res.differs.push({step:i+1,decision:d.name,setting:set.name,value:v,was:s.choice,now:sug})}
    }
  }
  if(res.ok&&path.expect&&steps[steps.length-1].page!==path.expect){res.ok=false;res.why=`it ends on “${entityLabel(p,steps[steps.length-1].page)}”, not the expected “${entityLabel(p,path.expect)}”`}
  if(res.ok&&res.differs.length){res.ok=false;res.why=`with these settings, “${res.differs[0].decision}” would answer “${res.differs[0].now}” instead of “${res.differs[0].was}”`}
  return res;
}
function runAllScenarios(over){const p=S.p;return (p.paths||[]).map(x=>runScenario(p,x,over||{}))}
function testsHTML(p){
  const paths=p.paths||[];const cov=new Set();paths.forEach(x=>x.steps.forEach(s=>cov.add(s.page)));const pg=pages(p);const untested=pg.filter(e=>!cov.has(e.id));
  const last=S._testRun||{};
  let h=`<p class="help">A test scenario is a saved journey. Record one in Play (tap through, then Save path), then run them all whenever the map changes.</p>
  <div class="row-btns"><button class="btn primary small" data-act="play">${icon('play')}Record in Play</button><button class="btn small" data-act="test-run-all" ${paths.length?'':'disabled'}>${icon('check2')}Run all ${paths.length}</button><button class="btn small" data-act="test-new">${icon('plus')}Written test</button></div>`;
  if(last.at)h+=`<div class="plain" style="margin-top:12px"><b>Last run ${ago(last.at)}:</b> ${last.pass} passed, ${last.fail} failed.</div>`;
  h+=`<div class="mod-h">Scenarios <span class="count">${paths.length}</span></div><div class="list">${paths.map(x=>{const r=last.res&&last.res[x.id];const a=p.entities[x.steps[0]&&x.steps[0].page],b=p.entities[x.steps[x.steps.length-1]&&x.steps[x.steps.length-1].page];
    return `<div class="li tcase${r?(r.ok?' pass':' fail'):''}"><span class="ckm" aria-hidden="true">${r?(r.ok?'✓':'✕'):'•'}</span><span class="grow"><b>${esc(x.name)}</b><small>${x.steps.length} steps · ${esc(a?a.name:'?')} → ${esc(b?b.name:'?')}${x.role?' · as '+esc(roleName(p,x.role)):''}${r?' · '+(r.ok?'Passed':'Failed: '+esc(r.why)):''}</small>
    <label class="sr" for="exp-${x.id}">Expected end page</label><select id="exp-${x.id}" class="inp small" data-act-change="test-expect" data-id="${x.id}">${opt('',x.expect||'','Expected end: last page')}${pg.map(e=>opt(e.id,x.expect||'',e.name)).join('')}</select></span>
    <span class="col-btns"><button class="btn small" data-act="test-run" data-id="${x.id}">Run</button><button class="btn small ghost" data-act="path-replay" data-id="${x.id}">Replay</button><button class="mini" data-act="path-del" data-id="${x.id}" aria-label="Delete scenario">${icon('trash')}</button></span></div>`}).join('')||'<p class="help">No scenarios yet.</p>'}</div>`;
  const written=(p.tasks||[]).filter(t=>t.kind==='test');
  if(written.length)h+=`<div class="mod-h">Written test cases <span class="count">${written.length}</span></div><div class="list">${written.map(t=>`<div class="li"><button class="cbx${t.done?' on':''}" data-act="task-tick" data-id="${t.id}" aria-pressed="${!!t.done}" aria-label="${t.done?'Passed':'Not checked'}">${t.done?'✓':''}</button><span class="grow">${esc(t.text)}<small>${t.ref?esc(entityLabel(p,t.ref)):'Whole app'}${t.expect?' · Expect: '+esc(t.expect):''}</small></span><button class="mini" data-act="task-del" data-id="${t.id}" aria-label="Remove">${icon('trash')}</button></div>`).join('')}</div>`;
  if(paths.length>1)h+=`<div class="mod-h">Compare two routes</div><div class="row-in"><label class="sr" for="cmp-a">First</label><select id="cmp-a" class="inp">${paths.map(x=>opt(x.id,paths[0].id,x.name)).join('')}</select><label class="sr" for="cmp-b">Second</label><select id="cmp-b" class="inp">${paths.map(x=>opt(x.id,paths[1].id,x.name)).join('')}</select><button class="btn small" data-act="test-compare">Compare</button></div>`;
  h+=`<div class="mod-h">Pages no test visits <span class="count">${untested.length}</span></div><div class="list">${untested.slice(0,30).map(e=>`<button class="li" data-act="jump" data-id="${e.id}"><span class="grow">${esc(e.name)}<small>${esc(e.pageType)}</small></span></button>`).join('')||'<p class="help">Every page is covered. Nice.</p>'}</div>`;
  return h;
}
Object.assign(ACT,{
  'test-run-all':()=>{const r=runAllScenarios();S._testRun={at:Date.now(),res:Object.fromEntries(r.map(x=>[x.id,x])),pass:r.filter(x=>x.ok).length,fail:r.filter(x=>!x.ok).length};rerenderPanelKeep();toast(`${S._testRun.pass} passed, ${S._testRun.fail} failed`)},
  'test-run':d=>{const x=S.p.paths.find(q=>q.id===d.id);const r=runScenario(S.p,x);S._testRun=S._testRun||{res:{},pass:0,fail:0};S._testRun.res=S._testRun.res||{};S._testRun.res[x.id]=r;S._testRun.at=Date.now();const v=Object.values(S._testRun.res);S._testRun.pass=v.filter(q=>q.ok).length;S._testRun.fail=v.length-S._testRun.pass;rerenderPanelKeep();toast(r.ok?'Passed':'Failed: '+r.why)},
  'test-new':()=>{const p=S.p;const s=S.sel&&S.sel.t!=='conn'?S.sel.id:'';openModal({title:'New test case',ic:'flask',body:`<div class="field"><label for="tc-t">What to test</label><input id="tc-t" class="inp" placeholder="e.g. Tenant reports a repair with a photo"></div><div class="field"><label for="tc-e">Expected result</label><input id="tc-e" class="inp" placeholder="e.g. Landlord gets a notification"></div><div class="field"><label for="tc-r">About</label><select id="tc-r" class="inp">${opt('',s,'Whole app')}${Object.values(p.entities).map(e=>opt(e.id,s,KINDS[e.kind].label+': '+e.name)).join('')}</select></div>`,
    actions:[{label:'Cancel',run:closeModal},{label:'Add test',primary:true,run:()=>{const t=$('#tc-t').value.trim();if(!t)return;const ex=$('#tc-e').value.trim(),r=$('#tc-r').value;closeModal();commit('Add test case',p=>{p.tasks.push({id:uid('tk'),kind:'test',text:t,expect:ex,ref:r||null,done:false,at:Date.now()})})}}]})},
  'test-compare':()=>{const p=S.p;const a=p.paths.find(x=>x.id===$('#cmp-a').value),b=p.paths.find(x=>x.id===$('#cmp-b').value);const pa=a.steps.map(s=>s.page),pb=b.steps.map(s=>s.page);const only=(x,y)=>[...new Set(x.filter(i=>!y.includes(i)))].map(i=>entityLabel(p,i));
    openModal({title:'Compare routes',ic:'flow',wide:true,body:`<div class="cmp2"><div><b>${esc(a.name)}</b><ol>${a.steps.map(s=>`<li>${esc(entityLabel(p,s.page))}${s.choice?' · '+esc(s.choice):''}</li>`).join('')}</ol></div><div><b>${esc(b.name)}</b><ol>${b.steps.map(s=>`<li>${esc(entityLabel(p,s.page))}${s.choice?' · '+esc(s.choice):''}</li>`).join('')}</ol></div></div><p><b>Steps:</b> ${a.steps.length} vs ${b.steps.length}. <b>Only in the first:</b> ${esc(only(pa,pb).join(', ')||'none')}. <b>Only in the second:</b> ${esc(only(pb,pa).join(', ')||'none')}.</p>`,actions:[{label:'Close',primary:true,run:closeModal}]})},
  'rule-sim':()=>ruleSimModal(S.sel.id),
});
document.addEventListener('change',ev=>{const t=ev.target;if(t.dataset&&t.dataset.actChange==='test-expect'&&S.p){const v=t.value;commit('Set expected end page',p=>{const x=p.paths.find(q=>q.id===t.dataset.id);if(x)x.expect=v})}});
/* Global rule impact: what would change if a setting had another value. Simulation only. */
function ruleSimModal(id){
  const p=S.p,set=p.entities[id];const base=set.defaultValue;const onoff=set.valueType==='On / off';const nv=onoff?(isOnVal(base)?'Off':'On'):base;
  const body=v=>{
    const R=impactOf(p,id);const routes=[];const hidden=[];const notif=new Set();
    for(const pg of pages(p))for(const el of pg.elements){
      if(outConns(p,pg.id,el.id).some(c=>c.to===id))hidden.push(`${pg.name} › ${el.label} (switch shows ${v})`);
      for(const d of decisionsFrom(p,pg.id,el.id)){const s2=decisionSetting(p,d);if(!s2||s2.id!==id)continue;const a=suggestedAnswer(p,d,effectiveSetting(p,set,pg.id)??base),b=suggestedAnswer(p,d,v);if(a!==b&&b){const ta=condAnswers(p,d).find(k=>(k.label||'')===a),tb=condAnswers(p,d).find(k=>(k.label||'')===b);routes.push(`${pg.name} › ${el.label}: “${d.name}” answers ${b} → ${tb?entityLabel(p,tb.to):'?'}${ta?' (was '+entityLabel(p,ta.to)+')':''}`);
        for(const k of [ta,tb])if(k){const q=[k.to],seen=new Set();while(q.length){const x=q.shift();if(seen.has(x))continue;seen.add(x);for(const c of outConns(p,x)){if(c.type==='notify')notif.add(entityLabel(p,x));if(seen.size<20&&p.entities[c.to]&&p.entities[c.to].kind!=='page')q.push(c.to)}}}}}}
    const over={[id]:v};const tests=(p.paths||[]).map(x=>[x,runScenario(p,x),runScenario(p,x,over)]).filter(([,a,b])=>a.ok!==b.ok||a.why!==b.why);
    return `<p class="help">This is a simulation of the app you're planning. Nothing in your map changes.</p><p><b>${esc(set.name)}</b>: ${esc(base)} → <b>${esc(v)}</b></p>
    <div class="mod-h">Controls tied to it <span class="count">${hidden.length}</span></div><ul class="roadmap help">${hidden.map(x=>`<li>${esc(x)}</li>`).join('')||'<li>None</li>'}</ul>
    <div class="mod-h">Routes that change <span class="count">${routes.length}</span></div><ul class="roadmap help">${routes.map(x=>`<li>${esc(x)}</li>`).join('')||'<li>None found. Link a decision to this setting and label its answers Yes / No.</li>'}</ul>
    <div class="mod-h">Notification workflows affected <span class="count">${notif.size}</span></div><ul class="roadmap help">${[...notif].map(x=>`<li>${esc(x)}</li>`).join('')||'<li>None</li>'}</ul>
    <div class="mod-h">Tests with a different result <span class="count">${tests.length}</span></div><ul class="roadmap help">${tests.map(([x,a,b])=>`<li>${esc(x.name)}: ${a.ok?'passes':'fails'} now, would ${b.ok?'pass':'fail'}${b.ok?'':' ('+esc(b.why)+')'}</li>`).join('')||'<li>None</li>'}</ul>
    <p class="help">${esc(impactSummary(R,'this setting'))}</p>`};
  openModal({title:'Simulate a rule change',sub:set.name,ic:'sliders',wide:true,body:`${!onoff?`<div class="field"><label for="rs-v">Try the value</label><input id="rs-v" class="inp" value="${esc(nv)}"></div>`:''}<div id="rs-out">${body(nv)}</div>`,
    actions:[{label:'Show on map',icon:'trace',run:()=>{closeModal();showRadius(id)}},{label:'Close',primary:true,run:closeModal}],onOpen:m=>{const i=$('#rs-v',m);if(i)i.addEventListener('input',()=>{$('#rs-out').innerHTML=body(i.value)})}});
}

// =========================================================
// HEALTH: journeys, consistency, contradictions, design debt, forgotten features, accessibility
// =========================================================
const normL=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').trim();
function analyse(p){
  const A={journeys:[],consistency:[],contradictions:[],debt:[],forgotten:[],a11y:[]};
  const add=(k,msg,why,ref,prompt)=>A[k].push({msg,why,ref,prompt});const pg=pages(p);const all=Object.values(p.entities);const names=all.map(e=>normL(e.name)).join(' | ')+' | '+pg.flatMap(e=>e.elements.map(x=>normL(x.label))).join(' | ');
  const hasIn={};for(const c of Object.values(p.connections))hasIn[c.to]=true;
  // Missing journeys
  const login=pg.find(e=>e.pageType==='Login / registration'||/\b(log ?in|sign ?in)\b/i.test(e.name));
  if(login&&!/forgot|reset|recover/.test(names))add('journeys','Login exists but there is no way to recover a password.','People who forget their password get stuck.',{t:'entity',id:login.id},`Add a "Forgot password" flow from ${login.name}: a button, a reset page and a confirmation.`);
  for(const e of pg)for(const el of e.elements){
    if(!/save|submit|send|book|pay|confirm|report/i.test(el.label))continue;
    for(const c of outConns(p,e.id,el.id)){const f=p.entities[c.to];if(!f||f.kind!=='function')continue;
      const goesToPage=outConns(p,f.id).some(k=>{const t=p.entities[k.to];return t&&t.kind==='page'});
      if(!goesToPage&&!(f.success||'').trim())add('journeys',`“${el.label}” on ${e.name} runs ${f.name}, but nothing confirms it worked.`,'People need to know their form went through.',{t:'element',id:e.id,el:el.id},`After ${f.name} succeeds, show a confirmation (a message or a Confirmation page).`)}}
  for(const f of byKindP(p,'function')){const outs=outConns(p,f.id);if(outs.some(c=>c.type==='api')&&!outs.some(c=>c.type==='error')&&!(f.error||'').trim())add('journeys',`${f.name} calls an outside service but has no error path.`,'If the service is down, people see nothing happen.',{t:'entity',id:f.id},`Add an error path from ${f.name}: a retry and a friendly error message.`)}
  const restricted=pg.some(e=>e.roles.length);
  for(const r of p.roles){const mine=pg.filter(e=>!e.roles.length||e.roles.includes(r.id));if(restricted&&!pg.some(e=>e.roles.includes(r.id)))add('journeys',`The role “${r.name}” has no page made for it.`,'Every kind of user needs a clear first screen.',null,`Decide what ${r.name} sees first and add a landing page for them.`);
    const st=p.entities[p.startPageId];if(st&&st.roles.length&&!st.roles.includes(r.id))add('journeys',`${r.name} can't open the first page (${st.name}).`,'They would be stuck before they start.',{t:'entity',id:st.id},`Give ${r.name} a start page, or let them see ${st.name}.`);if(!mine.length)add('journeys',`${r.name} can't see any page.`,'',null,'')}
  if(pg.some(e=>e.pageType==='Checkout')&&!pg.some(e=>e.pageType==='Confirmation'))add('journeys','There is a checkout but no confirmation page.','People need proof their payment worked.',null,'Add an order confirmation page after checkout.');
  for(const e of pg)if(e.pageType==='Error'&&!hasIn[e.id])add('journeys',`The error page “${e.name}” is never shown.`,'Nothing leads to it, so errors have nowhere to go.',{t:'entity',id:e.id},`Link error paths from functions that can fail to ${e.name}.`);
  for(const e of pg)for(const el of e.elements){if(!/delete|remove|cancel/i.test(el.label))continue;const cs=outConns(p,e.id,el.id);if(cs.length&&!cs.some(c=>c.type==='modal'||(p.entities[c.to]&&p.entities[c.to].kind==='decision')))add('journeys',`“${el.label}” on ${e.name} has no “Are you sure?” step.`,'One wrong tap could lose data.',{t:'element',id:e.id,el:el.id},`Add a confirm pop-up before ${el.label} on ${e.name}.`)}
  // Consistency
  const byLabel={};for(const e of pg)for(const el of e.elements){const k=normL(el.label);if(k)(byLabel[k]=byLabel[k]||[]).push([e,el])}
  for(const[k,list] of Object.entries(byLabel)){const types=new Set(list.map(([,el])=>el.type));if(list.length>1&&types.size>1)add('consistency',`“${list[0][1].label}” is a ${[...types].map(t=>(EL_TYPES[t]||{}).label||t).join(' on some pages and a ')} on others.`,'The same action should look the same everywhere.',{t:'element',id:list[0][0].id,el:list[0][1].id},`Make every “${list[0][1].label}” the same kind of part.`)}
  for(const f of byKindP(p,'function')){const labs=new Set();for(const c of inConns(p,f.id)){if(!c.from.element)continue;const el=findElement(p,c.from.entity,c.from.element);if(el)labs.add(el.label.trim())}if(labs.size>1)add('consistency',`${f.name} is started by buttons with different words: ${[...labs].map(x=>'“'+x+'”').join(', ')}.`,'Two labels for one action can confuse people.',{t:'entity',id:f.id},`Use one label for every button that runs ${f.name}.`)}
  for(const s of byKindP(p,'setting')){const seen={};for(const o of s.overrides||[]){if(seen[o.target]&&seen[o.target]!==o.value)add('consistency',`${s.name} has two different values for ${targetName(p,o.target)}.`,'Only one can win.',{t:'entity',id:s.id},'');seen[o.target]=o.value}
    if(s.valueType==='On / off'&&!/^(on|off)$/i.test(String(s.defaultValue).trim()))add('consistency',`${s.name} is an on/off switch but its default is “${s.defaultValue}”.`,'',{t:'entity',id:s.id},'')}
  const appAt=(p.look&&p.look.paletteAt)||0;for(const[sc,l] of allLookScopes(p)){if(sc!=='app:'&&l.palette&&appAt&&(l.paletteAt||0)<appAt)add('consistency',`${scopeLabel(p,sc)} uses older colours than the rest of the app.`,'The app colours changed after this override was made.',sc.startsWith('ent:')?{t:'entity',id:sc.slice(4)}:null,'')}
  const dupN={};for(const e of all){const k=e.kind+':'+normL(e.name);(dupN[k]=dupN[k]||[]).push(e)}for(const l of Object.values(dupN))if(l.length>1)add('consistency',`There are ${l.length} ${KINDS[l[0].kind].label.toLowerCase()}s called “${l[0].name}”.`,'Same names make the map hard to follow.',{t:'entity',id:l[1].id},'');
  const byType={};for(const e of pg)(byType[e.pageType]=byType[e.pageType]||[]).push(e);
  for(const[t,l] of Object.entries(byType)){if(l.length<2||t==='Home / dashboard')continue;const hasBack=e=>e.elements.some(x=>outConns(p,e.id,x.id).some(c=>c.type==='back')||/back/i.test(x.label));const yes=l.filter(hasBack),no=l.filter(e=>!hasBack(e));if(yes.length&&no.length)add('consistency',`Some ${t} pages have a back button and some don't (${no.map(e=>e.name).slice(0,3).join(', ')}).`,'Navigation should work the same on similar pages.',{t:'entity',id:no[0].id},`Add a back button to ${no.map(e=>e.name).join(', ')}.`)}
  // Contradictions
  for(const e of pg)for(const el of e.elements)for(const c of outConns(p,e.id,el.id)){const t=p.entities[c.to];if(!t||t.kind!=='page'||!t.roles.length)continue;const who=e.roles.length?e.roles:p.roles.map(r=>r.id);const blocked=who.filter(r=>!t.roles.includes(r));if(blocked.length&&!c.condition&&c.type!=='permission')add('contradictions',`${blocked.map(r=>roleName(p,r)).join(', ')} can tap “${el.label}” on ${e.name}, but can't open ${t.name}.`,'The button shows to people who are then blocked.',{t:'element',id:e.id,el:el.id},`Either hide “${el.label}” from ${blocked.map(r=>roleName(p,r)).join(', ')}, or add a permission check with a message.`)}
  for(const f of byKindP(p,'function')){if(!(f.perms||[]).length)continue;for(const c of inConns(p,f.id)){const pgx=p.entities[c.from.entity];if(!pgx||pgx.kind!=='page')continue;const who=pgx.roles.length?pgx.roles:p.roles.map(r=>r.id);if(!who.some(r=>f.perms.includes(r)))add('contradictions',`Nobody who can see ${pgx.name} is allowed to run ${f.name}.`,'The button would never work.',{t:'entity',id:f.id},'')}}
  const texts=all.map(e=>({e,t:[e.desc,e.notes,e.rules,e.decisions,e.conditions].join('. ').toLowerCase()}));
  const priv=[],open=[];for(const x of texts){for(const m of x.t.matchAll(/\b(\w+?)s? (?:are|is|must be|should be|stay|stays) (?:private|secret|hidden)|only (?:the )?(?:\w+ )?can (?:see|view|read) (?:the |their )?(\w+?)s?\b/g))priv.push({e:x.e,noun:m[1]||m[2]});for(const m of x.t.matchAll(/(?:all users|everyone|anyone|all (?:\w+ )?users) can (?:see|view|read) (?:all |every |the )?(\w+?)s?\b/g))open.push({e:x.e,noun:m[1]})}
  for(const a of priv)for(const b of open)if(a.noun&&b.noun&&a.noun===b.noun)add('contradictions',`“${a.e.name}” says ${a.noun}s are private, but “${b.e.name}” says everyone can see them.`,'Both rules can\'t be true at the same time.',{t:'entity',id:b.e.id},`Resolve: maybe everyone sees their own ${a.noun}s, and only admins see all of them.`);
  // Design debt
  for(const e of pg){if(e.elements.length>12)add('debt',`${e.name} has ${e.elements.length} parts.`,'Too many things on one screen is hard to use and to build.',{t:'entity',id:e.id},`Split ${e.name} into two pages or tabs.`);
    const dests=new Set(e.elements.flatMap(x=>outConns(p,e.id,x.id).map(c=>c.to)));if(dests.size>8)add('debt',`${e.name} leads to ${dests.size} different places.`,'The page may be doing too many jobs.',{t:'entity',id:e.id},'')}
  for(const f of byKindP(p,'function')){const n=(f.steps||'').split('\n').filter(Boolean).length;if(n>10)add('debt',`${f.name} has ${n} steps.`,'Long functions are hard to test.',{t:'entity',id:f.id},`Split ${f.name} into smaller reusable functions.`)}
  for(let i=0;i<pg.length;i++)for(let j=i+1;j<pg.length;j++){const a=pg[i].elements.map(x=>normL(x.label)),b=pg[j].elements.map(x=>normL(x.label));if(a.length<3||b.length<3)continue;const same=a.filter(x=>b.includes(x)).length;if(same/Math.max(a.length,b.length)>=.8)add('debt',`${pg[i].name} and ${pg[j].name} have almost the same parts.`,'Duplicated screens drift apart over time.',{t:'entity',id:pg[j].id},`Turn the shared parts of ${pg[i].name} and ${pg[j].name} into one component.`)}
  for(const d of byKindP(p,'decision')){let depth=0,cur=d,seen=new Set();while(cur&&depth<6&&!seen.has(cur.id)){seen.add(cur.id);const nx=condAnswers(p,cur).map(k=>p.entities[k.to]).find(t=>t&&t.kind==='decision');if(!nx)break;depth++;cur=nx}if(depth>=3)add('debt',`${d.name} starts a chain of ${depth+1} decisions.`,'Deep branching is hard to follow and test.',{t:'entity',id:d.id},'')}
  for(const f of all){const t=[f.conditions,f.steps].join(' ');if(/\b(if|when)\b[^.]*\b(on|off|enabled|disabled|turned)\b/i.test(t)&&!outConns(p,f.id).some(c=>p.entities[c.to]&&p.entities[c.to].kind==='setting'))add('debt',`${f.name} mentions a switch in its text but isn't linked to a setting.`,'Hidden rules are easy to forget. A shared setting keeps them in one place.',{t:'entity',id:f.id},`Create a setting for the switch ${f.name} mentions and link it.`)}
  // Forgotten features
  for(const e of pg)if(!hasIn[e.id]&&p.startPageId!==e.id)add('forgotten',`${e.name} is never linked to.`,'Nobody can reach it.',{t:'entity',id:e.id},`Link ${e.name} from the right page, or remove it.`);
  for(const s of byKindP(p,'setting'))if(!settingRefs(p,s).ids.length)add('forgotten',`The setting ${s.name} isn't used anywhere.`,'',{t:'entity',id:s.id},'');
  for(const d of byKindP(p,'data'))if(!inConns(p,d.id).length&&!outConns(p,d.id).length)add('forgotten',`The data ${d.name} isn't read or saved by anything.`,'',{t:'entity',id:d.id},'');
  for(const c of byKindP(p,'component'))if(!usersOf(p,c.id).pages.length)add('forgotten',`The component ${c.name} isn't used on any page.`,'',{t:'entity',id:c.id},'');
  for(const e of all){const m=/(?:todo|to do|later|should add|need to add|we need|maybe add)[:\s]+([^.\n]{4,60})/i.exec([e.notes,e.desc].join('\n'));if(m)add('forgotten',`${e.name}'s notes mention “${m[1].trim()}”, which isn't on the map.`,'Ideas in notes get lost.',{t:'entity',id:e.id},`Add “${m[1].trim()}” to the map near ${e.name}.`)}
  for(const q of Object.values(S.projects))if(q.branchOf===p.id&&Date.now()-(q.updatedAt||0)>14*864e5)add('forgotten',`The design branch “${q.name}” hasn't been touched in two weeks.`,'Review it, merge it or delete it.',null,'');
  // Accessibility of the planned app
  for(const[sc,l] of allLookScopes(p)){const L=Object.assign({},LOOK_DEF,l);const lab=scopeLabel(p,sc==='app:'?'app:':sc);
    if(L.palette){for(const m of ['light','dark'])for(const c of paletteChecks(L.palette[m]||{}).filter(x=>!x.ok))add('a11y',`${lab} (${m}): ${c.lab} is ${c.r.toFixed(2)}:1, needs ${c.min}:1.`,'Low contrast is hard to read.',sc.startsWith('ent:')?{t:'entity',id:sc.slice(4)}:null,'')}
    else{const r=CL.contrast(CL.bestOn(L.primary),L.primary);if(r<4.5)add('a11y',`${lab}: text on the main colour is only ${r.toFixed(2)}:1.`,'Buttons will be hard to read.',null,'')}
    if((+L.text||100)<100)add('a11y',`${lab} uses small text (${L.text}%).`,'Small text is hard to read for many people.',null,'')}
  for(const e of pg){for(const el of e.elements){if(/^(click here|here|tap here|button|new button|link|more|go)$/i.test(el.label.trim())||!el.label.trim())add('a11y',`“${el.label||'(no label)'}” on ${e.name} doesn't say what it does.`,'Screen readers read labels on their own, so they need to make sense alone.',{t:'element',id:e.id,el:el.id},'');if(el.type==='image'&&/^(image|photo|picture|img)$/i.test(el.label.trim()))add('a11y',`An image on ${e.name} has no description.`,'Describe what it shows so screen readers can say it.',{t:'element',id:e.id,el:el.id},'')}
    if(e.pageType==='Form'&&e.elements.some(x=>x.type==='input')&&!e.elements.some(x=>outConns(p,e.id,x.id).some(c=>{const f=p.entities[c.to];return f&&f.kind==='function'&&((f.error||'').trim()||outConns(p,f.id).some(k=>k.type==='error'))})))add('a11y',`The form ${e.name} doesn't say what happens when something is filled in wrong.`,'People need clear error messages next to the field.',{t:'entity',id:e.id},`Add validation and error messages to ${e.name}.`)}
  return A;
}
const AREAS=[['problems','Problems'],['journeys','Missing journeys'],['consistency','Consistency'],['contradictions','Contradictions'],['debt','Design debt'],['forgotten','Forgotten'],['a11y','Accessibility']];
function healthHTML(p){
  const A=analyse(p);const iss=checkProject(p);S._issues=iss;S._health=A;const tab=S._htab||'problems';
  const counts={problems:iss.filter(i=>i.sev==='problem').length,...Object.fromEntries(Object.entries(A).map(([k,v])=>[k,v.length]))};
  let h=`<div class="tabs" role="tablist">${AREAS.map(([k,l])=>`<button role="tab" aria-selected="${tab===k}" class="${tab===k?'on':''}" data-act="htab" data-v="${k}">${l}<b class="count">${counts[k]}</b></button>`).join('')}</div>`;
  if(tab==='problems'){const pr=iss.filter(i=>i.sev==='problem'),ck=iss.filter(i=>i.sev==='check');
    h+=`<p class="help">${iss.length?`${pr.length} problem${pr.length===1?'':'s'} · ${ck.length} to look at`:'Nothing missing. Nice work.'}</p><div class="list">${iss.map((i,n)=>`<div class="li issue${i.sev==='check'?' check':''}"><span class="grow">${esc(i.msg)}</span>${i.ref?`<button class="btn small" data-act="issue-go" data-n="${n}">Show</button>`:''}${i.fix==='remove-conn'?`<button class="btn small" data-act="issue-fix" data-n="${n}">Remove</button>`:''}${i.ref&&i.ref.t==='element'?`<button class="btn small" data-act="issue-config" data-n="${n}">Set it up</button>`:''}</div>`).join('')}</div>`}
  else{const list=A[tab];h+=`<p class="help">${{journeys:'Gaps in what people can do: things a real user would expect.',consistency:'Places where the same thing looks or works differently.',contradictions:'Rules that can\'t both be true.',debt:'Choices likely to cause problems later.',forgotten:'Things that were planned but got disconnected.',a11y:'Checks for the app you\'re planning: contrast, labels and forms.'}[tab]}</p>
    ${tab==='contradictions'&&AI.sample?`<button class="btn small" data-act="ai-contra">${icon('sparkle')}Also check with Claude</button><div id="ai-contra"></div>`:''}
    <div class="list">${list.map((x,n)=>`<div class="li issue check"><span class="grow">${esc(x.msg)}${x.why?`<small>${esc(x.why)}</small>`:''}</span><span class="col-btns">${x.ref?`<button class="btn small" data-act="h-go" data-n="${n}">Show</button>`:''}${x.prompt?`<button class="btn small" data-act="h-fix" data-n="${n}">${icon('sparkle')}Suggest a fix</button>`:''}</span></div>`).join('')||'<p class="help">Nothing found here.</p>'}</div>`}
  h+=`<p class="help" style="margin-top:12px">FlowMate never fixes these by itself. Suggestions open Smart Action, which shows every change before you confirm.</p>`;
  return h;
}
Object.assign(ACT,{
  htab:d=>{S._htab=d.v;rerenderPanelKeep()},
  'h-go':d=>{const x=S._health[S._htab][+d.n];if(!x||!x.ref)return;select(x.ref.t==='element'?{t:'element',id:x.ref.id,el:x.ref.el,scroll:true}:{t:'entity',id:x.ref.id},{centre:true});if(window.innerWidth<=760){S.panel=null;renderPanel()}},
  'h-fix':d=>{const x=S._health[S._htab][+d.n];if(x&&x.ref)S.sel=x.ref.t==='element'?{t:'element',id:x.ref.id,el:x.ref.el}:{t:'entity',id:x.ref.id};openSmartAction(x.prompt)},
  'issue-config':d=>{const i=S._issues[+d.n];if(!i||!i.ref)return;select({t:'element',id:i.ref.id,el:i.ref.el,scroll:true},{centre:true});setTimeout(()=>{const s=document.querySelector(`#el-g-${i.ref.el}`);if(s){s.focus();toast('Pick where this button goes')}},250)},
  'ai-contra':async()=>{const box=$('#ai-contra');box.innerHTML='<p class="help">Asking Claude…</p>';
    try{const snap=projectSnapshot(S.p,'app');const r=await AI.sample.json(`You check app plans for contradictory requirements. Here is the saved plan:\n${snap}\nList requirements that cannot both be true. Reply JSON only: {"items":[{"a":"first rule","b":"second rule","why":"why they conflict","fix":"a possible resolution"}]}. Use an empty list if none. Only use facts from the plan.`);
      const it=(r&&r.items)||[];box.innerHTML=`<div class="list">${it.map(x=>`<div class="li issue check"><span class="grow">${esc(x.a)} ⟷ ${esc(x.b)}<small>${esc(x.why)} · Possible fix: ${esc(x.fix)}</small></span></div>`).join('')||'<p class="help">Claude found no contradictions.</p>'}</div>`}
    catch(e){box.innerHTML=`<p class="help">${esc(AI_ERR[e&&e.code]||"Claude couldn't check right now.")}</p>`}},
});

// =========================================================
// PROGRESS + TASKS
// =========================================================
const ST_W={Idea:0,New:.05,Planned:.1,'In progress':.4,Review:.75,Blocked:.3,Done:.9};
function progressOf(p){
  const iss=checkProject(p);const probIds=new Set(iss.filter(i=>i.sev==='problem'&&i.ref).map(i=>i.ref.id));
  const ents=Object.values(p.entities).filter(e=>e.status!=='Deprecated'&&['page','function','decision','component','data','setting'].includes(e.kind));
  const score=e=>{const a=e.acceptance||[];let s=a.length?a.filter(x=>x.done).length/a.length:(ST_W[e.status]??.1);if(a.length&&e.status!=='Done')s=Math.min(s,.95);if(e.status==='Done'&&(!a.length||a.every(x=>x.done)))s=Math.max(s,.9);if(e.status==='Done'&&!probIds.has(e.id)&&(!a.length||a.every(x=>x.done)))s=1;if(probIds.has(e.id))s=Math.min(s,.8);return s};
  const all=ents.length?ents.reduce((t,e)=>t+score(e),0)/ents.length:0;
  const pg=pages(p);const cov=new Set();(p.paths||[]).forEach(x=>x.steps.forEach(s=>cov.add(s.page)));
  const unlinked=pg.reduce((n,e)=>n+e.elements.filter(x=>EL_TYPES[x.type]&&EL_TYPES[x.type].act&&!outConns(p,e.id,x.id).length).length,0);
  const missing=byKindP(p,'function').filter(f=>!(f.steps||'').trim()).length+byKindP(p,'decision').filter(d=>condAnswers(p,d).length<2).length;
  const A=analyse(p);
  const mods=Object.values(p.modules).map(m=>{const l=ents.filter(e=>e.moduleId===m.id);return {m,n:l.length,v:l.length?l.reduce((t,e)=>t+score(e),0)/l.length:0}});
  return {overall:all,pages:pg.length,donePages:pg.filter(e=>e.status==='Done'&&(e.acceptance||[]).every(x=>x.done)).length,unlinked,missing,errors:iss.filter(i=>i.sev==='problem').length,untested:pg.filter(e=>!cov.has(e.id)).length,a11y:A.a11y.length,mods,score};
}
function progressHTML(p){
  const P=progressOf(p);const pct=Math.round(P.overall*100);const tasks=(p.tasks||[]).filter(t=>t.kind!=='test');
  const tile=(n,l,act)=>`<${act?`button data-act="${act}"`:'div'} class="tile-m"><b>${n}</b><span>${l}</span></${act?'button':'div'}>`;
  return `<div class="prog"><div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Overall progress"><i style="width:${pct}%"></i></div><b>${pct}% overall</b></div>
  <p class="help">Worked out from acceptance checks and problems found, not just from cards marked Done.</p>
  <div class="tiles">${tile(P.pages,'pages')}${tile(P.donePages,'pages finished')}${tile(P.unlinked,'buttons that do nothing','prog-check')}${tile(P.missing,'missing actions','prog-check')}${tile(P.errors,'problems','prog-check')}${tile(P.untested,'pages not tested','prog-tests')}${tile(P.a11y,'accessibility issues','prog-a11y')}</div>
  <div class="mod-h">By module</div><div class="list">${P.mods.map(x=>`<div class="li"><span class="grow">${esc(x.m.name)}<small>${x.n} cards</small></span><span class="mbar"><i style="width:${Math.round(x.v*100)}%"></i></span><b>${Math.round(x.v*100)}%</b></div>`).join('')}</div>
  <div class="mod-h">Development checklist <span class="count">${tasks.filter(t=>t.done).length}/${tasks.length}</span></div>
  <div class="row-btns"><button class="btn small primary" data-act="task-gen">${icon('sparkle')}Make checklist from the map</button><button class="btn small" data-act="task-add">${icon('plus')}Add task</button>${tasks.length?`<button class="btn small" data-act="task-export">${icon('download')}Export</button>`:''}</div>
  <div class="list">${tasks.map(t=>`<div class="li"><button class="cbx${t.done?' on':''}" data-act="task-tick" data-id="${t.id}" aria-pressed="${!!t.done}" aria-label="${t.done?'Done':'Not done'}">${t.done?'✓':''}</button><span class="grow${t.done?' strike':''}">${esc(t.text)}${t.ref&&p.entities[t.ref]?`<small>${esc(KINDS[p.entities[t.ref].kind].label)}: ${esc(p.entities[t.ref].name)}</small>`:''}</span>${t.ref&&p.entities[t.ref]?`<button class="btn small ghost" data-act="jump" data-id="${t.ref}">Show</button>`:''}<button class="mini" data-act="task-del" data-id="${t.id}" aria-label="Remove task">${icon('trash')}</button></div>`).join('')||'<p class="help">No tasks yet.</p>'}</div>`;
}
function genTasks(p){
  const out=[];const T=(text,ref)=>out.push({text,ref});
  for(const m of Object.values(p.modules).sort((a,b)=>a.order-b.order)){for(const e of pages(p).filter(x=>x.moduleId===m.id)){T(`Build the ${e.name} page (${e.pageType}, ${e.elements.length} parts)`,e.id);for(const el of e.elements)for(const c of outConns(p,e.id,el.id)){const t=p.entities[c.to];if(t)T(`Connect “${el.label}” on ${e.name} to ${t.name}`,e.id)}}}
  for(const e of pages(p).filter(x=>!x.moduleId||!p.modules[x.moduleId]))T(`Build the ${e.name} page`,e.id);
  for(const f of byKindP(p,'function'))T(`Implement ${f.name}${f.steps?` (${f.steps.split('\n').filter(Boolean).length} steps)`:''}`,f.id);
  for(const d of byKindP(p,'decision'))T(`Code the check “${d.name}” and each answer`,d.id);
  for(const s of byKindP(p,'setting'))T(`Add the setting ${s.key||s.name} (default ${s.defaultValue})${(s.overrides||[]).length?` with ${s.overrides.length} override(s)`:''}`,s.id);
  for(const d of byKindP(p,'data'))T(`Create the ${d.name} data model${d.storage?' in '+d.storage.toLowerCase():''}`,d.id);
  for(const c of byKindP(p,'component'))T(`Build the shared ${c.name} component`,c.id);
  for(const r of p.roles)T(`Set up permissions for ${r.name}`,null);
  for(const x of p.paths||[])T(`Test the journey “${x.name}”`,x.steps[0]&&x.steps[0].page);
  for(const f of byKindP(p,'function'))if(outConns(p,f.id).some(c=>c.type==='error')||f.error)T(`Test error handling in ${f.name}`,f.id);
  return out;
}
Object.assign(ACT,{
  'task-gen':()=>{const p=S.p;const have=new Set(p.tasks.map(t=>t.text+'|'+(t.ref||'')));const nu=genTasks(p).filter(t=>!have.has(t.text+'|'+(t.ref||'')));
    if(!nu.length)return toast('The checklist is already up to date');commit(`Add ${nu.length} tasks from the map`,p=>{for(const t of nu)p.tasks.push({id:uid('tk'),kind:'task',text:t.text,ref:t.ref||null,done:false,at:Date.now(),auto:true})});toast(`Added ${nu.length} task${nu.length===1?'':'s'}`)},
  'task-add':()=>openModal({title:'Add task',ic:'plus',body:`<div class="field"><label for="tk-t">Task</label><input id="tk-t" class="inp"></div>`,actions:[{label:'Cancel',run:closeModal},{label:'Add',primary:true,run:()=>{const t=$('#tk-t').value.trim();if(!t)return;closeModal();commit('Add task',p=>{p.tasks.push({id:uid('tk'),kind:'task',text:t,ref:S.sel&&S.sel.t!=='conn'?S.sel.id:null,done:false,at:Date.now()})})}}]}),
  'task-tick':d=>commit('Tick task',p=>{const t=p.tasks.find(x=>x.id===d.id);if(t){t.done=!t.done;t.doneAt=t.done?Date.now():null}}),
  'task-del':d=>commit('Remove task',p=>{p.tasks=p.tasks.filter(x=>x.id!==d.id)}),
  'task-export':()=>{const p=S.p;download(`${p.name.replace(/\W+/g,'-').toLowerCase()}-checklist.md`,`# ${p.name}: development checklist\n\n`+p.tasks.filter(t=>t.kind!=='test').map(t=>`- [${t.done?'x':' '}] ${t.text}${t.ref&&p.entities[t.ref]?` _(${p.entities[t.ref].name})_`:''}`).join('\n')+'\n')},
  'prog-check':()=>{S.panel='check';S._htab='problems';renderPanel();renderSidebar()},
  'prog-tests':()=>{S.panel='testing';renderPanel();renderSidebar()},
  'prog-a11y':()=>{S.panel='check';S._htab='a11y';renderPanel();renderSidebar()},
});

// =========================================================
// FEATURE PASSPORT + PLAIN-ENGLISH LOGIC
// =========================================================
function logicViews(p,e,tech){
  const outs=outConns(p,e.id),ins=inConns(p,e.id);const steps=(e.steps||'').split('\n').filter(Boolean);
  const starters=ins.map(c=>connFromLabel(p,c));const pagesAfter=outs.map(c=>p.entities[c.to]).filter(t=>t&&t.kind==='page').map(t=>t.name);
  if(e.kind==='decision'){const ans=condAnswers(p,e);return {user:`The app checks something for you: “${e.name}”. You don't see the check, only where you end up.`,app:`It looks at ${decisionSetting(p,e)?'the setting '+decisionSetting(p,e).name:'the current situation'} and then ${ans.map(k=>`if ${k.label||'the answer is '+entityLabel(p,k.to)}, goes to ${entityLabel(p,k.to)}`).join('; ')||'has no answers yet'}.`,dev:tech?`Branch node ${e.id}. Inputs: ${decisionSetting(p,e)?'setting '+(decisionSetting(p,e).key||decisionSetting(p,e).name):'n/a'}. Outputs: ${ans.map(k=>`${JSON.stringify(k.label||'')} → ${k.to}`).join(', ')||'none'}.`:`Write an if/else with one branch per answer: ${ans.map(k=>k.label||'?').join(', ')}.`}}
  const user=`${starters.length?'You '+(starters[0].includes('›')?'tap '+starters[0].split('›').pop().trim()+' on '+starters[0].split('›')[0].trim():'start it from '+starters[0]):'You start it'}. ${e.success?'When it works: '+e.success+'.':''} ${pagesAfter.length?'Then you see '+pagesAfter.join(' or ')+'.':''} ${e.error?'If it fails: '+e.error+'.':''}`.replace(/\s+/g,' ');
  const app=steps.length?`The app: ${steps.map((s,i)=>`${i+1}) ${s}`).join(' ')}`:'No steps written yet.';
  const dev=tech?`Function ${e.id}${e.actionType?' ['+e.actionType+']':''}. Trigger: ${e.trigger||'?'}. Inputs: ${(e.inputs||'none').replace(/\n/g,', ')}. Preconditions: ${(e.preconditions||'none').replace(/\n/g,'; ')}. Permissions: ${(e.perms||[]).map(r=>roleName(p,r)).join(', ')||'any'}. Data: ${(e.dataOps||outs.filter(c=>p.entities[c.to]&&p.entities[c.to].kind==='data').map(c=>c.type+' '+entityLabel(p,c.to)).join(', ')||'none').replace(/\n/g,'; ')}. Output: ${e.output||'none'}. Errors: ${e.error||'not defined'}.`
    :`Build a ${e.actionType?e.actionType.toLowerCase()+' ':''}action that ${steps.length?steps.join(', then ').toLowerCase():'(steps not written yet)'}. ${e.error?'Handle failure by: '+e.error+'.':'Decide what happens on failure.'}`;
  return {user,app,dev};
}
function passportData(p,e){
  const ins=inConns(p,e.id),outs=outConns(p,e.id);const R=impactOf(p,e.id);
  const where=[...new Set(ins.map(c=>p.entities[c.from.entity]).filter(x=>x&&x.kind==='page').map(x=>x.name))];
  const who=e.kind==='page'?(e.roles.length?e.roles.map(r=>roleName(p,r)):['Everyone']):e.perms&&e.perms.length?e.perms.map(r=>roleName(p,r)):[...new Set(ins.flatMap(c=>{const x=p.entities[c.from.entity];return x&&x.kind==='page'?(x.roles.length?x.roles.map(r=>roleName(p,r)):['Everyone']):[]}))];
  const data=[...new Set(outs.concat(ins).map(c=>p.entities[c.to===e.id?c.from.entity:c.to]).filter(x=>x&&x.kind==='data').map(x=>x.name))];
  const sets=[...new Set([...R.settings].map(i=>entityLabel(p,i)).concat(outs.map(c=>p.entities[c.to]).filter(x=>x&&x.kind==='setting').map(x=>x.name)))];
  const errs=[e.error,...outs.filter(c=>c.type==='error').map(c=>'Goes to '+entityLabel(p,c.to)+(c.label?' ('+c.label+')':''))].filter(Boolean);
  const tests=(p.paths||[]).filter(x=>x.steps.some(s=>s.page===e.id||s.via===e.id)||R.tests.includes(x.id)).map(x=>x.name).concat((p.tasks||[]).filter(t=>t.kind==='test'&&t.ref===e.id).map(t=>t.text));
  const acc=e.acceptance||[];
  return [['What it does',e.desc||KINDS[e.kind].plain],['Why it exists',e.why||'Not written yet'],['Who can use it',who.join(', ')||'Not set'],['Where it appears',where.join(', ')||(e.kind==='page'?'It is a page itself':'Not used on a page yet')],['Related pages',[...R.pages].map(i=>entityLabel(p,i)).join(', ')||'None'],['Data it needs',data.join(', ')||'None'],['Settings it depends on',sets.join(', ')||'None'],['Error conditions',errs.join('; ')||'Not defined'],['Design rules',e.rules||'None written'],['Progress',`${e.status}${e.priority?' · '+e.priority+' priority':''}${e.owner?' · '+e.owner:''}${acc.length?` · ${acc.filter(a=>a.done).length}/${acc.length} checks done`:''}`],['Test cases',tests.join('; ')||'None yet'],['Decisions',e.decisions||'None recorded']];
}
function passportMD(p,e){const d=passportData(p,e);const L=(e.kind==='function'||e.kind==='decision')?logicViews(p,e,true):null;
  return `# Feature Passport: ${e.name}\n\nID: \`${e.id}\` · ${KINDS[e.kind].label}${p.modules[e.moduleId]?' · Module: '+p.modules[e.moduleId].name:''}\n\n`+d.map(([k,v])=>`## ${k}\n\n${v}\n`).join('\n')+((e.acceptance||[]).length?`\n## Acceptance checks\n\n${e.acceptance.map(a=>`- [${a.done?'x':' '}] ${a.text}`).join('\n')}\n`:'')+(L?`\n## Plain-English logic\n\n**What the user sees:** ${L.user}\n\n**What the app does:** ${L.app}\n\n**What the developer needs:** ${L.dev}\n`:'')+`\n_Generated by FlowMate from the saved project. This is a plan, not finished code._\n`}
function passportModal(id){
  const p=S.p,e=p.entities[id];let tech=false;
  const body=()=>{const d=passportData(p,e);const L=(e.kind==='function'||e.kind==='decision')?logicViews(p,e,tech):null;
    return `<dl class="pp">${d.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${L?`<div class="mod-h">Plain-English logic</div><div class="chips"><button class="${tech?'':'on'}" aria-pressed="${!tech}" data-pp-tech="0">Beginner</button><button class="${tech?'on':''}" aria-pressed="${tech}" data-pp-tech="1">Technical</button></div><dl class="pp"><dt>What the user sees</dt><dd>${esc(L.user)}</dd><dt>What the app does</dt><dd>${esc(L.app)}</dd><dt>What the developer needs</dt><dd>${esc(L.dev)}</dd></dl>`:''}`};
  openModal({title:'Feature Passport',sub:`${KINDS[e.kind].label}: ${e.name}`,ic:'file',wide:true,body:`<div id="pp-b">${body()}</div>`,
    actions:[{label:'Close',run:closeModal},{label:'Hand off this feature',icon:'download',run:()=>download(`${e.name.replace(/\W+/g,'-').toLowerCase()}-handoff.md`,passportMD(p,e)+'\n\n## Machine-readable\n\n```json\n'+JSON.stringify(featureSubset(p,e.id),null,2)+'\n```\n')},{label:'Download passport',primary:true,icon:'download',run:()=>download(`${e.name.replace(/\W+/g,'-').toLowerCase()}-passport.md`,passportMD(p,e))}],
    onOpen:m=>m.firstElementChild.addEventListener('click',ev=>{const b=ev.target.closest('[data-pp-tech]');if(b){tech=b.dataset.ppTech==='1';$('#pp-b').innerHTML=body()}})});
}
function featureSubset(p,id){const R=impactOf(p,id);const ids=new Set([id,...R.pages,...R.functions,...R.decisions,...R.components,...R.data,...R.settings]);return {feature:id,entities:[...ids].map(i=>p.entities[i]).filter(Boolean),connections:Object.values(p.connections).filter(c=>ids.has(c.from.entity)&&ids.has(c.to))}}
ACT.passport=()=>{if(S.sel&&S.sel.t!=='conn')passportModal(S.sel.id)};

// =========================================================
// LIVING DOCUMENTATION
// =========================================================
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function docsFor(p){
  const docs=[];const pg=pages(p);
  docs.push({id:'overview',title:'App overview',text:`# ${p.name}\n\n${p.description||'No description yet.'}\n\nPlatforms: ${(p.platforms||[]).join(', ')}\nRoles: ${p.roles.map(r=>r.name).join(', ')}\nModules: ${Object.values(p.modules).map(m=>m.name).join(', ')}\nPages: ${pg.length} · Functions: ${byKindP(p,'function').length} · Settings: ${byKindP(p,'setting').length} · Data: ${byKindP(p,'data').length}\nFirst page: ${entityLabel(p,p.startPageId)}`});
  for(const e of pg)docs.push({id:e.id,title:'Page: '+e.name,ref:e.id,text:`# ${e.name}\n\nType: ${e.pageType}\nModule: ${(p.modules[e.moduleId]||{}).name||'none'}\nWho can see it: ${e.roles.length?e.roles.map(r=>roleName(p,r)).join(', '):'Everyone'}\nStatus: ${e.status}\n\n${e.desc||''}\n\n## Parts\n${e.elements.map(el=>{const cs=outConns(p,e.id,el.id);return `- ${el.label} (${(EL_TYPES[el.type]||{}).label||el.type})${cs.length?' → '+cs.map(c=>entityLabel(p,c.to)).join(', '):' → nothing yet'}`}).join('\n')||'- none'}\n\n## Reached from\n${inConns(p,e.id).map(c=>'- '+connFromLabel(p,c)).join('\n')||'- nothing'}`});
  for(const f of byKindP(p,'function'))docs.push({id:f.id,title:'Function: '+f.name,ref:f.id,text:`# ${f.name}\n\nTrigger: ${f.trigger||'?'}\nKind: ${f.actionType||'?'}\nWho can run it: ${(f.perms||[]).map(r=>roleName(p,r)).join(', ')||'anyone who can reach it'}\n\n## Steps\n${(f.steps||'').split('\n').filter(Boolean).map((s,i)=>`${i+1}. ${s}`).join('\n')||'Not written'}\n\nWhen it works: ${f.success||'?'}\nWhen it fails: ${f.error||'?'}\n\n## Links\n${outConns(p,f.id).map(c=>`- ${CONN[c.type]?CONN[c.type].label:c.type} → ${entityLabel(p,c.to)}`).join('\n')||'- none'}`});
  for(const x of p.paths||[])docs.push({id:x.id,title:'Journey: '+x.name,text:`# ${x.name}\n\n${x.steps.map((s,i)=>`${i+1}. ${entityLabel(p,s.page)}${s.choice?' (answer: '+s.choice+')':''}`).join('\n')}`});
  for(const d of docs){d.hash=hashStr(d.text);const r=p.docReviews[d.id];d.state=!r?'new':r.hash===d.hash?'ok':'review';d.old=r&&r.text}
  return docs;
}
function lineDiff(a,b){const A=String(a||'').split('\n'),B=b.split('\n');const add=B.filter(x=>!A.includes(x)),rem=A.filter(x=>!B.includes(x));return {add,rem}}
function docsHTML(p){const docs=docsFor(p);const n=docs.filter(d=>d.state!=='ok').length;
  return `<p class="help">These documents write themselves from your map and update as it changes. Mark one reviewed once you've checked it. If the map changes later, it shows “Needs review” with what changed.</p>
  <div class="row-btns"><button class="btn small" data-act="docs-review-all">${icon('check')}Mark all reviewed</button><button class="btn small" data-act="docs-export">${icon('download')}Download all (Markdown)</button></div>
  <div class="plain" style="margin-top:10px">${n?`<b>${n}</b> need${n===1?'s':''} a look.`:'Everything is reviewed and up to date.'}</div>
  <div class="list">${docs.map((d,i)=>`<button class="li" data-act="doc-open" data-i="${i}"><span class="grow">${esc(d.title)}<small>${d.state==='ok'?'Up to date':d.state==='new'?'Not reviewed yet':'Needs review: map changed'}</small></span><span class="chip ${d.state==='ok'?'st-done':d.state==='new'?'st-planned':'st-in-progress'}">${d.state==='ok'?'Reviewed':d.state==='new'?'New':'Review'}</span></button>`).join('')}</div>`}
Object.assign(ACT,{
  'doc-open':d=>{const p=S.p;const doc=docsFor(p)[+d.i];const df=doc.state==='review'?lineDiff(doc.old,doc.text):null;const hist=(p.activity||[]).filter(a=>doc.ref&&a.label.includes(entityLabel(p,doc.ref))).slice(-8).reverse();
    openModal({title:doc.title,sub:doc.state==='ok'?'Up to date':'Needs review',ic:'book',wide:true,body:`${df?`<div class="plain"><b>Changed since you last reviewed it</b>${df.add.map(x=>`<div class="d-add">+ ${esc(x)}</div>`).join('')}${df.rem.map(x=>`<div class="d-rem">− ${esc(x)}</div>`).join('')}</div>`:''}<pre class="out doc">${esc(doc.text)}</pre>${hist.length?`<div class="mod-h">Change history</div><ul class="roadmap help">${hist.map(a=>`<li>${esc(a.label)} · ${ago(a.at)}</li>`).join('')}</ul>`:''}`,
      actions:[{label:'Close',run:closeModal},{label:'Download',icon:'download',run:()=>download(doc.title.replace(/\W+/g,'-').toLowerCase()+'.md',doc.text)},{label:'Mark reviewed',primary:true,icon:'check',run:()=>{closeModal();commit('Review document “'+doc.title+'”',p=>{p.docReviews[doc.id]={hash:doc.hash,at:Date.now(),text:doc.text.slice(0,20000)}})}}]})},
  'docs-review-all':()=>{const docs=docsFor(S.p);commit('Mark all documents reviewed',p=>{for(const d of docs)p.docReviews[d.id]={hash:d.hash,at:Date.now(),text:d.text.slice(0,20000)}})},
  'docs-export':()=>{const p=S.p;download(`${p.name.replace(/\W+/g,'-').toLowerCase()}-docs.md`,docsFor(p).map(d=>d.text).join('\n\n---\n\n'))},
});

// =========================================================
// VISUAL DATA JOURNEY
// =========================================================
function dataJourneyModal(id){
  const p=S.p,d=p.entities[id];const writers=[],readers=[];
  for(const c of Object.values(p.connections)){if(c.to===id){const f=p.entities[c.from.entity];if(f)(c.type==='read'?readers:writers).push(f)}if(c.from.entity===id){const t=p.entities[c.to];if(t)readers.push(t)}}
  const origin=[...new Set(writers.flatMap(f=>f.kind==='page'?[f.name]:inConns(p,f.id).map(c=>connFromLabel(p,c))))];
  const shown=[...new Set(readers.flatMap(f=>f.kind==='page'?[f.name]:inConns(p,f.id).map(c=>p.entities[c.from.entity]).filter(x=>x&&x.kind==='page').map(x=>x.name).concat(outConns(p,f.id).map(c=>p.entities[c.to]).filter(x=>x&&x.kind==='page').map(x=>x.name))))];
  const exports=readers.filter(f=>/export|report|pdf|share|download/i.test(f.name+' '+(f.steps||''))).map(f=>f.name);
  const fails=writers.filter(f=>f.kind==='function').map(f=>f.error?`${f.name}: ${f.error}`:`${f.name}: not defined`);
  const box=(t,items,cls='')=>`<div class="dj-step ${cls}"><b>${t}</b>${items.length?items.map(x=>`<span>${esc(x)}</span>`).join(''):'<span class="muted">Nothing yet</span>'}</div>`;
  openModal({title:'Data journey',sub:d.name,ic:'flow',wide:true,body:`<div class="dj">${box('Starts at',origin)}${box('Saved by',[...new Set(writers.map(f=>f.name))])}${box('Stored',[`${d.name}${d.storage?' · '+d.storage:''}`,...(d.fields||'').split('\n').filter(Boolean).slice(0,6)],'store')}${box('Read by',[...new Set(readers.map(f=>f.name))])}${box('Shown on',shown)}${box('Exported in',exports)}</div>
  <dl class="pp"><dt>Kind of data</dt><dd>${esc(d.stateKind||'Not set')}</dd><dt>Where it's kept</dt><dd>${esc(d.storage||'Not set')}</dd><dt>Who can see it</dt><dd>${esc(d.access||'Not set')}</dd><dt>How long it's kept</dt><dd>${esc(d.retention||'Not set')}</dd><dt>If saving fails</dt><dd>${esc(fails.join('; ')||'Nothing saves it yet')}</dd></dl>`,actions:[{label:'Show on map',icon:'trace',run:()=>{closeModal();showRadius(id)}},{label:'Close',primary:true,run:closeModal}]});
}
ACT['data-journey']=()=>{if(S.sel)dataJourneyModal(S.sel.id)};

// =========================================================
// VOICE-GUIDED WALKTHROUGH
// =========================================================
const WT={steps:[],i:0,tts:null};
const STOP=new Set('show me what happens if a an the to i my when do does how is are you they we tenant landlord user users as on in of for and or it this that there with can'.split(' '));
function findStart(p,q){
  const words=normL(q).split(/\s+/).filter(w=>w.length>2&&!STOP.has(w));const stem=w=>w.replace(/(ing|ed|es|s)$/,'');const ws=words.map(stem);
  let best=null,bs=0;const score=t=>{const tw=normL(t).split(/\s+/).filter(Boolean).map(stem);return ws.filter(w=>tw.some(x=>x.startsWith(w)||w.startsWith(x))).length};
  for(const e of pages(p)){let s=score(e.name)*.8;if(s>bs){bs=s;best={id:e.id}}for(const el of e.elements){const sc=score(el.label);const s2=sc?sc+(outConns(p,e.id,el.id).some(c=>p.entities[c.to]&&p.entities[c.to].kind!=='page')?.5:outConns(p,e.id,el.id).length?.3:0):0;if(s2>bs){bs=s2;best={id:e.id,el:el.id}}}}
  for(const f of byKindP(p,'function')){const s=score(f.name)*.9;if(s>bs){bs=s;best={id:f.id}}}
  const role=p.roles.find(r=>normL(q).includes(normL(r.name).split(' ')[0]));
  return bs>0?Object.assign(best,{role:role&&role.id}):null;
}
function walkSteps(p,start){
  const out=[];const seen=new Set();const first=p.entities[start.id];
  out.push({id:start.id,el:start.el,conn:null});seen.add(start.id);
  let q=(start.el?outConns(p,start.id,start.el):outConns(p,start.id)).map(c=>({c,depth:1}));
  let pagesSeen=0;
  while(q.length&&out.length<12){const {c,depth}=q.shift();const t=p.entities[c.to];if(!t||seen.has(t.id))continue;seen.add(t.id);out.push({id:t.id,conn:c.id,via:c});
    if(t.kind!=='page'&&depth<6)q=q.concat(outConns(p,t.id).filter(k=>k.type!=='reference').map(k=>({c:k,depth:depth+1})));
    else if(t.kind==='page'&&++pagesSeen<3&&depth<6){const nx=t.elements.flatMap(el=>outConns(p,t.id,el.id)).filter(k=>{const x=p.entities[k.to];return x&&x.kind!=='page'}).slice(0,1);q=q.concat(nx.map(k=>({c:k,depth:depth+1})))}}
  return out;
}
function captionFor(p,st,i){const e=p.entities[st.id];const c=st.via;
  const how=c?(c.label?`“${c.label}”: `:'')+({navigate:'opens',modal:'pops up',trigger:'runs',read:'reads',write:'saves to',setting:'changes',condition:'leads to',permission:'checks access, then',notify:'notifies via',background:'later runs',api:'calls',workflow:'runs',back:'goes back to',error:'if it fails, goes to',reference:'uses'}[c.type]||'leads to'):'';
  if(i===0)return e.kind==='page'?`Start on ${e.name}${st.el?`. You tap “${(findElement(p,e.id,st.el)||{}).label}”.`:'.'}`:`It starts with ${e.name}.`;
  if(e.kind==='page')return `${how} the ${e.name} page (${e.pageType}, ${e.elements.length} parts).`;
  if(e.kind==='function')return `${how} ${e.name}. ${(e.steps||'').split('\n').filter(Boolean).slice(0,3).join(', ')||'No steps written yet.'}`;
  if(e.kind==='decision')return `${how} a check: ${e.name} ${condAnswers(p,e).map(k=>`${k.label||'?'} → ${entityLabel(p,k.to)}`).join(', ')}.`;
  return `${how} ${KINDS[e.kind].label.toLowerCase()} ${e.name}.`}
function walkthroughModal(){
  const has=!!AI.dict;
  openModal({title:'Walk me through it',sub:'Ask about a journey. FlowMate highlights it step by step.',ic:'play',body:`<div class="field sa-ask"><label for="sa-in">What do you want to see?</label><textarea id="sa-in" class="inp" rows="2" placeholder="e.g. Show me what happens if a tenant reports a repair">${esc(AI.text||'')}</textarea>${has?`<button class="mic" id="sa-mic" data-act="sa-mic" aria-pressed="false" aria-label="Talk instead of typing">${icon('mic')}</button>`:''}<p id="sa-partial" class="help"></p></div><label class="opt-line"><input type="checkbox" id="wt-speak"> Read the steps out loud</label>`,
    actions:[{label:'Cancel',run:closeModal},{label:'Show me',primary:true,icon:'play',run:()=>{const q=$('#sa-in').value.trim();const speak=$('#wt-speak').checked;if(!q)return;const p=S.p;const st=findStart(p,q);closeModal();AI.text='';
      if(!st)return toast("I couldn't match that to anything on the map. Try a button or page name.");WT.steps=walkSteps(p,st);WT.i=0;WT.speak=speak;WT.q=q;showWalk()}}]});
}
async function showWalk(){
  const p=S.p;const st=WT.steps[WT.i];if(!st)return endWalk();
  const ents=new Set(WT.steps.slice(0,WT.i+1).map(s=>s.id)),conns=new Set(WT.steps.slice(1,WT.i+1).map(s=>s.conn).filter(Boolean));
  S.trace={ents,conns,order:[],dir:'walk',start:{id:WT.steps[0].id,el:WT.steps[0].el||null}};renderCanvas();applyTraceClasses();centreOn(st.id,Math.max(S.view.z,.7));
  const cap=captionFor(p,st,WT.i);let w=$('#walk');if(!w){w=document.createElement('div');w.id='walk';w.setAttribute('role','region');w.setAttribute('aria-label','Walkthrough');$('#viewport').appendChild(w)}
  w.innerHTML=`<p class="wq">“${esc(WT.q)}”</p><p class="wc" aria-live="polite"><b>Step ${WT.i+1} of ${WT.steps.length}.</b> ${esc(cap)}</p><div class="row-btns"><button class="btn small" data-act="walk-prev" ${WT.i?'':'disabled'}>${icon('back')}Back</button><button class="btn small primary" data-act="walk-next">${WT.i<WT.steps.length-1?'Next':'Finish'}</button>${WT.ttsOK!==false?`<button class="btn small ghost" data-act="walk-say" aria-label="Read this step aloud">${icon('bell')}Read aloud</button>`:''}<button class="btn small ghost" data-act="walk-end">Close</button></div>`;
  if(WT.speak)sayIt(cap);
}
async function sayIt(text){try{if(!WT.tts&&window.claude&&window.claude.use)WT.tts=await window.claude.use('tts');if(WT.tts){await WT.tts.speak(text).catch(()=>{});return}}catch(e){}
  try{if('speechSynthesis' in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-AU';speechSynthesis.speak(u)}else WT.ttsOK=false}catch(e){WT.ttsOK=false}}
function endWalk(){const w=$('#walk');if(w)w.remove();S.trace=null;renderCanvas();applyTraceClasses();try{WT.tts&&WT.tts.stop();window.speechSynthesis&&speechSynthesis.cancel()}catch(e){}}
Object.assign(ACT,{walkthrough:walkthroughModal,'walk-next':()=>{if(WT.i<WT.steps.length-1){WT.i++;showWalk()}else endWalk()},'walk-prev':()=>{if(WT.i>0){WT.i--;showWalk()}},'walk-end':endWalk,'walk-say':()=>sayIt(captionFor(S.p,WT.steps[WT.i],WT.i))});
