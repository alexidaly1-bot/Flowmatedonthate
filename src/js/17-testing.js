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

