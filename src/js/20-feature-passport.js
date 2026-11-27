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

