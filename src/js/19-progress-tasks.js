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

