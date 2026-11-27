// =========================================================
// PHASE 2–5: shared model helpers
// =========================================================
const ACTION_TYPES=['Navigate','Open / close overlay','Save data','Update data','Delete data','Set variable','Toggle on / off','Validate form','Upload file','Download file','Send notification','Start timer','Call outside service (API)','Sign in / authenticate','Check access permission','Conditional branch','Repeat over a list','Call reusable function'];
const PRIORITIES=['','Low','Medium','High','Critical'];
const STATE_KINDS=['','Temporary page state','Shared component state','Global app state','Saved user preference','Sign-in state','Server record','Cached data','Offline changes waiting to sync'];
const STORAGE=['','On the phone only','Cloud database','File storage','Outside service','Not stored'];
const SCOPES=['Whole app','One module','One page','One component'];
/* Fill in anything an older project file is missing. Never removes data. */
function normalizeProject(p){
  if(!p||p._norm===2)return p;
  for(const k of ['comments','tasks','assets','savedSearches','activity','customStatuses','paths'])if(!Array.isArray(p[k]))p[k]=[];
  if(!p.palettes||typeof p.palettes!=='object')p.palettes={history:[],favourites:[]};
  p.palettes.history=p.palettes.history||[];p.palettes.favourites=p.palettes.favourites||[];
  if(!p.docReviews||typeof p.docReviews!=='object')p.docReviews={};
  if(!p.roles)p.roles=[];
  for(const e of Object.values(p.entities||{}))normE(e);
  for(const s of p.paths)if(!s.expect)s.expect='';
  Object.defineProperty(p,'_norm',{value:2,enumerable:false,writable:true});
  return p;
}
function normE(e){if(!e)return e;if(!Array.isArray(e.acceptance))e.acceptance=[];if(e.kind==='function'&&!Array.isArray(e.perms))e.perms=[];if(e.kind==='setting'){if(!Array.isArray(e.overrides))e.overrides=[];if(!SCOPES.includes(e.scope))e.scope='Whole app'}if(e.kind==='page'&&!Array.isArray(e.elements))e.elements=[];if(!Array.isArray(e.roles))e.roles=[];return e}
const _addEntity=addEntity;addEntity=function(p,kind,props){return normE(_addEntity(p,kind,props))};
const allStatuses=p=>STATUSES.concat((p&&p.customStatuses||[]).filter(s=>s&&!STATUSES.includes(s)));
function pages(p){return Object.values(p.entities).filter(e=>e.kind==='page')}
function byKindP(p,k){return Object.values(p.entities).filter(e=>e.kind===k)}
function roleName(p,id){return (p.roles.find(r=>r.id===id)||{}).name||'(removed role)'}
/* Pages and functions that point at an entity (from the page itself or one of its buttons) */
function usersOf(p,id){const pgs=new Set(),fns=new Set();for(const c of inConns(p,id)){const f=p.entities[c.from.entity];if(!f)continue;if(f.kind==='page')pgs.add(f.id);else fns.add(f.id)}return {pages:[...pgs],others:[...fns]}}

// ---------- Settings: scope, inheritance and overrides ----------
function settingTargets(p,scope){
  if(scope==='One module')return Object.values(p.modules).map(m=>['mod:'+m.id,m.name]);
  if(scope==='One page')return pages(p).map(e=>['page:'+e.id,e.name]);
  if(scope==='One component')return byKindP(p,'component').map(e=>['cmp:'+e.id,e.name]);
  return [];
}
function targetName(p,t){if(!t)return 'Whole app';const[k,id]=t.split(':');if(k==='mod')return 'Module: '+((p.modules[id]||{}).name||'(removed)');if(k==='role')return 'Role: '+roleName(p,id);return (k==='page'?'Page: ':'Component: ')+entityLabel(p,id)}
/* The value a setting has on one page: page override, then module override, then default.
   Returns null when the setting doesn't apply to that page at all (its scope is another page or module). */
function effectiveSetting(p,set,pageId,roleId){
  if(!set)return null;const pg=pageId&&p.entities[pageId];const ov=set.overrides||[];
  if(set.scope==='One page'&&set.scopeTarget&&pageId&&set.scopeTarget!=='page:'+pageId)return null;
  if(set.scope==='One module'&&set.scopeTarget&&pg&&set.scopeTarget!=='mod:'+pg.moduleId)return null;
  const find=t=>ov.find(o=>o.target===t);
  let o=roleId&&find('role:'+roleId);if(o)return o.value;
  o=pg&&find('page:'+pg.id);if(o)return o.value;
  o=pg&&pg.moduleId&&find('mod:'+pg.moduleId);if(o)return o.value;
  return set.defaultValue;
}
/* Everything that mentions a setting: links to/from it, and functions, decisions or links whose text uses its key or name */
function settingRefs(p,set){
  const ids=new Set(),conns=new Set();
  for(const c of Object.values(p.connections)){if(c.to===set.id||c.from.entity===set.id){conns.add(c.id);ids.add(c.to===set.id?c.from.entity:c.to)}}
  const keys=[set.key,set.name].filter(x=>x&&x.length>2).map(x=>x.toLowerCase());
  if(keys.length){
    for(const e of Object.values(p.entities)){if(e.id===set.id)continue;const t=[e.steps,e.conditions,e.preconditions,e.desc,e.dataOps,e.trigger].join(' ').toLowerCase();if(keys.some(k=>t.includes(k)))ids.add(e.id)}
    for(const c of Object.values(p.connections)){if(keys.some(k=>(c.condition||'').toLowerCase().includes(k))){conns.add(c.id);ids.add(c.from.entity)}}
  }
  return {ids:[...ids].filter(i=>p.entities[i]),conns:[...conns]};
}

// ---------- Change Radius ----------
/* Works out what a change to one item could touch, before it happens. */
function impactOf(p,id,kind){
  const R={pages:new Set(),functions:new Set(),decisions:new Set(),components:new Set(),data:new Set(),settings:new Set(),conns:new Set(),tests:[]};
  const addE=eid=>{const e=p.entities[eid];if(!e||eid===id)return;({page:R.pages,function:R.functions,decision:R.decisions,component:R.components,data:R.data,setting:R.settings})[e.kind].add(eid)};
  const pagesUsing=eid=>{for(const c of inConns(p,eid)){R.conns.add(c.id);const f=p.entities[c.from.entity];if(!f)continue;addE(f.id);if(f.kind!=='page')for(const c2 of inConns(p,f.id)){const g=p.entities[c2.from.entity];if(g&&g.kind==='page'){addE(g.id);R.conns.add(c2.id)}}}};
  if(kind==='role'){
    for(const e of Object.values(p.entities)){if((e.roles||[]).includes(id)||(e.perms||[]).includes(id))addE(e.id)}
    for(const s of byKindP(p,'setting'))if((s.overrides||[]).some(o=>o.target==='role:'+id))addE(s.id);
  }else{
    const e=p.entities[id];if(!e)return R;
    for(const c of outConns(p,id)){R.conns.add(c.id);addE(c.to)}
    pagesUsing(id);
    if(e.kind==='setting'){const r=settingRefs(p,e);r.ids.forEach(x=>{addE(x);pagesUsing(x)});r.conns.forEach(c=>R.conns.add(c));for(const o of e.overrides||[]){const[k,t]=o.target.split(':');if(k==='page'||k==='cmp')addE(t)}}
    if(e.kind==='function'||e.kind==='decision'){for(const c of outConns(p,id)){const t=p.entities[c.to];if(t&&(t.kind==='function'||t.kind==='decision'))for(const c2 of outConns(p,t.id)){addE(c2.to);R.conns.add(c2.id)}}}
  }
  const touched=new Set([id,...R.pages,...R.functions,...R.decisions,...R.components]);
  for(const path of p.paths||[]){if((path.steps||[]).some(s=>touched.has(s.page)||(s.via&&touched.has(s.via))))R.tests.push(path.id)}
  return R;
}
function impactCount(R){return R.pages.size+R.functions.size+R.decisions.size+R.components.size+R.data.size+R.settings.size+R.tests.length}
function impactSummary(R,what){
  const parts=[[R.pages.size,'page'],[R.functions.size,'function'],[R.decisions.size,'decision'],[R.components.size,'component'],[R.data.size,'data item'],[R.settings.size,'setting'],[R.tests.length,'test scenario']].filter(x=>x[0]).map(([n,w])=>`${n} ${w}${n===1?'':'s'}`);
  if(!parts.length)return `Changing ${what} doesn't affect anything else.`;
  return `Changing ${what} may affect ${parts.length>1?parts.slice(0,-1).join(', ')+' and '+parts.slice(-1):parts[0]}.`;
}
function impactListHTML(p,R){
  const grp=(label,set)=>set.size?`<div class="mod-h">${label} <span class="count">${set.size}</span></div><div class="list">${[...set].map(i=>`<button class="li" data-act="radius-go" data-id="${i}">${icon(KINDS[p.entities[i].kind].icon)}<span class="grow">${esc(p.entities[i].name)}<small>${esc(KINDS[p.entities[i].kind].label)}</small></span></button>`).join('')}</div>`:'';
  return grp('Pages',R.pages)+grp('Functions',R.functions)+grp('Decisions',R.decisions)+grp('Components',R.components)+grp('Data',R.data)+grp('Settings',R.settings)+
    (R.tests.length?`<div class="mod-h">Test scenarios <span class="count">${R.tests.length}</span></div><div class="list">${R.tests.map(t=>{const x=p.paths.find(q=>q.id===t);return `<div class="li"><span class="grow">${esc(x?x.name:t)}<small>Run it again after the change</small></span></div>`}).join('')}</div>`:'');
}
function showRadius(id,kind){
  const p=S.p;const R=impactOf(p,id,kind);const name=kind==='role'?roleName(p,id):entityLabel(p,id);
  const ents=new Set([id,...R.pages,...R.functions,...R.decisions,...R.components,...R.data,...R.settings]);
  S.trace={ents,conns:R.conns,order:[name],dir:'radius',start:{id,el:null},summary:impactSummary(R,'“'+name+'”')};
  renderCanvas();applyTraceClasses();
}
/* Ask before a change that reaches other places. run() makes the change. */
function radiusConfirm(id,kind,verb,run,extraHTML=''){
  const p=S.p;const R=impactOf(p,id,kind);const name=kind==='role'?roleName(p,id):entityLabel(p,id);
  if(!impactCount(R)&&!extraHTML){run();return}
  openModal({title:`${verb} “${name}”?`,sub:'Change Radius',ic:'trace',wide:true,body:`<p class="cr-sum">${esc(impactSummary(R,'“'+name+'”'))}</p>${extraHTML}${impactListHTML(p,R)}<p class="help">Nothing changes until you confirm. Undo reverses it in one step.</p>`,
    actions:[{label:'Cancel',run:closeModal},{label:'Show on map',icon:'trace',run:()=>{closeModal();showRadius(id,kind)}},{label:verb,primary:true,run:()=>{closeModal();run()}}]});
}

// ---------- Hooks into existing behaviour ----------
const _openProject=openProject;
openProject=function(id,fit){normalizeProject(S.projects[id]);return _openProject(id,fit)};
const _pushUndo=pushUndo;
pushUndo=function(label,before){_pushUndo(label,before);if(S.p){normalizeProject(S.p);S.p.activity.push({at:Date.now(),label:String(label).slice(0,120)});if(S.p.activity.length>400)S.p.activity.splice(0,S.p.activity.length-400)}};
const _applyTrace=applyTraceClasses;
applyTraceClasses=function(){_applyTrace();const t=S.trace,bar=$('#traceBar');if(t&&t.dir==='radius'&&bar){bar.innerHTML=`${icon('trace')}<p><b>Change Radius</b><br>${esc(t.summary||'')}</p><button class="btn small" data-act="trace-clear">Clear</button>`}};
Object.assign(ACT,{
  status:d=>commit('Set status to '+d.v,p=>{const e=p.entities[S.sel.id];e.status=d.v;if(d.v==='Done'&&!e.completedAt)e.completedAt=Date.now();if(d.v!=='Done')e.completedAt=null}),
  'radius-go':d=>{closeModal();select({t:'entity',id:d.id},{centre:true})},
  radius:()=>{const s=S.sel;if(s&&s.t!=='conn')showRadius(s.id)},
  'role-radius':d=>{showRadius(d.id,'role');S.panel=null;renderPanel();renderSidebar()},
  'acc-add':()=>commit('Add acceptance check',p=>{normE(p.entities[S.sel.id]).acceptance.push({id:uid('ac'),text:'',done:false})}),
  'acc-tick':d=>commit('Tick acceptance check',p=>{const a=p.entities[S.sel.id].acceptance.find(x=>x.id===d.id);if(a)a.done=!a.done}),
  'acc-del':d=>commit('Remove acceptance check',p=>{const e=p.entities[S.sel.id];e.acceptance=e.acceptance.filter(x=>x.id!==d.id)}),
  'fn-perm':d=>commit('Change who can run it',p=>{const e=normE(p.entities[S.sel.id]);e.perms=e.perms.includes(d.v)?e.perms.filter(r=>r!==d.v):e.perms.concat(d.v)}),
  'ov-add':()=>{const p=S.p,set=normE(p.entities[S.sel.id]);const t=[...Object.values(p.modules).map(m=>['mod:'+m.id,'Module: '+m.name]),...pages(p).map(e=>['page:'+e.id,'Page: '+e.name]),...p.roles.map(r=>['role:'+r.id,'Role: '+r.name])].filter(([k])=>!set.overrides.some(o=>o.target===k));
    openModal({title:'Add an override',sub:set.name,ic:'sliders',body:`<div class="field"><label for="ov-t">Where it's different</label><select id="ov-t" class="inp">${t.map(([k,l])=>opt(k,'',l)).join('')}</select></div><div class="field"><label for="ov-v">Value there</label>${set.valueType==='On / off'?`<select id="ov-v" class="inp">${opt('On',isOnVal(set.defaultValue)?'Off':'On')}${opt('Off',isOnVal(set.defaultValue)?'Off':'On')}</select>`:`<input id="ov-v" class="inp" value="${esc(set.defaultValue)}">`}</div><p class="help">An override changes the value for one module, page or role. Everything else still follows the default.</p>`,
      actions:[{label:'Cancel',run:closeModal},{label:'Add override',primary:true,run:()=>{const tg=$('#ov-t').value,v=$('#ov-v').value;if(!tg)return;closeModal();commit('Add setting override',p=>{normE(p.entities[S.sel.id]).overrides.push({id:uid('ov'),target:tg,value:v})})}}]})},
  'ov-del':d=>commit('Remove setting override',p=>{const e=p.entities[S.sel.id];e.overrides=e.overrides.filter(o=>o.id!==d.id)}),
  'set-default':(d,b)=>{},
  'cmp-edit':()=>componentEditModal(S.sel.id),
});
const _del=ACT['del-entity'];
ACT['del-entity']=function(){const e=S.p.entities[S.sel&&S.sel.id];if(!e)return;const R=impactOf(S.p,e.id);if(impactCount(R)>1&&['setting','component','function','data','decision'].includes(e.kind)){radiusConfirm(e.id,null,'Delete',()=>{commit(`Delete “${e.name}”`,p=>removeEntity(p,e.id));S.sel=null;renderAll();toast(`Deleted “${e.name}”`,{label:'Undo',run:undo})})}else _del()};
const _roleDel=ACT['role-del'];
ACT['role-del']=function(d){const R=impactOf(S.p,d.id,'role');if(impactCount(R))radiusConfirm(d.id,'role','Remove',()=>commit('Remove role',p=>{p.roles=p.roles.filter(r=>r.id!==d.id);for(const e of Object.values(p.entities)){if(e.roles)e.roles=e.roles.filter(r=>r!==d.id);if(e.perms)e.perms=e.perms.filter(r=>r!==d.id);if(e.overrides)e.overrides=e.overrides.filter(o=>o.target!=='role:'+d.id)}}));else _roleDel(d)};
/* Setting default value: change through Change Radius so you see what it reaches */
document.addEventListener('change',ev=>{
  const t=ev.target;
  if(t.matches('[data-set-default]')&&S.p){const set=S.p.entities[t.dataset.setDefault];const v=t.value;const old=set.defaultValue;t.value=old;
    radiusConfirm(set.id,null,'Change',()=>commit(`Change “${set.name}” default to ${v}`,p=>{p.entities[set.id].defaultValue=v}),`<p>Default value: <b>${esc(old)}</b> → <b>${esc(v)}</b>. Pages without an override will use the new value, and Play will behave differently.</p>`)}
  if(t.matches('[data-set-scope]')&&S.p){const v=t.value;const set=S.p.entities[t.dataset.setScope];commit('Change setting scope',p=>{const e=p.entities[set.id];e.scope=v;e.scopeTarget=v==='Whole app'?'':(settingTargets(p,v)[0]||[''])[0]})}
  if(t.matches('[data-set-target]')&&S.p){const v=t.value;commit('Change where the setting applies',p=>{p.entities[S.sel.id].scopeTarget=v})}
  if(t.matches('[data-pf]')&&S.p){const v=t.value;const f=t.dataset.pf;commit('Change '+f,p=>{p.entities[S.sel.id][f]=v})}
});
document.addEventListener('input',ev=>{const t=ev.target;if(!S.p)return;
  if(t.matches('[data-acc]')){const a=(S.p.entities[S.sel.id].acceptance||[]).find(x=>x.id===t.dataset.acc);if(a)a.text=t.value}
  if(t.matches('[data-pscope]')){S.p[t.dataset.pscope]=t.value}
});
document.addEventListener('change',ev=>{const t=ev.target;if(!S.p)return;
  if(t.matches('[data-acc],[data-pscope]')){if(S.editBefore&&S.editBefore!==JSON.stringify(S.p)){pushUndo('Edit text',S.editBefore);touch()}S.editBefore=JSON.stringify(S.p);if(t.dataset.pscope==='customStatusText'){commit('Change custom statuses',p=>{p.customStatuses=String(p.customStatusText||'').split(',').map(s=>s.trim()).filter(Boolean).slice(0,12)})}}
});

// ---------- Extra editor sections ----------
function editorExtraHTML(p,e){normE(e);normalizeProject(p);
  const F=(f,extra='')=>`data-f="${f}" data-scope="entity" data-id="${e.id}" ${extra}`;let b='';
  if(e.kind==='function'){
    b+=`<div class="field"><label for="f-at">Kind of action</label><select id="f-at" class="inp" data-pf="actionType">${opt('',e.actionType||'','Pick one')}${ACTION_TYPES.map(t=>opt(t,e.actionType||'')).join('')}</select></div>`;
    b+=`<div class="field"><label for="f-purp">Purpose (why it exists)</label><input id="f-purp" class="inp" value="${esc(e.why||'')}" ${F('why')} placeholder="e.g. So landlords keep a record of repairs"></div>`;
    b+=`<div class="field"><label for="f-in">What it needs (inputs)</label><textarea id="f-in" class="inp" ${F('inputs')} placeholder="One per line, e.g. room photo">${esc(e.inputs||'')}</textarea></div>`;
    b+=`<div class="field"><label for="f-pre">Must be true first (preconditions)</label><textarea id="f-pre" class="inp" ${F('preconditions')} placeholder="e.g. User is signed in">${esc(e.preconditions||'')}</textarea></div>`;
    b+=`<div class="field"><span class="flabel">Who can run it</span><div class="chips">${p.roles.map(r=>{const on=(e.perms||[]).includes(r.id);return `<button class="${on?'on':''}" aria-pressed="${on}" data-act="fn-perm" data-v="${r.id}">${esc(r.name)}</button>`}).join('')}</div><p class="help">None picked means anyone who can reach it.</p></div>`;
    b+=`<div class="field"><label for="f-cond">Conditions</label><textarea id="f-cond" class="inp" ${F('conditions')} placeholder="e.g. If allowTenantMessaging is Off, stop">${esc(e.conditions||'')}</textarea></div>`;
    b+=`<div class="field"><label for="f-dops">Data it reads or changes</label><textarea id="f-dops" class="inp" ${F('dataOps')} placeholder="e.g. Save Repair request; read Room">${esc(e.dataOps||'')}</textarea></div>`;
    b+=`<div class="field"><label for="f-out">What it gives back (output)</label><input id="f-out" class="inp" value="${esc(e.output||'')}" ${F('output')}></div>`;
    const deps=outConns(p,e.id).map(c=>entityLabel(p,c.to)).concat(inConns(p,e.id).map(c=>connFromLabel(p,c)));
    b+=`<div class="plain"><b>Depends on / used by:</b> ${deps.length?esc([...new Set(deps)].join(', ')):'nothing linked yet'}</div>`;
  }
  if(e.kind==='setting'){
    const scopeSel=`<select id="f-sc2" class="inp" data-set-scope="${e.id}">${SCOPES.map(t=>opt(t,e.scope)).join('')}</select>`;
    const tg=settingTargets(p,e.scope);
    b+=`<div class="field"><label for="f-sc2">Applies to</label>${scopeSel}${tg.length?`<label class="sr" for="f-sct">Which one</label><select id="f-sct" class="inp" style="margin-top:8px" data-set-target="1">${tg.map(([k,l])=>opt(k,e.scopeTarget||'',l)).join('')}</select>`:''}</div>`;
    b+=`<div class="field"><label for="f-dv2">Default value</label>${e.valueType==='On / off'?`<select id="f-dv2" class="inp" data-set-default="${e.id}">${['On','Off'].map(v=>opt(v,isOnVal(e.defaultValue)?'On':'Off')).join('')}</select>`:`<input id="f-dv2" class="inp" value="${esc(e.defaultValue)}" ${F('defaultValue')}>`}<p class="help">Changing it shows what it reaches first.</p></div>`;
    b+=`<div class="sec-h">Overrides <span class="count">${e.overrides.length}</span></div>${e.overrides.map(o=>`<div class="li"><span class="grow">${esc(targetName(p,o.target))}<small>Value here: ${esc(o.value)}</small></span><button class="mini" data-act="ov-del" data-id="${o.id}" aria-label="Remove override">${icon('trash')}</button></div>`).join('')||'<p class="help">No overrides. Every place uses the default.</p>'}<button class="btn small" data-act="ov-add">${icon('plus')}Add override</button>`;
    const refs=settingRefs(p,e);const pgSet=new Set();refs.ids.forEach(i=>{const x=p.entities[i];if(x&&x.kind==='page')pgSet.add(i);usersOf(p,i).pages.forEach(q=>pgSet.add(q))});
    b+=`<div class="sec-h">Value on each page that uses it <span class="count">${pgSet.size}</span></div>${[...pgSet].map(pid=>{const v=effectiveSetting(p,e,pid);return `<button class="li" data-act="jump" data-id="${pid}"><span class="grow">${esc(entityLabel(p,pid))}<small>${v==null?'Not in scope here':'Value: '+esc(v)}</small></span></button>`}).join('')||'<p class="help">No page uses it yet. Link a function or decision to it.</p>'}`;
    b+=`<div class="plain"><b>Referenced by ${refs.ids.length} item${refs.ids.length===1?'':'s'}:</b> ${refs.ids.map(i=>esc(entityLabel(p,i))).join(', ')||'none yet'}</div>`;
  }
  if(e.kind==='data'){
    b+=`<div class="field"><label for="f-sk">Kind of state</label><select id="f-sk" class="inp" data-pf="stateKind">${STATE_KINDS.map(t=>opt(t,e.stateKind||'',t||'Pick one')).join('')}</select><p class="help">This describes the app you're planning. It's not a FlowMate setting.</p></div>`;
    b+=`<div class="field"><label for="f-stor">Where it's kept</label><select id="f-stor" class="inp" data-pf="storage">${STORAGE.map(t=>opt(t,e.storage||'',t||'Pick one')).join('')}</select></div>`;
    b+=`<div class="field"><label for="f-acc2">Who can see it</label><input id="f-acc2" class="inp" value="${esc(e.access||'')}" ${F('access')} placeholder="e.g. Only the tenant and landlord"></div>`;
    b+=`<div class="field"><label for="f-ret">How long it's kept</label><input id="f-ret" class="inp" value="${esc(e.retention||'')}" ${F('retention')} placeholder="e.g. 7 years for tax records"></div>`;
    b+=`<button class="btn small" data-act="data-journey">${icon('flow')}Show data journey</button>`;
  }
  if(e.kind==='component'){
    const u=usersOf(p,e.id);
    b+=`<div class="field"><label for="f-parts">Parts inside it (one per line)</label><textarea id="f-parts" class="inp" ${F('parts')} placeholder="e.g. Photo&#10;Title&#10;Price">${esc(e.parts||'')}</textarea></div>`;
    b+=`<div class="plain"><b>Used on ${u.pages.length} page${u.pages.length===1?'':'s'}:</b> ${u.pages.map(i=>esc(entityLabel(p,i))).join(', ')||'none yet. Link a page to it to reuse it.'}</div><button class="btn small" style="margin-top:8px" data-act="cmp-edit">${icon('pen')}Change everywhere (with preview)</button>`;
  }
  // Planning
  const acc=e.acceptance||[];const doneN=acc.filter(a=>a.done).length;
  b+=`<details class="plan"${acc.length||e.priority||e.owner?' open':''}><summary class="sec-h">Planning <span class="count">${acc.length?doneN+'/'+acc.length:''}</span></summary>
  <div class="field"><label for="f-pri">Priority</label><select id="f-pri" class="inp" data-pf="priority">${PRIORITIES.map(t=>opt(t,e.priority||'',t||'Not set')).join('')}</select></div>
  <div class="field"><label for="f-own">Owner</label><input id="f-own" class="inp" value="${esc(e.owner||'')}" ${F('owner')} placeholder="Who's building it"></div>
  <div class="field"><span class="flabel">Done when… (acceptance checks)</span>${acc.map(a=>`<div class="acc"><button class="cbx${a.done?' on':''}" data-act="acc-tick" data-id="${a.id}" aria-pressed="${a.done}" aria-label="${a.done?'Done':'Not done'}">${a.done?'✓':''}</button><label class="sr" for="acc-${a.id}">Check</label><input id="acc-${a.id}" class="inp" value="${esc(a.text)}" data-acc="${a.id}" placeholder="e.g. Saves a photo under 10 MB"><button class="mini" data-act="acc-del" data-id="${a.id}" aria-label="Remove check">${icon('trash')}</button></div>`).join('')}<button class="btn small" data-act="acc-add">${icon('plus')}Add check</button><p class="help">Progress is worked out from these checks, not just from Done.</p></div>
  ${e.kind!=='function'?`<div class="field"><label for="f-why">Why it exists</label><input id="f-why" class="inp" value="${esc(e.why||'')}" ${F('why')}></div>`:''}
  <div class="field"><label for="f-rules">Design rules</label><textarea id="f-rules" class="inp" ${F('rules')} placeholder="e.g. Always confirm before deleting">${esc(e.rules||'')}</textarea></div>
  <div class="field"><label for="f-dec">Decisions made</label><textarea id="f-dec" class="inp" ${F('decisions')} placeholder="e.g. Photos max 10 per room (decided 20 Nov)">${esc(e.decisions||'')}</textarea></div>
  ${e.completedAt?`<p class="help">Completed ${new Date(e.completedAt).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})}</p>`:''}
  ${(p.tasks||[]).filter(t=>t.ref===e.id).length?`<div class="flabel">Related tasks</div>${p.tasks.filter(t=>t.ref===e.id).map(t=>`<div class="li"><span class="grow">${t.done?'✓ ':''}${esc(t.text)}</span></div>`).join('')}`:''}
  </details>`;
  // Change Radius
  const R=impactOf(p,e.id);const n=impactCount(R);
  b+=`<div class="cr-box"><b>Change Radius</b><span>${esc(impactSummary(R,'this'))}</span>${n?`<button class="btn small" data-act="radius">${icon('trace')}Show on map</button>`:''}</div>`;
  return b;
}

// ---------- Shared component: change everywhere with preview ----------
function componentEditModal(id){
  const p=S.p,e=p.entities[id];const u=usersOf(p,id);
  openModal({title:'Change shared component',sub:e.name,ic:'component',wide:true,body:`<div class="field"><label for="ce-n">Name</label><input id="ce-n" class="inp" value="${esc(e.name)}"></div><div class="field"><label for="ce-p">Parts (one per line)</label><textarea id="ce-p" class="inp">${esc(e.parts||'')}</textarea></div><div class="field"><label for="ce-d">Description</label><textarea id="ce-d" class="inp">${esc(e.desc||'')}</textarea></div><div class="mod-h">Preview: what changes on each page <span class="count">${u.pages.length}</span></div><div id="ce-prev" class="list"></div>`,
    actions:[{label:'Cancel',run:closeModal},{label:`Change on ${u.pages.length} page${u.pages.length===1?'':'s'}`,primary:true,run:()=>{const n=$('#ce-n').value.trim()||e.name,pa=$('#ce-p').value,ds=$('#ce-d').value;closeModal();commit(`Change shared component “${n}”`,p=>{const x=p.entities[id];x.name=n;x.parts=pa;x.desc=ds})}}],
    onOpen:m=>{const upd=()=>{const n=$('#ce-n').value.trim()||e.name;const oldP=(e.parts||'').split('\n').filter(Boolean),newP=$('#ce-p').value.split('\n').filter(Boolean);const add=newP.filter(x=>!oldP.includes(x)),rem=oldP.filter(x=>!newP.includes(x));
      const ch=[n!==e.name?`renamed “${e.name}” → “${n}”`:'',add.length?'adds '+add.join(', '):'',rem.length?'removes '+rem.join(', '):''].filter(Boolean).join('; ')||'no visible change yet';
      $('#ce-prev').innerHTML=u.pages.map(pid=>`<div class="li"><span class="grow">${esc(entityLabel(p,pid))}<small>${esc(ch)}</small></span></div>`).join('')||'<p class="help">No page uses this component yet.</p>'};upd();m.firstElementChild.addEventListener('input',upd)}});
}

// ---------- Guided / direct mode ----------
if(S.prefs.guide==null)S.prefs.guide='guided';if(S.prefs.snap==null)S.prefs.snap=false;
const _applyPrefs=applyPrefs;
applyPrefs=function(){_applyPrefs();document.documentElement.setAttribute('data-guide',S.prefs.guide==='direct'?'direct':'guided')};

