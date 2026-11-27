
// =========================================================
// CANVAS POWER TOOLS: multi-select, align, copy/paste, snap, presentation
// =========================================================
S.multi=new Set();
const SNAP=24;
function multiIds(){return [...S.multi].filter(id=>S.p&&S.p.entities[id])}
function renderMultiBar(){
  let bar=$('#mbar');const ids=multiIds();
  if(ids.length<2){if(bar)bar.remove();return}
  if(!bar){bar=document.createElement('div');bar.id='mbar';bar.className='overlay msbar';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Selected cards');$('#viewport').appendChild(bar)}
  const B=(a,l,t)=>`<button class="btn small ghost" data-act="${a}" title="${t||l}">${l}</button>`;
  bar.innerHTML=`<b>${ids.length} selected</b>${B('al-left','Left','Line up left edges')}${B('al-cx','Centre','Line up centres')}${B('al-top','Top','Line up tops')}${B('al-hd','↔ Space','Spread out evenly across')}${B('al-vd','↕ Space','Spread out evenly down')}${B('m-copy','Copy','Copy (Ctrl+C)')}${B('m-move','Module…','Move to a module')}${B('m-del','Delete')}${B('m-clear','✕','Clear selection')}`;
}
const _rc=renderCanvas;
renderCanvas=function(){_rc.apply(this,arguments);if(!S.p)return;for(const id of S.multi){const g=S.geo[id];if(g&&g.node)g.node.classList.add('msel')}renderMultiBar()};
function toggleMulti(id){if(S.multi.has(id))S.multi.delete(id);else S.multi.add(id);if(S.sel&&S.sel.t==='entity'&&!S.multi.has(S.sel.id)&&S.multi.size===1&&S.sel.id!==id)S.multi.add(S.sel.id);renderCanvas()}
function alignMulti(kind){
  const ids=multiIds().filter(id=>S.geo[id]);if(ids.length<2)return;const G=ids.map(id=>({id,g:S.geo[id]}));
  commit({left:'Line up left',cx:'Line up centres',top:'Line up tops',hd:'Spread across',vd:'Spread down'}[kind],p=>{
    const set=(id,x,y)=>setPos(p.entities[id],Math.round(x),Math.round(y));
    if(kind==='left'){const m=Math.min(...G.map(o=>o.g.x));G.forEach(o=>set(o.id,m,o.g.y))}
    if(kind==='cx'){const m=G.reduce((s,o)=>s+o.g.x+o.g.w/2,0)/G.length;G.forEach(o=>set(o.id,m-o.g.w/2,o.g.y))}
    if(kind==='top'){const m=Math.min(...G.map(o=>o.g.y));G.forEach(o=>set(o.id,o.g.x,m))}
    if(kind==='hd'){const s=G.slice().sort((a,b)=>a.g.x-b.g.x);const span=s[s.length-1].g.x+s[s.length-1].g.w-s[0].g.x;const tw=s.reduce((t,o)=>t+o.g.w,0);const gap=Math.max(24,(span-tw)/(s.length-1));let x=s[0].g.x;s.forEach(o=>{set(o.id,x,o.g.y);x+=o.g.w+gap})}
    if(kind==='vd'){const s=G.slice().sort((a,b)=>a.g.y-b.g.y);const span=s[s.length-1].g.y+s[s.length-1].g.h-s[0].g.y;const th=s.reduce((t,o)=>t+o.g.h,0);const gap=Math.max(24,(span-th)/(s.length-1));let y=s[0].g.y;s.forEach(o=>{set(o.id,o.g.x,y);y+=o.g.h+gap})}
  });
}
function copyCards(ids){
  const p=S.p;ids=ids.filter(i=>p.entities[i]);if(!ids.length)return;const set=new Set(ids);
  const clip={format:'flowmate-clip',entities:ids.map(i=>clone(p.entities[i])),connections:Object.values(p.connections).filter(c=>set.has(c.from.entity)&&set.has(c.to)).map(clone)};
  S.clip=clip;try{navigator.clipboard&&navigator.clipboard.writeText(JSON.stringify(clip)).catch(()=>{})}catch(e){}
  toast(`Copied ${ids.length} card${ids.length===1?'':'s'}`);
}
async function pasteCards(){
  let clip=S.clip;try{if(navigator.clipboard&&navigator.clipboard.readText){const t=await navigator.clipboard.readText();const o=JSON.parse(t);if(o&&o.format==='flowmate-clip')clip=o}}catch(e){}
  if(!clip||!clip.entities||!clip.entities.length)return toast('Nothing to paste. Copy some cards first.');
  const r=vp.getBoundingClientRect();const w=toWorld(r.left+r.width/2,r.top+r.height/2);const minX=Math.min(...clip.entities.map(e=>e.x)),minY=Math.min(...clip.entities.map(e=>e.y));
  const map={},elMap={};
  const made=commit(`Paste ${clip.entities.length} card${clip.entities.length===1?'':'s'}`,p=>{
    for(const e0 of clip.entities){const e=clone(e0);const nid=uid(e.kind.slice(0,3));map[e0.id]=nid;e.id=nid;e.x=Math.round(w.x+(e0.x-minX)-60);e.y=Math.round(w.y+(e0.y-minY)-40);if(!p.modules[e.moduleId])e.moduleId=(Object.values(p.modules)[0]||addModule(p,'Main')).id;if(e.parentId&&!clip.entities.some(x=>x.id===e.parentId))e.parentId=null;
      if(e.elements)e.elements=e.elements.map(el=>{const n=uid('el');elMap[e0.id+'|'+el.id]=n;return {...el,id:n}});if(S.p.entities[e0.id]&&S.p.entities[e0.id].name===e.name)e.name+=' copy';p.entities[nid]=e}
    for(const e of Object.values(p.entities))if(e.parentId&&map[e.parentId]&&Object.values(map).includes(e.id))e.parentId=map[e.parentId];
    for(const c0 of clip.connections){const c=clone(c0);c.id=uid('cn');c.from={entity:map[c0.from.entity],element:c0.from.element?elMap[c0.from.entity+'|'+c0.from.element]||null:null};c.to=map[c0.to];if(c.from.entity&&c.to)p.connections[c.id]=c}
    return Object.values(map)});
  if(made){S.multi=new Set(made);renderCanvas();toast('Pasted')}
}
Object.assign(ACT,{
  'al-left':()=>alignMulti('left'),'al-cx':()=>alignMulti('cx'),'al-top':()=>alignMulti('top'),'al-hd':()=>alignMulti('hd'),'al-vd':()=>alignMulti('vd'),
  'm-copy':()=>copyCards(multiIds()),'m-clear':()=>{S.multi.clear();renderCanvas()},
  'm-del':()=>{const ids=multiIds();confirmModal(`Delete ${ids.length} cards?`,'Their links are removed too. You can undo this.','Delete',()=>{commit(`Delete ${ids.length} cards`,p=>{for(const id of ids)removeEntity(p,id)});S.multi.clear();S.sel=null;renderAll()})},
  'm-move':()=>{const p=S.p;const ids=multiIds();openModal({title:'Move to module',ic:'layers',body:`<div class="field"><label for="mm-m">Module</label><select id="mm-m" class="inp">${Object.values(p.modules).map(m=>opt(m.id,'',m.name)).join('')}</select></div>`,actions:[{label:'Cancel',run:closeModal},{label:'Move',primary:true,run:()=>{const m=$('#mm-m').value;closeModal();commit(`Move ${ids.length} cards`,p=>{for(const id of ids)p.entities[id].moduleId=m})}}]})},
  present:()=>startPresent(),'pr-next':()=>presStep(1),'pr-prev':()=>presStep(-1),'pr-end':()=>endPresent(),
});
/* Hook the canvas pointer flow: Shift/Ctrl+click adds to the selection, Shift+drag on empty space draws a box,
   dragging a selected group moves them together, snap-to-grid rounds positions. */
vp.addEventListener('pointerdown',ev=>{
  if(!S.p||ev.button>0)return;if(ev.target.closest('.overlay,#minimap,#panel,#dropMenu,#tray,#lkey,#mbar,#walk,[data-port]'))return;
  const card=ev.target.closest('.card');
  if(card&&(ev.shiftKey||ev.ctrlKey||ev.metaKey)){ev.stopImmediatePropagation();vp.setPointerCapture?.(ev.pointerId);toggleMulti(card.dataset.id);return}
  if(!card&&ev.shiftKey){ev.stopImmediatePropagation();vp.setPointerCapture?.(ev.pointerId);const r=vp.getBoundingClientRect();BX={sx:ev.clientX,sy:ev.clientY,r};let b=$('#boxsel');if(!b){b=document.createElement('div');b.id='boxsel';vp.appendChild(b)}b.style.cssText=`left:${ev.clientX-r.left}px;top:${ev.clientY-r.top}px;width:0;height:0`;return}
  if(card&&S.multi.has(card.dataset.id)&&S.multi.size>1)setTimeout(()=>{if(G&&G.type==='drag'&&G.id===card.dataset.id){G.group=multiIds().filter(i=>i!==G.id).map(i=>({id:i,ox:PX(S.p.entities[i]),oy:PY(S.p.entities[i])}))}},0);
  else if(card&&!S.multi.has(card.dataset.id)&&S.multi.size){S.multi.clear();renderMultiBar();$$('.card.msel').forEach(n=>n.classList.remove('msel'))}
  else if(!card&&S.multi.size){S.multi.clear();renderMultiBar();$$('.card.msel').forEach(n=>n.classList.remove('msel'))}
},true);
let BX=null;
vp.addEventListener('pointermove',ev=>{
  if(BX){const b=$('#boxsel');const r=BX.r;const x=Math.min(ev.clientX,BX.sx),y=Math.min(ev.clientY,BX.sy);b.style.cssText=`left:${x-r.left}px;top:${y-r.top}px;width:${Math.abs(ev.clientX-BX.sx)}px;height:${Math.abs(ev.clientY-BX.sy)}px`;return}
  if(G&&G.type==='drag'&&G.moved){const e=S.p.entities[G.id];
    if(S.prefs.snap){const nx=Math.round(PX(e)/SNAP)*SNAP,ny=Math.round(PY(e)/SNAP)*SNAP;setPos(e,nx,ny);const g=S.geo[G.id];if(g){g.x=nx;g.y=ny;g.node.style.left=nx+'px';g.node.style.top=ny+'px'}}
    if(G.group){const dx=PX(e)-G.ox,dy=PY(e)-G.oy;for(const m of G.group){const x=S.p.entities[m.id];if(!x)continue;let nx=m.ox+dx,ny=m.oy+dy;if(S.prefs.snap){nx=Math.round(nx/SNAP)*SNAP;ny=Math.round(ny/SNAP)*SNAP}setPos(x,nx,ny);const g=S.geo[m.id];if(g){g.x=nx;g.y=ny;g.node.style.left=nx+'px';g.node.style.top=ny+'px'}}const{vis}=visibleSet(S.p);renderEdges(vis);renderFrames(vis)}}
});
function endBox(ev){if(!BX)return;const b=$('#boxsel');const x0=Math.min(ev.clientX,BX.sx),y0=Math.min(ev.clientY,BX.sy),x1=Math.max(ev.clientX,BX.sx),y1=Math.max(ev.clientY,BX.sy);BX=null;b&&b.remove();
  if(x1-x0<6&&y1-y0<6)return;const a=toWorld(x0,y0),c=toWorld(x1,y1);for(const[id,g] of Object.entries(S.geo)){if(g.x<c.x&&g.x+g.w>a.x&&g.y<c.y&&g.y+g.h>a.y)S.multi.add(id)}renderCanvas();if(S.multi.size)toast(`${S.multi.size} selected. Shift-click to add or remove.`)}
vp.addEventListener('pointerup',endBox);vp.addEventListener('pointercancel',()=>{BX=null;$('#boxsel')&&$('#boxsel').remove()});
document.addEventListener('keydown',ev=>{
  if(!S.p||!$('#modal').classList.contains('hide')||(typeof PL!=='undefined'&&PL.open))return;const typing=ev.target.matches('input,textarea,select,[contenteditable]');if(typing)return;const mod=ev.ctrlKey||ev.metaKey;
  if(mod&&ev.key.toLowerCase()==='c'){const ids=S.multi.size?multiIds():S.sel&&S.sel.t==='entity'?[S.sel.id]:[];if(ids.length){ev.preventDefault();copyCards(ids)}}
  else if(mod&&ev.key.toLowerCase()==='v'){ev.preventDefault();pasteCards()}
  else if(mod&&ev.key.toLowerCase()==='a'&&S.panel==null){ev.preventDefault();S.multi=new Set(Object.keys(S.geo));renderCanvas()}
  else if(ev.key==='Escape'&&S.multi.size){S.multi.clear();renderCanvas()}
},true);
// ---------- Presentation mode ----------
const PR={i:0,slides:[]};
function startPresent(){const p=S.p;PR.slides=[{t:'all',title:p.name,text:p.description||`${pages(p).length} pages in ${Object.keys(p.modules).length} modules`}].concat(Object.values(p.modules).sort((a,b)=>a.order-b.order).map(m=>{const l=Object.values(p.entities).filter(e=>e.moduleId===m.id);return {t:'mod',id:m.id,title:m.name,text:`${l.filter(e=>e.kind==='page').length} pages · ${l.filter(e=>e.kind!=='page').length} other cards. ${l.filter(e=>e.kind==='page').map(e=>e.name).join(', ')}`}})).concat((p.paths||[]).map(x=>({t:'path',id:x.id,title:'Journey: '+x.name,text:x.steps.map(s=>entityLabel(p,s.page)).join(' → ')})));
  PR.i=0;document.body.classList.add('presenting');try{document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen().catch(()=>{})}catch(e){}presShow()}
function presShow(){const p=S.p;const sl=PR.slides[PR.i];let ids;
  if(sl.t==='all')ids=Object.keys(S.geo);else if(sl.t==='mod')ids=Object.keys(S.geo).filter(i=>p.entities[i]&&p.entities[i].moduleId===sl.id);else{const x=p.paths.find(q=>q.id===sl.id);ids=x.steps.map(s=>s.page).filter(i=>S.geo[i]);S.trace={ents:new Set(ids),conns:new Set(),order:[],dir:'walk',start:{id:ids[0],el:null}};renderCanvas();applyTraceClasses()}
  if(sl.t!=='path'&&S.trace){S.trace=null;renderCanvas()}
  const b=bounds(ids);if(b){const r=vp.getBoundingClientRect();const z=Math.min(1.4,Math.max(.12,Math.min((r.width-80)/(b.w||1),(r.height-200)/(b.h||1))));S.view={z,x:r.width/2-(b.x+b.w/2)*z,y:(r.height-120)/2-(b.y+b.h/2)*z};applyView()}
  let c=$('#pres');if(!c){c=document.createElement('div');c.id='pres';c.setAttribute('role','region');c.setAttribute('aria-label','Presentation');document.body.appendChild(c)}
  c.innerHTML=`<div><h2>${esc(sl.title)}</h2><p>${esc(sl.text)}</p></div><div class="row-btns"><span>${PR.i+1} / ${PR.slides.length}</span><button class="btn" data-act="pr-prev" ${PR.i?'':'disabled'}>Back</button><button class="btn primary" data-act="pr-next">${PR.i<PR.slides.length-1?'Next':'Finish'}</button><button class="btn ghost" data-act="pr-end">Exit</button></div>`}
function presStep(d){PR.i+=d;if(PR.i>=PR.slides.length)return endPresent();PR.i=Math.max(0,PR.i);presShow()}
function endPresent(){document.body.classList.remove('presenting');$('#pres')&&$('#pres').remove();S.trace=null;renderCanvas();try{document.fullscreenElement&&document.exitFullscreen()}catch(e){}}
document.addEventListener('keydown',ev=>{if(!document.body.classList.contains('presenting'))return;if(ev.key==='ArrowRight'||ev.key===' '){ev.preventDefault();ev.stopImmediatePropagation();presStep(1)}else if(ev.key==='ArrowLeft'){ev.preventDefault();ev.stopImmediatePropagation();presStep(-1)}else if(ev.key==='Escape'){ev.stopImmediatePropagation();endPresent()}},true);

// =========================================================
// SMART SEARCH (plain-English questions, filters, saved searches)
// =========================================================
const SR={q:'',kind:'',status:'',role:'',mod:''};
function smartSearch(p,q,f){
  const t=q.trim().toLowerCase();const out=[];const push=(r,why)=>out.push(Object.assign(r,{why}));let intent='';
  const pg=pages(p);
  if(/(don'?t|do not|doesn'?t|does not) do anything|go(es)? nowhere|not (linked|connected)|unconnected|dead/.test(t)){intent='Buttons that don\'t do anything yet';for(const e of pg)for(const el of e.elements)if(EL_TYPES[el.type]&&EL_TYPES[el.type].act&&!outConns(p,e.id,el.id).length)push({t:'element',id:e.id,el:el.id,name:el.label,sub:e.name},'Not linked')}
  else if(/(can|could) .*\b(access|see|open|use)\b|\baccess\b/.test(t)&&p.roles.some(r=>t.includes(normL(r.name).split(' ')[0]))){const r=p.roles.find(r=>t.includes(normL(r.name).split(' ')[0]));intent=`Everything ${r.name} can open`;for(const e of pg)if(!e.roles.length||e.roles.includes(r.id))push({t:'entity',id:e.id,name:e.name,sub:e.pageType},e.roles.length?'Allowed for '+r.name:'Open to everyone')}
  else if(/setting/.test(t)&&byKindP(p,'setting').some(s=>t.includes(normL(s.name))||(s.key&&t.includes(s.key.toLowerCase())))){const s=byKindP(p,'setting').find(s=>t.includes(normL(s.name))||(s.key&&t.includes(s.key.toLowerCase())));intent=`What uses ${s.name}`;const R=impactOf(p,s.id);for(const id of [...R.pages,...R.functions,...R.decisions])push({t:'entity',id,name:entityLabel(p,id),sub:KINDS[p.entities[id].kind].label},'Uses it')}
  else if(/where (does|do|is|are)? ?(the app )?(store|save|keep|stored|saved|kept)/.test(t)){const words=t.split(/\s+/).filter(w=>w.length>3);intent='Where data is kept';for(const d of byKindP(p,'data')){const hit=words.some(w=>normL(d.name+' '+(d.fields||'')).includes(w.replace(/s$/,'')));if(hit||words.length<3){push({t:'entity',id:d.id,name:d.name,sub:d.storage||'Storage not set'},'Data');for(const c of inConns(p,d.id))push({t:'entity',id:c.from.entity,name:entityLabel(p,c.from.entity),sub:'saves to '+d.name},'Writes it')}}}
  else if(/#[0-9a-f]{3,6}\b/.test(t)){const hx=CL.norm(t.match(/#[0-9a-f]{3,6}\b/)[0]);intent='Where '+hx+' is used';for(const[sc,l] of allLookScopes(p))if(lookColours(l).has(hx))push(sc.startsWith('ent:')?{t:'entity',id:sc.slice(4),name:entityLabel(p,sc.slice(4)),sub:'Colours'}:{t:'none',name:scopeLabel(p,sc==='app:'?'app:':sc),sub:'Colours'},'Uses it')}
  else if(/\berror/.test(t)&&!f.kind){intent='Error paths';for(const c of Object.values(p.connections))if(c.type==='error')push({t:'entity',id:c.from.entity,name:connFromLabel(p,c),sub:'→ '+entityLabel(p,c.to)},'Error path');for(const e of pg)if(e.pageType==='Error')push({t:'entity',id:e.id,name:e.name,sub:'Error page'},'Page')}
  if(!intent){const st=allStatuses(p).find(s=>t===s.toLowerCase());if(st){intent='Status: '+st;f=Object.assign({},f,{status:st})}}
  if(!intent){const words=t.split(/\s+/).filter(Boolean);
    for(const e of Object.values(p.entities)){const hay=normL([e.name,e.desc,e.notes,e.steps,e.key,e.why,e.rules,e.decisions].join(' '));if(!words.length||words.every(w=>hay.includes(w)))push({t:'entity',id:e.id,name:e.name,sub:KINDS[e.kind].label+(e.kind==='page'?' · '+e.pageType:'')},'');
      if(e.elements)for(const el of e.elements)if(words.length&&words.every(w=>normL(el.label).includes(w)))push({t:'element',id:e.id,el:el.id,name:el.label,sub:e.name},'Part')}}
  const ent=r=>r.id&&p.entities[r.id];
  const res=out.filter(r=>{const e=ent(r);if(!e)return r.t==='none';if(f.kind&&e.kind!==f.kind)return false;if(f.status&&e.status!==f.status)return false;if(f.mod&&e.moduleId!==f.mod)return false;if(f.role&&e.kind==='page'&&e.roles.length&&!e.roles.includes(f.role))return false;return true});
  const seen=new Set();return {intent,res:res.filter(r=>{const k=r.t+r.id+(r.el||'')+r.name;if(seen.has(k))return false;seen.add(k);return true}).slice(0,200)};
}
function findHTML(p){
  const {intent,res}=SR.q||SR.kind||SR.status||SR.role||SR.mod?smartSearch(p,SR.q,SR):{intent:'',res:[]};
  const sel=(id,v,opts,lab)=>`<label class="sr" for="${id}">${lab}</label><select id="${id}" class="inp small" data-sr="${id.slice(3)}">${opt('',v,lab+': any')}${opts.map(([k,l])=>opt(k,v,l)).join('')}</select>`;
  return `<div class="field"><label for="sr-q">Ask a question or type a word</label><input id="sr-q" class="inp big" type="search" value="${esc(SR.q)}" placeholder="e.g. buttons that don't do anything"></div>
  <div class="ex-q">${['buttons that don\'t do anything','what can '+(p.roles[0]?p.roles[0].name.toLowerCase():'guest')+' access',byKindP(p,'setting')[0]?'which pages use the '+byKindP(p,'setting')[0].name.toLowerCase()+' setting':'','where does the app store photos','error'].filter(Boolean).map(x=>`<button class="chip-btn" data-sr-ex="${esc(x)}">${esc(x)}</button>`).join('')}</div>
  <div class="row-in filters">${sel('sr-kind',SR.kind,Object.entries(KINDS).map(([k,v])=>[k,v.label]),'Kind')}${sel('sr-status',SR.status,allStatuses(p).map(s=>[s,s]),'Status')}${sel('sr-role',SR.role,p.roles.map(r=>[r.id,r.name]),'Role')}${sel('sr-mod',SR.mod,Object.values(p.modules).map(m=>[m.id,m.name]),'Module')}</div>
  ${intent?`<p class="help"><b>${esc(intent)}</b></p>`:''}
  ${SR.q||SR.kind||SR.status||SR.role||SR.mod?`<p class="help">${res.length} result${res.length===1?'':'s'} · <button class="linkish" data-act="sr-save">Save this search</button></p><div class="list">${res.map((r,i)=>`<button class="li" data-act="sr-go" data-i="${i}"><span class="grow">${esc(r.name)}<small>${esc(r.sub||'')}${r.why?' · '+esc(r.why):''}</small></span></button>`).join('')}</div>`:''}
  <div class="mod-h">Saved searches <span class="count">${p.savedSearches.length}</span></div><div class="list">${p.savedSearches.map((s,i)=>`<div class="li"><button class="grow linkish" data-act="sr-load" data-i="${i}">${esc(s.name)}</button><button class="mini" data-act="sr-del" data-i="${i}" aria-label="Remove saved search">${icon('trash')}</button></div>`).join('')||'<p class="help">None yet.</p>'}</div>`;
}
document.addEventListener('input',ev=>{if(ev.target.id==='sr-q'){SR.q=ev.target.value;clearTimeout(SR.t);SR.t=setTimeout(()=>rerenderPanelKeep('#sr-q'),250)}});
document.addEventListener('change',ev=>{const k=ev.target.dataset&&ev.target.dataset.sr;if(k){SR[k]=ev.target.value;rerenderPanelKeep()}});
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-sr-ex]');if(b){SR.q=b.dataset.srEx;rerenderPanelKeep('#sr-q')}});
Object.assign(ACT,{
  'sr-go':d=>{const {res}=smartSearch(S.p,SR.q,SR);const r=res[+d.i];if(!r||r.t==='none')return;select(r.t==='element'?{t:'element',id:r.id,el:r.el,scroll:true}:{t:'entity',id:r.id},{centre:true});if(window.innerWidth<=760){S.panel=null;renderPanel()}},
  'sr-save':()=>openModal({title:'Save search',ic:'search',body:`<div class="field"><label for="ss-n">Name</label><input id="ss-n" class="inp" value="${esc(SR.q||'My search')}"></div>`,actions:[{label:'Cancel',run:closeModal},{label:'Save',primary:true,run:()=>{const n=$('#ss-n').value.trim()||'Search';closeModal();commit('Save search',p=>{p.savedSearches.push({name:n,q:SR.q,kind:SR.kind,status:SR.status,role:SR.role,mod:SR.mod})})}}]}),
  'sr-load':d=>{Object.assign(SR,S.p.savedSearches[+d.i]);rerenderPanelKeep()},
  'sr-del':d=>commit('Remove saved search',p=>{p.savedSearches.splice(+d.i,1)}),
});

// =========================================================
// TEMPLATES for new projects
// =========================================================
function buildTemplate(kind,name,desc,platforms){
  const T={booking:{n:'My booking app',mods:{Browse:[['Home','Home / dashboard',['Search services','Upcoming booking','Book now']],['Service list','List',['Service card','Filter']],['Service detail','Detail',['Photos','Price','Choose a time']]],Booking:[['Pick a time','Form',['Calendar','Time slots','Continue']],['Checkout','Checkout',['Card details','Pay']],['Booking confirmed','Confirmation',['Add to calendar','Back to home']]],Account:[['Sign in','Login / registration',['Email','Password','Sign in','Forgot password']],['My bookings','List',['Booking item','Cancel booking']]]},
      links:[['Home','Book now','Service list'],['Home','Search services','Service list'],['Service list','Service card','Service detail'],['Service detail','Choose a time','Pick a time'],['Pick a time','Continue','Checkout'],['Checkout','Pay','Booking confirmed'],['Booking confirmed','Back to home','Home'],['Home','Upcoming booking','My bookings']],fn:['Take payment','Checkout','Pay','Booking confirmed']},
    shop:{n:'My shop',mods:{Shop:[['Home','Home / dashboard',['Search','Categories','Featured products']],['Product list','List',['Product card','Sort','Filter']],['Product detail','Detail',['Photos','Add to cart','Reviews']]],Cart:[['Cart','List',['Cart item','Checkout']],['Checkout','Checkout',['Address','Card details','Place order']],['Order confirmed','Confirmation',['Track order','Keep shopping']]],Account:[['Sign in','Login / registration',['Email','Password','Sign in','Forgot password']],['Orders','List',['Order item']]]},
      links:[['Home','Categories','Product list'],['Home','Featured products','Product detail'],['Product list','Product card','Product detail'],['Product detail','Add to cart','Cart'],['Cart','Checkout','Checkout'],['Checkout','Place order','Order confirmed'],['Order confirmed','Keep shopping','Home'],['Order confirmed','Track order','Orders']],fn:['Place the order','Checkout','Place order','Order confirmed']},
    social:{n:'My community app',mods:{Feed:[['Home feed','Home / dashboard',['New post','Post card','Notifications']],['Post detail','Detail',['Comments','Like','Share']],['New post','Form',['Write something','Add photo','Post']]],Messages:[['Chats','Messaging',['Chat item','New chat']],['Chat','Messaging',['Message box','Send']]],Profile:[['Profile','Profile',['Edit profile','My posts','Settings']],['Settings','Settings',['Notifications','Privacy','Sign out']]]},
      links:[['Home feed','New post','New post'],['Home feed','Post card','Post detail'],['New post','Post','Home feed'],['Chats','Chat item','Chat'],['Profile','Settings','Settings']],fn:['Publish post','New post','Post','Home feed']}}[kind];
  const p=blankProject({name:name||T.n,description:desc||'',platforms,withHome:false});const ids={};let mx=0;
  for(const[mn,list] of Object.entries(T.mods)){const m=addModule(p,mn);list.forEach(([n,pt,parts],i)=>{const e=addEntity(p,'page',{name:n,pageType:pt,moduleId:m.id,x:mx,y:i*300});e.elements=parts.map(l=>({id:uid('el'),label:l,type:/^(email|password|address|card details|write something|message box|calendar)$/i.test(l)?'input':/card|item$/i.test(l)?'listitem':'button'}));ids[n]=e});mx+=420}
  p.startPageId=Object.values(ids)[0].id;
  for(const[a,el,b] of T.links){const s=ids[a];const x=s&&s.elements.find(q=>q.label===el);if(s&&x&&ids[b])addConn(p,{entity:s.id,element:x.id},ids[b].id,'navigate')}
  const[fnN,pg,el,to]=T.fn;const src=ids[pg];const f=addEntity(p,'function',{name:fnN,moduleId:src.moduleId,x:src.x+330,y:src.y+120,trigger:'Button tap',steps:'Check the details\nSave it\nShow the confirmation',success:'Shows the confirmation page',error:'Shows what went wrong and lets them try again'});
  const x=src.elements.find(q=>q.label===el);for(const c of Object.values(p.connections))if(c.from.entity===src.id&&c.from.element===x.id)delete p.connections[c.id];addConn(p,{entity:src.id,element:x.id},f.id,'trigger');addConn(p,{entity:f.id,element:null},ids[to].id,'navigate');
  return p;
}
