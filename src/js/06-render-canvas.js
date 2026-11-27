// =========================================================
// RENDER — canvas
// =========================================================
function visibleSet(p){
  const hidden=new Set();for(const e of Object.values(p.entities))if(e.collapsed)for(const d of descendants(p,e.id))hidden.add(d);
  const cx=S.prefs.complexity;const kindOk=k=>S.prefs.view==='screens'?k==='page':(cx==='technical'||(cx==='detailed'?!['setting','data'].includes(k):k==='page'));
  const vis=new Set();for(const e of Object.values(p.entities))if(!hidden.has(e.id)&&kindOk(e.kind))vis.add(e.id);
  return {vis,hidden};
}
function modColour(p,e){const m=p.modules[e.moduleId];return `var(--m-${m?m.colour:'coral'})`}
function wireHTML(e){
  const parts=(e.elements||[]).slice(0,7).map(el=>({button:'<div class="wbtn"></div>',link:'<div class="wb" style="width:45%"></div>',tab:'<div class="wtabs"><i></i><i></i><i></i></div>',listitem:'<div class="wli"></div><div class="wli"></div>',menuitem:'<div class="wli"></div>',toggle:'<div class="wtg"></div>',input:'<div class="win"></div>',dropdown:'<div class="win"></div>',image:'<div class="wimg"></div>',section:'<div class="wb"></div><div class="wb" style="width:70%"></div>'}[el.type]||'<div class="wb"></div>')).join('');
  return `<div class="wire" aria-hidden="true"><div class="wb" style="width:55%;background:var(--ink-2);opacity:.5"></div>${parts||'<div class="wb"></div><div class="wb"></div>'}</div>`;
}
function cardHTML(p,e,hiddenCount){
  if(S.prefs.view==='screens'&&e.kind==='page')return screenCardHTML(p,e,hiddenCount);
  const mc=modColour(p,e);const sel=S.sel&&S.sel.id===e.id;
  const ic=e.kind==='page'?autoIcon(e.name,PAGE_ICON[e.pageType]||'section'):e.kind==='decision'?'users':KINDS[e.kind].icon;
  const sub=e.kind==='page'?e.pageType:KINDS[e.kind].label+(e.kind==='setting'&&e.key?' · '+e.key:'');
  const modName=p.modules[e.moduleId]?.name;
  let meta='';
  if(e.kind==='page')meta=`${e.elements.length} item${e.elements.length===1?'':'s'}${modName?' · '+esc(modName):''}`;
  else if(e.kind==='setting')meta=`Default: ${esc(e.defaultValue)} · ${esc(e.scope)}`;
  else if(e.kind==='function')meta=`${(e.steps||'').split('\n').filter(Boolean).length} steps`;
  else if(e.kind==='data')meta=`${(e.fields||'').split('\n').filter(Boolean).length} fields`;
  let els='';
  if(e.kind==='page'){
    els='<div class="els">'+e.elements.map(el=>{
      const cs=outConns(p,e.id,el.id);const act=EL_TYPES[el.type]?.act;
      const dest=cs.length?cs.map(c=>entityLabel(p,c.to)).join(', '):'';
      const elSel=S.sel&&S.sel.t==='element'&&S.sel.id===e.id&&S.sel.el===el.id;
      const hot=S.trace&&S.trace.start.el===el.id;
      return `<div class="el${act?' act':''}${act&&!cs.length?' nolink':''}${elSel?' sel':''}${hot?' hot':''}" data-el="${el.id}" data-ent="${e.id}" title="${esc(EL_TYPES[el.type]?.label||'')}${dest?' → '+esc(dest):''}">${icon(autoIcon(el.label,EL_TYPES[el.type]?.icon||'section'))}<span class="lab">${esc(el.label)}</span>${dest?`<span class="dest">${esc(dest)}</span>`:''}${act||cs.length?icon('chev','chev'):''}<span class="port${cs.length?' on':''}" data-port="el" data-ent="${e.id}" data-el="${el.id}" title="Drag to link this to another card"></span></div>`;
    }).join('')+'</div>'+wireHTML(e);
  }
  const kids=descendants(p,e.id).size;
  const coll=kids?`<button class="collapse-btn" data-act="toggle-collapse" data-id="${e.id}" aria-expanded="${!e.collapsed}">${e.collapsed?`Show ${hiddenCount||kids} hidden ▸`:`Hide branch (${kids}) ▾`}</button>`:'';
  return `<div class="card k-${e.kind}${e.kind==='decision'?' decision':''}${sel&&S.sel.t==='entity'?' sel':''}${e.view==='screen'?' screen':''}" data-id="${e.id}" style="left:${e.x}px;top:${e.y}px;--mc:${mc}" tabindex="0" role="button" aria-label="${esc(KINDS[e.kind].label+': '+e.name)}">
    <span class="inport" aria-hidden="true"></span>
    <div class="hd"><span class="tile">${icon(ic)}</span><span class="ttl"><span class="nid">${nodeIds(p)[e.id]}</span>${esc(e.name)}<span class="kind">${esc(sub)}</span></span><span class="chip ${stClass(e.status)}">${esc(e.status)}</span>
    <span class="port card-port${outConns(p,e.id).some(c=>!c.from.element)?' on':''}" data-port="card" data-ent="${e.id}" title="Drag to link this card to another"></span></div>
    ${meta?`<div class="meta">${meta}</div>`:''}
    ${els}
    ${e.desc?`<div class="desc">${esc(e.desc)}</div>`:''}
    <div class="tech">${esc(e.id)}${e.parentId?' · branch of '+esc(e.parentId):''}</div>
    ${coll}
  </div>`;
}
function renderCanvas(){}
function renderFrames(){}
function elNode(card,elId){return card.querySelector(`[data-el="${elId}"]`)}
function portPos(){}
function pathD(x1,y1,x2,y2){
  if(S.prefs.lines==='curved'||x2<x1+50){
    if(x2<x1+50){const dx=Math.max(90,Math.abs(x2-x1)/3);return `M${x1},${y1} C${x1+dx},${y1} ${x2-dx},${y2} ${x2-6},${y2}`}
    const dx=Math.max(60,(x2-x1)/2);return `M${x1},${y1} C${x1+dx},${y1} ${x2-dx},${y2} ${x2-6},${y2}`;
  }
  const mx=x1+Math.min(36,(x2-x1)/2);const r=Math.min(14,Math.abs(y2-y1)/2,(x2-x1)/4);
  if(Math.abs(y2-y1)<2)return `M${x1},${y1} L${x2-6},${y2}`;
  const s=y2>y1?1:-1;
  return `M${x1},${y1} L${mx-r},${y1} Q${mx},${y1} ${mx},${y1+s*r} L${mx},${y2-s*r} Q${mx},${y2} ${mx+r},${y2} L${x2-6},${y2}`;
}
function renderEdges(){}
function applyTraceClasses(){
  const t=S.trace;
  for(const n of cardsEl.children){n.classList.toggle('dim',!!t&&!t.ents.has(n.dataset.id));n.classList.toggle('hot',!!t&&t.ents.has(n.dataset.id))}
  for(const n of $$('.ln',edgesEl)){n.classList.toggle('dim',!!t&&!t.conns.has(n.dataset.c));n.classList.toggle('hot',!!t&&t.conns.has(n.dataset.c))}
  for(const n of $$('.elabel',labelsEl))n.style.opacity=t&&!t.conns.has(n.dataset.lc)?.15:'';
  const bar=$('#traceBar');
  if(!t){bar.hidden=true;return}
  bar.hidden=false;bar.className='trace-bar';
  bar.innerHTML=`${icon('trace')}<p><b>${t.dir==='fwd'?'What happens next':'What leads here'}</b><br>${t.order.map(esc).join(t.dir==='fwd'?' → ':' ← ')}</p><button class="btn small" data-act="trace-clear">Clear</button>`;
}
function renderMinimap(){}
function renderCrumbs(){
  const p=S.p;const c=$('#crumbs');const parts=[`<button data-act="fit">${esc(p.name)}</button>`];
  const s=S.sel;
  if(s&&s.t!=='conn'){const e=p.entities[s.id];if(e){const m=p.modules[e.moduleId];if(m)parts.push(`<span class="sep">›</span><button data-act="fit-module" data-id="${m.id}">${esc(m.name)}</button>`);parts.push(`<span class="sep">›</span><button data-act="centre" data-id="${e.id}">${esc(e.name)}</button>`);if(s.t==='element'){const el=findElement(p,e.id,s.el);if(el)parts.push(`<span class="sep">›</span><button data-act="centre" data-id="${e.id}">${esc(el.label)}</button>`)}}}
  c.innerHTML=parts.join('');
}

