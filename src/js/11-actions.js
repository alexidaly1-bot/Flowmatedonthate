// =========================================================
// ACTIONS
// =========================================================
function select(sel,opts={}){
  if(sel&&sel.t!=='conn'&&S.prefs.view==='screens'&&S.p.entities[sel.id]&&S.p.entities[sel.id].kind!=='page'){S.prefs.view='blocks';savePrefs();S.zl=0;renderMid();if(S.viewByMode&&S.viewByMode.blocks)S.view=S.viewByMode.blocks}
  S.sel=sel;if(!opts.keepTrace)S.trace=null;
  renderCanvas();renderEditor();
  if(opts.centre&&sel&&sel.t!=='conn')centreOn(sel.id);
  else if(sel&&sel.t!=='conn'&&window.innerWidth<=760){const g=S.geo[sel.id];if(g){const r=vp.getBoundingClientRect();const sy=g.y*S.view.z+S.view.y,sx=g.x*S.view.z+S.view.x;if(S.view.z<.5||sy>r.height*.28||sy<0||sx<0||sx>r.width-40)centreOn(sel.id,Math.max(S.view.z,.6))}}
}
function openProject(id,fit){
  S.p=S.projects[id];S.scrH={};S.viewByMode={};S.sel=null;S.trace=null;S.undo=[];S.redo=[];S.viewBack=[];
  Store.set('fm.last',id);hideHome();
  let v=null;try{v=JSON.parse(Store.get('fm.view.'+id)||'null')}catch(e){}
  if(v&&!fit){S.view=v}
  S.zl=0;applyView();renderAll();
  if(!v||fit)requestAnimationFrame(()=>{if(window.innerWidth<=760&&S.p.startPageId&&S.geo[S.p.startPageId]){const g=S.geo[S.p.startPageId];S.view={z:.6,x:20-g.x*.6,y:80-g.y*.6};applyView()}else fitAll()});
}
const ACT={
  home:()=>{closeSidebar();showHome()},'close-home':hideHome,'new-project':wizard,
  'open-project':d=>openProject(d.id),
  'dup-project':d=>{const p=clone(S.projects[d.id]);p.id=uid('prj');p.name+=' (copy)';p.createdAt=p.updatedAt=Date.now();S.projects[p.id]=p;saveLocal(p);queueCloud(p);renderHome();toast('Copied')},
  'del-project':d=>{const p=S.projects[d.id];confirmModal(`Delete “${p.name}”?`,`This removes the project from this device${Cloud.db?' and your account':''}. Export it first if you might want it back.`,'Delete project',()=>{delete S.projects[d.id];deleteLocal(d.id);deleteCloud(d.id);if(S.p&&S.p.id===d.id){S.p=null}renderHome();toast('Project deleted')})},
  import:()=>$('#fileIn').click(),
  details:()=>{closeSidebar();detailsModal()},export:()=>export2Modal(),
  'add-page':()=>{closeSidebar();addPageModal()},
  'add-menu':(d,btn)=>{const r=btn.getBoundingClientRect(),vr=vp.getBoundingClientRect();showDropMenu(r.left-vr.left,8,null,'Add a card')},
  'add-kind':d=>addKind(d.v),
  undo,redo,
  'zoom-in':()=>zoomBy(1.25),'zoom-out':()=>zoomBy(.8),'zoom-reset':()=>{const r=vp.getBoundingClientRect();zoomAt(r.width/2,r.height/2,1)},
  fit:fitAll,'fit-module':d=>{rememberView();fitTo(bounds(Object.values(S.p.entities).filter(e=>e.moduleId===d.id).map(e=>e.id)))},
  centre:d=>select({t:'entity',id:d.id},{centre:true}),
  'view-back':()=>{const v=S.viewBack.pop();if(v){S.view=v;applyView()}else toast('No earlier spot')},
  tidy:()=>{commit('Tidy up layout',p=>S.prefs.view==='screens'?screensLayout(p,true):autoLayout(p));requestAnimationFrame(fitAll)},
  complexity:d=>{S.prefs.complexity=d.v;savePrefs();renderMid();renderCanvas()},
  panel:d=>{S.panel=d.p==='canvas'||S.panel===d.p?null:d.p;closeSidebar();renderSidebar();renderPanel()},
  'toggle-sidebar':()=>{S.prefs.sidebar=!S.prefs.sidebar;savePrefs();renderSidebar();requestAnimationFrame(renderMinimap)},
  menu:()=>$('#sidebar').classList.toggle('open'),
  'search-mobile':()=>searchModal(),
  jump:d=>{select({t:'entity',id:d.id},{centre:true});if(window.innerWidth<=760){S.panel=null;renderPanel();renderSidebar()}},
  'sel-conn':d=>select({t:'conn',id:d.id}),
  'close-editor':()=>{S.sel=null;S.sheetTall=false;renderCanvas();renderEditor()},
  'sheet-size':()=>{S.sheetTall=!S.sheetTall;renderEditor()},
  status:d=>commit('Set status to '+d.v,p=>{p.entities[S.sel.id].status=d.v}),
  'card-view':d=>commit('Switch card view',p=>{p.entities[S.sel.id].view=d.v}),
  role:d=>commit('Change who can see the page',p=>{const e=p.entities[S.sel.id];e.roles=e.roles.includes(d.v)?e.roles.filter(r=>r!==d.v):[...e.roles,d.v]}),
  'role-add':()=>commit('Add role',p=>{p.roles.push({id:uid('role'),name:'New role'})}),
  'role-del':d=>{const n=Object.values(S.p.entities).filter(e=>e.roles&&e.roles.includes(d.id)).length;const run=()=>commit('Remove role',p=>{p.roles=p.roles.filter(r=>r.id!==d.id);for(const e of Object.values(p.entities))if(e.roles)e.roles=e.roles.filter(r=>r!==d.id)});n?confirmModal('Remove this role?',`${n} page${n===1?' uses':'s use'} it. They will be open to everyone instead.`,'Remove role',run):run()},
  'add-el':()=>{const el=commit('Add button',p=>addElement(p,S.sel.id,{label:'New button'}));if(el){S.sel={t:'element',id:S.sel.id,el:el.id,scroll:true};renderCanvas();renderEditor();const i=$('#el-l-'+el.id);i&&(i.focus(),i.select())}},
  'el-up':d=>commit('Move button up',p=>{const a=p.entities[S.sel.id].elements;const i=a.findIndex(x=>x.id===d.el);if(i>0)[a[i-1],a[i]]=[a[i],a[i-1]]}),
  'el-down':d=>commit('Move button down',p=>{const a=p.entities[S.sel.id].elements;const i=a.findIndex(x=>x.id===d.el);if(i<a.length-1)[a[i+1],a[i]]=[a[i],a[i+1]]}),
  'el-del':d=>{const id=S.sel.id;const el=findElement(S.p,id,d.el);const n=outConns(S.p,id,d.el).length;const run=()=>{commit(`Remove “${el.label}”`,p=>removeElement(p,id,d.el));S.sel={t:'entity',id};renderAll();toast(`Removed “${el.label}”`,{label:'Undo',run:undo})};n?confirmModal(`Remove “${el.label}”?`,`It has ${n} link${n===1?'':'s'}, which will be removed too.`,'Remove',run):run()},
  'conn-del':d=>{const c=S.p.connections[d.id];const lbl=connFromLabel(S.p,c)+' → '+entityLabel(S.p,c.to);commit('Remove link',p=>{delete p.connections[d.id]});if(S.sel&&S.sel.t==='conn'){S.sel={t:'entity',id:c.from.entity};renderAll()}toast('Removed link: '+lbl,{label:'Undo',run:undo})},
  'del-entity':()=>{const e=S.p.entities[S.sel.id];const links=inConns(S.p,e.id).length+outConns(S.p,e.id).length;const kids=descendants(S.p,e.id).size;
    confirmModal(`Delete “${e.name}”?`,`${links?`${links} link${links===1?'':'s'} to and from it will be removed. `:''}${kids?`${kids} card${kids===1?'':'s'} in its branch will stay, attached one level up. `:''}You can undo this.`,'Delete',()=>{commit(`Delete “${e.name}”`,p=>removeEntity(p,e.id));S.sel=null;renderAll();toast(`Deleted “${e.name}”`,{label:'Undo',run:undo})})},
  'dup-entity':()=>{const ne=commit('Duplicate card',p=>{const e=clone(p.entities[S.sel.id]);e.id=uid(e.kind.slice(0,3));e.name+=' copy';e.x+=40;e.y+=40;if(e.elements)e.elements=e.elements.map(el=>({...el,id:uid('el')}));p.entities[e.id]=e;nudgeFree(p,e);return e});ne&&select({t:'entity',id:ne.id})},
  'toggle-collapse':d=>commit((S.p.entities[d.id].collapsed?'Show':'Hide')+' branch',p=>{p.entities[d.id].collapsed=!p.entities[d.id].collapsed}),
  trace:d=>{const s=S.sel;S.trace=trace(S.p,{id:s.id,el:s.t==='element'?s.el:null},d.v);renderCanvas();if(window.innerWidth<=760){S.sel=null;renderEditor()}rememberView();fitTo(bounds([...S.trace.ents]))},
  'trace-conn':()=>{const c=S.p.connections[S.sel.id];S.trace=trace(S.p,{id:c.from.entity,el:c.from.element},'fwd');renderCanvas()},
  'trace-clear':()=>{S.trace=null;renderCanvas()},
  'dec-answer':d=>{const id=S.sel.id;showDropMenu(null,null,{entity:id,element:null,label:d.v},`Where does “${d.v}” go?`)},
  'link-new':()=>showDropMenu(null,null,{entity:S.sel.id,element:null},'Link to something new'),
  pref:d=>{let v=d.v;if(d.k==='textSize')v=+v;if(d.k==='contrast'||d.k==='snap')v=v==='true';S.prefs[d.k]=v;savePrefs();applyPrefs();renderPanel();requestAnimationFrame(()=>renderCanvas())},
  'issue-go':d=>{const i=S._issues[+d.n];if(!i||!i.ref)return;if(i.ref.t==='conn'){const c=S.p.connections[i.ref.id];select({t:'conn',id:i.ref.id});if(S.p.entities[c.from.entity])centreOn(c.from.entity)}else{select(i.ref.t==='element'?{t:'element',id:i.ref.id,el:i.ref.el,scroll:true}:{t:'entity',id:i.ref.id},{centre:true})}if(window.innerWidth<=760){S.panel=null;renderPanel()}},
  'issue-fix':d=>{const i=S._issues[+d.n];if(i&&i.fix==='remove-conn')commit('Remove broken link',p=>{delete p.connections[i.ref.id]})},
  'modal-close':closeModal,'modal-btn':d=>MODAL&&MODAL.actions[+d.i].run(),
  'w-plat':(d,btn)=>btn.classList.toggle('on'),
  'toast-act':()=>{const t=$('#toast');t.hidden=true;t._act&&t._act.run()},
  'quick-new':d=>quickNew(d.v),
  'quick-link':d=>quickLink(d.id),
};
function closeSidebar(){$('#sidebar').classList.remove('open')}

document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act]');
  if(!b){if(!ev.target.closest('#dropMenu'))hideDropMenu();if(!ev.target.closest('.search'))$('#qres').hidden=true;if(!ev.target.closest('#sidebar')&&!ev.target.closest('[data-act=menu]'))closeSidebar();return}
  if(b.disabled)return;
  const a=b.dataset.act;if(a!=='quick-new'&&a!=='quick-link'&&a!=='add-menu')hideDropMenu();
  const f=ACT[a];if(f){ev.preventDefault();f(b.dataset,b)}
});
$('#modal').addEventListener('click',ev=>{if(ev.target.id==='modal')closeModal();const o=ev.target.closest('.opt');if(o){$$('.opt',o.parentElement).forEach(x=>x.classList.toggle('on',x===o))}});

/* Field edits: update live while typing, save one undo step when the field is left. */
document.addEventListener('focusin',ev=>{if(ev.target.matches('[data-f]'))S.editBefore=JSON.stringify(S.p)});
document.addEventListener('input',ev=>{
  const t=ev.target;if(!t.matches('[data-f]')||!S.p)return;
  const d=t.dataset,p=S.p;
  if(d.scope==='entity'){const e=p.entities[d.id];if(e)e[d.f]=t.value}
  else if(d.scope==='element'){const el=findElement(p,d.id,d.el);if(el)el[d.f]=t.value}
  else if(d.scope==='conn'){const c=p.connections[d.id];if(c)c[d.f]=t.value}
  else if(d.scope==='role'){const r=p.roles.find(r=>r.id===d.id);if(r)r.name=t.value}
  renderCanvas();
});
document.addEventListener('change',ev=>{
  const t=ev.target;
  if(t.matches('[data-f]')&&S.p){if(S.editBefore&&S.editBefore!==JSON.stringify(S.p)){pushUndo('Edit '+(t.closest('.field')?.querySelector('label')?.textContent||'text').toLowerCase(),S.editBefore);touch();renderSidebar();if(S.panel==='check')renderPanel()}S.editBefore=JSON.stringify(S.p);return}
  const a=t.dataset.actChange;if(!a)return;const d=t.dataset,p=S.p;
  if(a==='el-type')commit('Change part type',p=>{findElement(p,S.sel.id,d.el).type=t.value});
  else if(a==='el-target'){
    const v=t.value,pageId=S.sel.id;
    if(v.startsWith('new:')){const kind=v.slice(4);const r=commit(`Branch new ${KINDS[kind].label.toLowerCase()}`,p=>branchNew(p,{entity:pageId,element:d.el},kind));if(r){S.sel={t:'element',id:pageId,el:d.el};renderAll();toast(`Made “${r.entity.name}” and linked it`,{label:'Open it',run:()=>select({t:'entity',id:r.entity.id},{centre:true})})}}
    else commit(v?'Link button':'Unlink button',p=>{const c=d.cid&&p.connections[d.cid];if(!v){if(c)delete p.connections[c.id];return}if(c){c.to=v;c.type=defaultType(p,pageId,v)}else addConn(p,{entity:pageId,element:d.el},v)});
  }
  else if(a==='conn-type')commit('Change link type',p=>{p.connections[d.id].type=t.value});
  else if(a==='conn-to'){const v=t.value;if(v.startsWith('new:')){const c=p.connections[d.id];commit('Re-link to new card',p=>{const r=branchNew(p,c.from,v.slice(4));delete p.connections[r.conn.id];p.connections[d.id].to=r.entity.id})}else if(v)commit('Change where the link goes',p=>{p.connections[d.id].to=v});else ACT['conn-del']({id:d.id})}
  else if(a==='module'){if(t.value==='__new'){openModal({title:'New module',ic:'layers',body:`<div class="field"><label for="nm">Module name</label><input id="nm" class="inp big" placeholder="e.g. Payments"></div>`,actions:[{label:'Cancel',run:()=>{closeModal();renderEditor()}},{label:'Add module',primary:true,run:()=>{const n=$('#nm').value.trim();if(!n)return;closeModal();commit('Add module “'+n+'”',p=>{const m=addModule(p,n);p.entities[S.sel.id].moduleId=m.id})}}]})}else commit('Change module',p=>{p.entities[S.sel.id].moduleId=t.value||null})}
  else if(a==='start')commit('Set first page',p=>{p.startPageId=t.checked?S.sel.id:(p.startPageId===S.sel.id?null:p.startPageId)});
  else if(a==='device')changeDevice(t.value);
  else if(a==='threshold'){const v=clamp(+t.value/100,.05,3);S.prefs.thresholds[+d.i]=v;S.prefs.thresholds.sort((a,b)=>a-b);savePrefs();S.zl=0;applyView()}
});

$('#fileIn').addEventListener('change',async ev=>{
  const f=ev.target.files[0];ev.target.value='';if(!f)return;
  try{const p=importJSON(await f.text());if(S.projects[p.id]){p.id=uid('prj');p.name+=' (imported)'}p.updatedAt=Date.now();S.projects[p.id]=p;saveLocal(p);queueCloud(p);openProject(p.id,true);toast('Imported “'+p.name+'”')}
  catch(e){openModal({title:"Couldn't import that file",ic:'alert',body:`<p>${esc(e.message)}</p><p class="help">Pick a .json file exported from FlowMate.</p>`,actions:[{label:'OK',primary:true,run:closeModal}]})}
});

// ---------- Drop menu (branch from a dot, or add a card) ----------
let DROP=null;
function showDropMenu(sx,sy,from,title,at){
  const m=$('#dropMenu');DROP={from,at};
  const r=vp.getBoundingClientRect();
  if(sx==null){sx=r.width/2-120;sy=r.height/3}
  const existing=from?Object.values(S.p.entities).filter(e=>e.id!==from.entity).sort((a,b)=>a.name.localeCompare(b.name)):[];
  m.innerHTML=`<h4>${esc(title)}</h4>${['page','function','decision','setting','data','component'].map(k=>`<button data-act="quick-new" data-v="${k}">${icon(KINDS[k].icon)}New ${KINDS[k].label.toLowerCase()}</button>`).join('')}${existing.length?`<h4>Or link to an existing card</h4><div style="max-height:200px;overflow:auto">${existing.map(e=>`<button data-act="quick-link" data-id="${e.id}">${icon(KINDS[e.kind].icon)}${esc(e.name)}</button>`).join('')}</div>`:''}`;
  m.hidden=false;
  m.style.left=clamp(sx,8,r.width-240)+'px';m.style.top=clamp(sy,8,Math.max(8,r.height-m.offsetHeight-8))+'px';
  m.querySelector('button').focus();
}
function hideDropMenu(){$('#dropMenu').hidden=true;DROP=null}
function quickNew(kind){
  const d=DROP;hideDropMenu();if(!d)return;
  if(!d.from){if(kind==='page')return addPageModal();return addKind(kind,d.at)}
  const r=commit(`Branch new ${KINDS[kind].label.toLowerCase()}`,p=>{const r=branchNew(p,d.from,kind,d.at?{x:d.at.x,y:d.at.y-30}:{});if(d.from.label){r.conn.label=d.from.label;if(p.entities[d.from.entity].kind==='decision')r.conn.type='condition'}return r});
  if(r){select({t:'entity',id:r.entity.id});setTimeout(()=>{const f=$('#f-name');f&&(f.focus(),f.select())},30)}
}
function quickLink(id){
  const d=DROP;hideDropMenu();if(!d||!d.from)return;
  const c=commit('Link to '+entityLabel(S.p,id),p=>{const c=addConn(p,d.from,id);if(d.from.label){c.label=d.from.label;if(p.entities[d.from.entity].kind==='decision')c.type='condition'}return c});
  c&&select({t:'conn',id:c.id});
}

// ---------- Search ----------
function searchItems(q){
  const p=S.p;q=q.trim().toLowerCase();if(!q||!p)return[];const res=[];
  for(const e of Object.values(p.entities)){
    const hay=[e.name,e.desc,e.key,e.notes,e.fields,e.steps,e.status,e.pageType,p.modules[e.moduleId]?.name].join(' ').toLowerCase();
    if(hay.includes(q))res.push({ref:{t:'entity',id:e.id},title:e.name,sub:KINDS[e.kind].label+(p.modules[e.moduleId]?' · '+p.modules[e.moduleId].name:''),ic:KINDS[e.kind].icon});
    if(e.elements)for(const el of e.elements)if(el.label.toLowerCase().includes(q))res.push({ref:{t:'element',id:e.id,el:el.id,scroll:true},title:el.label,sub:(EL_TYPES[el.type]?.label||'')+' on '+e.name,ic:EL_TYPES[el.type]?.icon||'section'});
  }
  if(/(do ?n.?t do|nothing|unlinked|no link|not connected|broken)/.test(q))for(const i of checkProject(p))if(i.ref&&i.ref.t!=='conn')res.unshift({ref:i.ref,title:i.msg,sub:'From Check',ic:'alert'});
  return res.slice(0,40);
}
function renderSearchResults(box,q){
  const res=searchItems(q);box._res=res;
  box.innerHTML=res.length?res.map((r,i)=>`<button data-i="${i}">${icon(r.ic)}<span>${esc(r.title)}<small>${esc(r.sub)}</small></span></button>`).join(''):`<p class="help" style="padding:10px">Nothing matches “${esc(q)}”. Try a page name, button label or setting key. Try “nothing” to find buttons that don't do anything.</p>`;
  box.hidden=!q.trim();
}
function goResult(r){select(r.ref,{centre:true});$('#qres').hidden=true}
$('#q').addEventListener('input',ev=>renderSearchResults($('#qres'),ev.target.value));
$('#q').addEventListener('keydown',ev=>{if(ev.key==='Enter'){const r=$('#qres')._res;r&&r[0]&&goResult(r[0])}if(ev.key==='Escape'){ev.target.value='';$('#qres').hidden=true;ev.target.blur()}});
$('#qres').addEventListener('click',ev=>{const b=ev.target.closest('button[data-i]');if(b)goResult($('#qres')._res[+b.dataset.i])});
function searchModal(){
  openModal({title:'Search',ic:'search',body:`<label for="mq" class="sr">Search</label><input id="mq" class="inp big" type="search" placeholder="Page, button, setting…"><div id="mqr" class="list" style="margin-top:10px"></div>`,actions:[],onOpen:m=>{const box=$('#mqr');$('#mq').addEventListener('input',e=>{renderSearchResults(box,e.target.value);box.hidden=false});box.addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(b){const r=box._res[+b.dataset.i];closeModal();select(r.ref,{centre:true})}})}});
}

