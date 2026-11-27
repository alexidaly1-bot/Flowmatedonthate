// =========================================================
// FM6 · SCREEN DESIGN — clearly marked unfinished screens, and a
// Canva-style layout editor: drag, resize, rename, set what a part does.
// Parts keep their ids, so links and functions stay attached.
// =========================================================
const DEFAULT_LABEL=/^(New (button|link|tab|list item|menu item|toggle|text field|dropdown|image|section|part)|New section)$/i;
const _scrHTML6=screenHTML;
screenHTML=function(p,e,o={}){
  let h=_scrHTML6(p,e,o);
  const els=e.elements||[];
  if(!els.length)h=h.replace('<div class="scr','<div class="scr undesigned').replace('<p class="scr-empty">Drag parts here</p>',`<div class="scr-todo"><b>Not designed yet</b><span>${o.mode==='play'?'This screen has no parts yet':'Add parts from the Parts bar'}</span></div>`);
  for(const el of els)if(!String(el.label||'').trim()||DEFAULT_LABEL.test(el.label))h=h.replace(new RegExp(`class="sp ([^"]*)" data-el="${el.id}"`),`class="sp $1 unnamed" data-el="${el.id}"`);
  if(e.layout==='free')h=freeify(h,e,o);
  return h;
};
const FREE_TPL=document.createElement('template');
function freeBoxes(e,W){
  // saved boxes, plus a tidy stack for parts that do not have one yet
  const out={};let bottom=12;
  for(const el of e.elements||[])if(el.box){out[el.id]=el.box;bottom=Math.max(bottom,(el.box.y+el.box.h)*W+10)}
  for(const el of e.elements||[])if(!el.box){const h=Math.max(34,(PART_H[el.type]||60)-12);out[el.id]={x:16/W,y:bottom/W,w:(W-32)/W,h:h/W,auto:1};bottom+=h+10}
  return out;
}
function freeify(h,e,o){
  const d=DEVICES[o.device]||curDev();const W=d.w;
  FREE_TPL.innerHTML=h;const scr=FREE_TPL.content.firstElementChild;if(!scr)return h;
  const body=scr.querySelector('.scr-body');if(!body)return h;
  const parts=[...scr.querySelectorAll('.sp[data-el]')].filter(n=>!n.classList.contains('faint'));
  scr.querySelectorAll('.sp.faint,.sp-hero,.scr-empty').forEach(n=>n.remove());
  const foot=scr.querySelector('.scr-foot');
  body.innerHTML='';body.classList.add('free');
  const B=freeBoxes(e,W);let max=0;
  for(const n of parts){const b=B[n.dataset.el];if(!b)continue;n.classList.add('fp');n.style.cssText+=`;left:${Math.round(b.x*W)}px;top:${Math.round(b.y*W)}px;width:${Math.round(b.w*W)}px;height:${Math.round(b.h*W)}px`;body.appendChild(n);max=Math.max(max,(b.y+b.h)*W)}
  if(foot)foot.remove();
  body.style.minHeight=Math.round(max+16)+'px';
  return scr.outerHTML;
}

// ---------- Layout editor ----------
const LAY={id:null,sel:null,drag:null};
function layEnt(){return S.p&&S.p.entities[LAY.id]}
function layOpen(id,elId){
  const e=S.p&&S.p.entities[id];if(!e||e.kind!=='page')return;
  LAY.id=id;LAY.sel=elId||null;
  let el=$('#lay');if(!el){el=document.createElement('div');el.id='lay';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');document.body.appendChild(el);layBind(el)}
  el.hidden=false;layRender();setTimeout(()=>{const b=el.querySelector('[data-lay=done]');b&&b.focus({preventScroll:true})},30);
}
function layClose(){const el=$('#lay');if(el)el.hidden=true;const id=LAY.id;LAY.id=null;if(id&&S.p.entities[id])select({t:'entity',id})}
function layRender(){
  const el=$('#lay');if(!el||el.hidden)return;const p=S.p;const e=layEnt();if(!e)return layClose();
  if(LAY.sel&&!(e.elements||[]).some(x=>x.id===LAY.sel))LAY.sel=null;
  const d=curDev();const free=e.layout==='free';
  const sel=LAY.sel&&e.elements.find(x=>x.id===LAY.sel);
  const cs=sel?outConns(p,e.id,sel.id):[];
  const side=sel?`<h3>${esc(EL_TYPES[sel.type]?.label||'Part')}</h3>
    <div class="field"><label for="lay-l">Label</label><input id="lay-l" class="inp" value="${esc(sel.label)}"></div>
    <div class="field"><label for="lay-t">Type</label><select id="lay-t" class="inp">${Object.entries(EL_TYPES).map(([k,v])=>opt(k,sel.type,v.label)).join('')}</select></div>
    <div class="field"><label for="lay-go">What it does</label><select id="lay-go" class="inp">${targetOptions(p,cs[0]?cs[0].to:'',e.id)}</select>${cs.length>1?`<p class="help">This part has ${cs.length} links. The first is shown. Use the full editor for the rest.</p>`:''}</div>
    <div class="row-btns"><button class="btn small" data-lay="dup">${icon('plus')}Duplicate</button><button class="btn small" data-lay="full">${icon('pen')}Full editor</button><button class="btn small danger" data-lay="del">${icon('trash')}Remove</button></div>
    ${free?`<p class="help">Drag to move. Drag the corner to resize. Double-tap to rename.</p>`:`<p class="help">Drag a part to start free layout. Links and functions stay attached.</p>`}`
   :`<h3>${esc(e.name)}</h3><p class="help">Tap a part to change it. ${free?'Drag to move, drag the corner to resize.':'Drag any part to switch this screen to free layout.'}</p>
    <div class="field"><span class="flabel">Layout</span><div class="seg"><button class="${free?'':'on'}" data-lay="auto" aria-pressed="${!free}">Automatic</button><button class="${free?'on':''}" data-lay="free" aria-pressed="${free}">Free</button></div></div>
    <div class="field"><span class="flabel">Add a part</span><div class="lay-parts">${PARTS.filter(x=>x[0]!=='screen').map(([k,l,i])=>`<button class="tpart" data-lay="add" data-k="${k}">${icon(i)}<span>${l}</span></button>`).join('')}</div></div>`;
  el.innerHTML=`<div class="lay-top"><button class="btn icon ghost" data-lay="done" aria-label="Close layout editor">${icon('x')}</button><b class="lay-title">Edit screen: ${esc(e.name)}</b><span class="pl-sp"></span><button class="btn small" data-lay="undo" ${S.undo.length?'':'disabled'}>${icon('undo')}<span class="lbl2">Undo</span></button><button class="btn small primary" data-lay="done">Done</button></div>
  <div class="lay-main"><div class="lay-stage" id="lay-stage"><div class="lay-fit" id="lay-fit"><div class="lay-dev dev dev-${d.frame}">${screenHTML(p,e,{mode:'canvas'})}</div></div></div><aside class="lay-side" aria-label="Selected part">${side}</aside></div>`;
  layFit();
  if(sel){const n=el.querySelector(`#lay-stage .sp[data-el="${sel.id}"]`);if(n){n.classList.add('lay-sel');n.insertAdjacentHTML('beforeend','<i class="lh se" data-h="se" aria-hidden="true"></i><i class="lh e" data-h="e" aria-hidden="true"></i><i class="lh s" data-h="s" aria-hidden="true"></i>')}}
  const L=$('#lay-l');if(L)L.addEventListener('change',()=>laySet('Rename part',el2=>{el2.label=L.value.trim()||el2.label}));
  const T=$('#lay-t');if(T)T.addEventListener('change',()=>laySet('Change part type',el2=>{el2.type=T.value}));
  const Gs=$('#lay-go');if(Gs)Gs.addEventListener('change',()=>layLink(Gs.value));
}
function layFit(){const st=$('#lay-stage'),fit=$('#lay-fit');if(!st||!fit)return;const dv=fit.firstElementChild;const W=dv.offsetWidth,H=dv.offsetHeight;const s=Math.max(.3,Math.min(1.4,(st.clientWidth-24)/W,(st.clientHeight-24)/H));LAY.scale=s;dv.style.transform=`scale(${s})`;dv.style.setProperty("--hs",(1/s).toFixed(2));fit.style.width=Math.round(W*s)+'px';fit.style.height=Math.round(H*s)+'px'}
function layMeasure(){
  const st=$('#lay-stage');const body=st&&st.querySelector('.scr-body');if(!body)return{};const br=body.getBoundingClientRect();const W=curDev().w;const k=W/br.width;const out={};
  for(const n of st.querySelectorAll('.sp[data-el]')){if(n.classList.contains('faint'))continue;const r=n.getBoundingClientRect();const R=v=>Math.round(v*1e4)/1e4;out[n.dataset.el]={x:R((r.left-br.left)*k/W),y:R((r.top-br.top)*k/W),w:R(r.width*k/W),h:R(r.height*k/W)}}
  return out;
}
function layOrder(pe){if(pe.layout!=='free')return;pe.elements.sort((a,b)=>a.box&&b.box?(a.box.y-b.box.y)||(a.box.x-b.box.x):0)}
function laySet(label,fn){const id=LAY.id,elId=LAY.sel;commit(label,p=>{const el=p.entities[id].elements.find(x=>x.id===elId);if(!el)throw new Error('That part is gone');fn(el,p)});layRender()}
function layLink(to){
  const id=LAY.id,elId=LAY.sel;if(!elId)return;
  if(to&&to.startsWith('new:')){const k=to.slice(4);const name=k==='page'?'New screen':'New '+KINDS[k].label.toLowerCase();
    commit('Link part to a new '+KINDS[k].label.toLowerCase(),p=>{const pe=p.entities[id];const n=addEntity(p,k,{name,moduleId:pe.moduleId,x:pe.x+400,y:pe.y,parentId:pe.id});const c=outConns(p,id,elId)[0];if(c)c.to=n.id;else addConn(p,{entity:id,element:elId},n.id,k==='page'?'navigate':'trigger')});return layRender()}
  commit(to?'Change what “'+((layEnt().elements.find(x=>x.id===elId)||{}).label||'part')+'” does':'Unlink part',p=>{const cs=outConns(p,id,elId);if(!to){if(cs[0])delete p.connections[cs[0].id];return}const t=p.entities[to];if(cs[0])cs[0].to=to;else addConn(p,{entity:id,element:elId},to,t&&t.kind==='page'?'navigate':'trigger')});
  layRender();
}
function layBind(root){
  root.addEventListener('click',ev=>{
    const b=ev.target.closest('[data-lay]');if(!b)return;const a=b.dataset.lay;const e=layEnt();if(!e)return;
    if(a==='done')return layClose();
    if(a==='undo'){undo();return layRender()}
    if(a==='auto'){if(e.layout==='free')commit(`Automatic layout for “${e.name}”`,p=>{p.entities[e.id].layout=undefined});return layRender()}
    if(a==='free'){if(e.layout!=='free'){const B=layMeasure();commit(`Free layout for “${e.name}”`,p=>{const pe=p.entities[e.id];pe.layout='free';for(const el of pe.elements)if(B[el.id])el.box=B[el.id]})}return layRender()}
    if(a==='add'){const k=b.dataset.k;const lab=PARTS.find(x=>x[0]===k)[1];const el=commit(`Add ${lab.toLowerCase()} to “${e.name}”`,p=>{const pe=p.entities[e.id];const el={id:uid('el'),label:k==='section'?'New section':'New '+lab.toLowerCase(),type:k};pe.elements.push(el);return el});if(el)LAY.sel=el.id;layRender();setTimeout(()=>{const i=$('#lay-l');i&&(i.focus(),i.select())},30);return}
    if(a==='del'){const id=LAY.sel;const el=e.elements.find(x=>x.id===id);commit(`Remove “${el?el.label:'part'}”`,p=>removeElement(p,e.id,id));LAY.sel=null;return layRender()}
    if(a==='dup'){const src=e.elements.find(x=>x.id===LAY.sel);if(!src)return;const n=commit(`Duplicate “${src.label}”`,p=>{const pe=p.entities[e.id];const i=pe.elements.findIndex(x=>x.id===src.id);const c=JSON.parse(JSON.stringify(src));c.id=uid('el');if(c.box)c.box.y+=c.box.h+8/curDev().w;pe.elements.splice(i+1,0,c);return c});if(n)LAY.sel=n.id;return layRender()}
    if(a==='full'){const id=LAY.sel;layClose();select({t:'element',id:e.id,el:id,scroll:true});return}
  });
  root.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!ev.target.closest('.lay-ren')){ev.stopPropagation();layClose()}
    if(LAY.sel&&!ev.target.closest('input,select,textarea')&&/^Arrow/.test(ev.key)&&layEnt().layout==='free'){ev.preventDefault();const W=curDev().w;const st=(ev.shiftKey?16:4)/W;const dx={ArrowLeft:-st,ArrowRight:st}[ev.key]||0,dy={ArrowUp:-st,ArrowDown:st}[ev.key]||0;laySet('Nudge part',el=>{const b=el.box||{x:0,y:0,w:.5,h:.1};el.box={...b,x:Math.max(0,b.x+dx),y:Math.max(0,b.y+dy)}});layOrder(layEnt())}});
  window.addEventListener('resize',()=>{if(!root.hidden)layFit()});
  root.addEventListener('pointerdown',ev=>{
    const n=ev.target.closest('#lay-stage .sp[data-el]');if(!n||ev.target.closest('.lay-ren'))return;
    ev.preventDefault();const h=ev.target.closest('[data-h]');
    LAY.drag={id:n.dataset.el,h:h?h.dataset.h:null,sx:ev.clientX,sy:ev.clientY,moved:false,node:n,pid:ev.pointerId,t:Date.now()};
    try{root.setPointerCapture(ev.pointerId)}catch(e){}
  });
  root.addEventListener('pointermove',ev=>{
    const D=LAY.drag;if(!D||ev.pointerId!==D.pid)return;const dx=ev.clientX-D.sx,dy=ev.clientY-D.sy;
    if(!D.moved){if(Math.hypot(dx,dy)<5)return;D.moved=true;
      const e=layEnt();if(e.layout!=='free'){D.conv=layMeasure();const tmp=JSON.parse(JSON.stringify(e));tmp.layout='free';for(const el of tmp.elements)if(D.conv[el.id])el.box=D.conv[el.id];
        const dv=$('#lay-fit').firstElementChild;dv.innerHTML=screenHTML(S.p,tmp,{mode:'canvas'});D.node=dv.querySelector(`.sp[data-el="${D.id}"]`);D.tmp=tmp}
      const src=(D.tmp||layEnt()).elements.find(x=>x.id===D.id);D.b0=Object.assign({},src.box||D.conv&&D.conv[D.id]);if(!D.b0||D.b0.w==null){LAY.drag=null;return}
      D.node.classList.add('lay-moving');LAY.sel=D.id}
    const W=curDev().w,s=LAY.scale||1;const g=v=>Math.round(v*W/4)*4/W;const ux=dx/s/W,uy=dy/s/W;const b=Object.assign({},D.b0);
    if(!D.h){b.x=Math.max(0,Math.min(1-b.w,g(b.x+ux)));b.y=Math.max(0,g(b.y+uy))}
    else{if(D.h!=='s')b.w=Math.max(24/W,Math.min(1-b.x,g(b.w+ux)));if(D.h!=='e')b.h=Math.max(20/W,g(b.h+uy))}
    D.b=b;D.node.style.left=Math.round(b.x*W)+'px';D.node.style.top=Math.round(b.y*W)+'px';D.node.style.width=Math.round(b.w*W)+'px';D.node.style.height=Math.round(b.h*W)+'px';
  });
  const end=ev=>{
    const D=LAY.drag;if(!D||ev.pointerId!==D.pid)return;LAY.drag=null;const e=layEnt();if(!e)return;
    if(!D.moved||!D.b){const now=Date.now();const dbl=LAY.lastTap&&LAY.lastTap.id===D.id&&now-LAY.lastTap.t<450;LAY.lastTap={id:D.id,t:now};
      if(LAY.sel===D.id&&!D.conv){if(dbl){LAY.lastTap=null;layRename(D.node)}return}
      LAY.sel=D.id;layRender();if(dbl){LAY.lastTap=null;const n=$(`#lay-stage .sp[data-el="${D.id}"]`);n&&layRename(n)}return}
    const lab=(e.elements.find(x=>x.id===D.id)||{}).label||'part';
    commit(`${D.h?'Resize':'Move'} “${lab}” on “${e.name}”`,p=>{const pe=p.entities[e.id];if(pe.layout!=='free'){pe.layout='free';for(const el of pe.elements)if(D.conv&&D.conv[el.id])el.box=D.conv[el.id]}const el=pe.elements.find(x=>x.id===D.id);if(el){const R=v=>Math.round(v*1e4)/1e4;el.box={x:R(D.b.x),y:R(D.b.y),w:R(D.b.w),h:R(D.b.h)}}layOrder(pe)});
    layRender();
  };
  root.addEventListener('pointerup',end);root.addEventListener('pointercancel',ev=>{if(LAY.drag){LAY.drag=null;layRender()}});
}
function layRename(n){
  const id=n.dataset.el;const e=layEnt();const el=e&&e.elements.find(x=>x.id===id);if(!el)return;LAY.sel=id;
  const inp=document.createElement('input');inp.className='lay-ren inp';inp.value=el.label;inp.setAttribute('aria-label','Rename part');n.appendChild(inp);inp.focus();inp.select();
  let done=false;const fin=ok=>{if(done)return;done=true;const v=inp.value.trim();if(ok&&v&&v!==el.label){commit(`Rename “${el.label}” to “${v}”`,p=>{const x=p.entities[e.id].elements.find(y=>y.id===id);if(x)x.label=v})}layRender()};
  inp.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();fin(true)}if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();fin(false)}});
  inp.addEventListener('blur',()=>fin(true));inp.addEventListener('pointerdown',ev=>ev.stopPropagation());
}
// Ways in: the editor's button, double-tap a part on a screen card
ACT['lay-open']=d=>layOpen(d.id||(S.sel&&S.sel.id),S.sel&&S.sel.t==='element'?S.sel.el:null);
const _reLay=renderEditor;
renderEditor=function(){const r=_reLay.apply(this,arguments);const s=S.sel;const ed=$('#editor');const e=s&&s.t!=='conn'&&S.p&&S.p.entities[s.id];
  if(e&&e.kind==='page'&&ed&&!ed.querySelector('[data-act=lay-open]')){const host=ed.querySelector('.ed-body')||ed;host.insertAdjacentHTML('afterbegin',`<button class="btn small lay-btn" data-act="lay-open" data-id="${e.id}">${icon('pen')}Edit screen layout${e.layout==='free'?' (free)':''}</button>`)}
  return r};
cardsEl.addEventListener('dblclick',ev=>{const sp=ev.target.closest('.scard .sp[data-el]');if(!sp)return;ev.stopPropagation();layOpen(sp.dataset.ent,sp.dataset.el)});
document.addEventListener('keydown',ev=>{const l=$('#lay');if(ev.key==='Escape'&&l&&!l.hidden&&!ev.target.closest('.lay-ren')&&!(l.contains(ev.target))){ev.preventDefault();ev.stopPropagation();layClose()}},true);

