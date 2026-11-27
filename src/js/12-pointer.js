// =========================================================
// POINTER — pan, pinch, drag cards, draw links
// =========================================================
const ptrs=new Map();let G=null;
vp.addEventListener('pointerdown',ev=>{
  const trayPart=ev.target.closest('[data-part]');
  if(trayPart){vp.setPointerCapture?.(ev.pointerId);ptrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});G={type:'tray',part:trayPart.dataset.part,sx:ev.clientX,sy:ev.clientY,moved:false};return}
  if(ev.target.closest('#tray'))return;
  if(ev.target.closest('.overlay,#minimap,#panel,#dropMenu,.crumbs,#traceBar,.empty-hint div,.fab,.collapse-btn,#lkey,#ovwarn,.tray-ctl'))return;
  vp.setPointerCapture?.(ev.pointerId);
  ptrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  if(ptrs.size===2){const[a,b]=[...ptrs.values()];G={type:'pinch',d:Math.hypot(a.x-b.x,a.y-b.y),mx:(a.x+b.x)/2,my:(a.y+b.y)/2,z:S.view.z};return}
  hideDropMenu();
  const port=ev.target.closest('[data-port]');
  if(port){G={type:'link',from:{entity:port.dataset.ent,element:port.dataset.port==='el'?port.dataset.el:null},sx:ev.clientX,sy:ev.clientY,moved:false};return}
  const hit=ev.target.closest('[data-conn]');
  if(hit){G={type:'tapconn',id:hit.dataset.conn,sx:ev.clientX,sy:ev.clientY};return}
  const card=ev.target.closest('.card');
  if(card){
    const id=card.dataset.id;const e=S.p.entities[id];const elRow=ev.target.closest('[data-el]');
    const canDrag=ev.pointerType!=='touch'||(S.sel&&S.sel.id===id);
    if(canDrag&&elRow&&card.classList.contains('scard')){G={type:'part',id,el:elRow.dataset.el,sx:ev.clientX,sy:ev.clientY,vx:S.view.x,vy:S.view.y,moved:false};return}
    G={type:canDrag?'drag':'pan-or-tap',id,el:elRow?elRow.dataset.el:null,sx:ev.clientX,sy:ev.clientY,ox:PX(e),oy:PY(e),vx:S.view.x,vy:S.view.y,moved:false,before:null};
    return;
  }
  G={type:'pan',sx:ev.clientX,sy:ev.clientY,vx:S.view.x,vy:S.view.y,moved:false};
});
vp.addEventListener('pointermove',ev=>{
  if(!ptrs.has(ev.pointerId)||!G)return;ptrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  if(G.type==='pinch'&&ptrs.size>=2){const[a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);const r=vp.getBoundingClientRect();const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;S.view.x+=mx-G.mx;S.view.y+=my-G.my;G.mx=mx;G.my=my;zoomAt(mx-r.left,my-r.top,G.z*d/G.d);return}
  const dx=ev.clientX-G.sx,dy=ev.clientY-G.sy;if(!G.moved&&Math.hypot(dx,dy)<5)return;if(!G.moved&&G.before===null)G.before=JSON.stringify(S.p);G.moved=true;
  if(G.type==='pan'||G.type==='pan-or-tap'){S.view.x=G.vx+dx;S.view.y=G.vy+dy;applyView()}
  else if(G.type==='drag'){
    const e=S.p.entities[G.id];const nx=Math.round(G.ox+dx/S.view.z),ny=Math.round(G.oy+dy/S.view.z);setPos(e,nx,ny);
    const g=S.geo[G.id];if(g){g.x=nx;g.y=ny;g.node.style.left=nx+'px';g.node.style.top=ny+'px';g.node.classList.add('dragging')}
    if(!G.raf)G.raf=requestAnimationFrame(()=>{if(G)G.raf=0;const{vis}=visibleSet(S.p);withIX(()=>{renderFrames(vis);renderEdges(vis)})});
  }
  else if(G.type==='tray'||G.type==='part'){dragMove(G,ev)}
  else if(G.type==='link'){
    const w=toWorld(ev.clientX,ev.clientY);const g=S.geo[G.from.entity];
    let y1=g.y+30;if(G.from.element){const row=elNode(g.node,G.from.element);if(row){const cr=g.node.getBoundingClientRect(),rr=row.getBoundingClientRect();y1=g.y+(rr.top+rr.height/2-cr.top)/S.view.z}}
    let tmp=edgesEl.querySelector('#tmpLink');
    const x1=g.x+g.w;const minx=Math.min(x1,w.x)-400,miny=Math.min(y1,w.y)-400;
    if(!edgesEl.getAttribute('viewBox')||!tmp){edgesEl.setAttribute('width',100000);edgesEl.setAttribute('height',100000);edgesEl.style.left='-50000px';edgesEl.style.top='-50000px';edgesEl.setAttribute('viewBox','-50000 -50000 100000 100000')}
    if(!tmp){edgesEl.insertAdjacentHTML('beforeend','<path id="tmpLink" class="ln" style="stroke:var(--coral)" stroke-dasharray="6 6"/>');tmp=edgesEl.querySelector('#tmpLink')}
    tmp.setAttribute('d',`M${x1},${y1} C${x1+80},${y1} ${w.x-80},${w.y} ${w.x},${w.y}`);
    $$('.card.hot',cardsEl).forEach(n=>n.classList.remove('hot'));
    const over=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.card');if(over&&over.dataset.id!==G.from.entity)over.classList.add('hot');
  }
});
function endPointer(ev){
  ptrs.delete(ev.pointerId);if(!G)return;
  if(G.type==='pinch'){if(ptrs.size<2)G=null;return}
  const g=G;G=null;
  if(g.type==='tray'){if(g.moved)dragDrop(g,ev);else{clearDrag();trayTap(g.part)}return}
  if(g.type==='part'){if(g.moved)dragDrop(g,ev);else{clearDrag();tapCard(g)}return}
  if(g.type==='drag'){
    if(g.moved){const now=JSON.stringify(S.p);if(now!==g.before){pushUndo('Move card',g.before);touch()}renderCanvas();return}
    tapCard(g);return;
  }
  if(g.type==='pan-or-tap'){if(!g.moved)tapCard(g);return}
  if(g.type==='tapconn'){select({t:'conn',id:g.id});return}
  if(g.type==='pan'){if(!g.moved){if(S.sel||S.trace){S.sel=null;S.trace=null;renderCanvas();renderEditor()}}return}
  if(g.type==='link'){
    const tmp=edgesEl.querySelector('#tmpLink');tmp&&tmp.remove();$$('.card.hot',cardsEl).forEach(n=>n.classList.remove('hot'));
    if(!g.moved){if(g.from.element)select({t:'element',id:g.from.entity,el:g.from.element,scroll:true});else select({t:'entity',id:g.from.entity});renderEdges(visibleSet(S.p).vis);return}
    const over=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.card');
    if(over&&over.dataset.id!==g.from.entity){const c=commit('Link to '+entityLabel(S.p,over.dataset.id),p=>addConn(p,g.from,over.dataset.id));c&&select({t:'conn',id:c.id});return}
    renderEdges(visibleSet(S.p).vis);
    const r=vp.getBoundingClientRect();const w=toWorld(ev.clientX,ev.clientY);
    showDropMenu(ev.clientX-r.left,ev.clientY-r.top,g.from,'Make something new here',w);
  }
}
function tapCard(g){if(g.el)select({t:'element',id:g.id,el:g.el,scroll:true});else select({t:'entity',id:g.id})}
vp.addEventListener('pointerup',endPointer);vp.addEventListener('pointercancel',ev=>{ptrs.delete(ev.pointerId);clearDrag();if(G&&G.type==='drag'&&G.moved){pushUndo('Move card',G.before);touch()}G=null;renderCanvas()});
vp.addEventListener('wheel',ev=>{
  if(ev.target.closest('#panel,#dropMenu,#lkey,#tray'))return;ev.preventDefault();
  const r=vp.getBoundingClientRect();
  if(ev.ctrlKey||ev.metaKey)zoomAt(ev.clientX-r.left,ev.clientY-r.top,S.view.z*Math.exp(-ev.deltaY*.01));
  else{S.view.x-=ev.deltaX;S.view.y-=ev.deltaY;applyView()}
},{passive:false});
vp.addEventListener('dblclick',ev=>{if(ev.target.closest('.card,.overlay,#panel,#minimap'))return;const w=toWorld(ev.clientX,ev.clientY);const r=vp.getBoundingClientRect();showDropMenu(ev.clientX-r.left,ev.clientY-r.top,null,'Add a card here',w)});
vp.addEventListener('keydown',ev=>{const c=ev.target.closest&&ev.target.closest('.card');if(c&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();select({t:'entity',id:c.dataset.id})}});
$('#minimap').addEventListener('pointerdown',ev=>{
  const cv=ev.currentTarget;const m=cv._map;if(!m)return;const b=cv.getBoundingClientRect();
  const move=e2=>{const mx=(e2.clientX-b.left)*cv.width/b.width,my=(e2.clientY-b.top)*cv.height/b.height;const wx=(mx-m.ox)/m.s,wy=(my-m.oy)/m.s;const r=vp.getBoundingClientRect();S.view.x=r.width/2-wx*S.view.z;S.view.y=r.height/2-wy*S.view.z;applyView()};
  rememberView();move(ev);cv.setPointerCapture(ev.pointerId);cv.onpointermove=move;cv.onpointerup=()=>{cv.onpointermove=null};
});

document.addEventListener('keydown',ev=>{
  if(typeof PL!=='undefined'&&PL.open&&$('#modal').classList.contains('hide')&&!($('#web')&&!$('#web').hidden)){if(ev.key==='Escape'){ev.preventDefault();if(PL.sheet){PL.sheet=null;renderPlay()}else closePlay()}else if(ev.key==='ArrowLeft'&&!ev.target.matches('input,select')){plBack()}return}
  const typing=ev.target.matches('input,textarea,select');
  if(ev.key==='Escape'){if(!$('#modal').classList.contains('hide'))return closeModal();hideDropMenu();if(S.trace){S.trace=null;return renderCanvas()}if(S.sel&&!typing){S.sel=null;renderCanvas();renderEditor()}return}
  if(!$('#modal').classList.contains('hide')||!$('#home').classList.contains('hide')||!S.p)return;
  const mod=ev.ctrlKey||ev.metaKey;
  if(mod&&ev.key.toLowerCase()==='z'&&!typing){ev.preventDefault();ev.shiftKey?redo():undo();return}
  if(mod&&ev.key.toLowerCase()==='y'&&!typing){ev.preventDefault();redo();return}
  if(typing)return;
  if(ev.key==='/'||(mod&&ev.key.toLowerCase()==='k')){ev.preventDefault();window.innerWidth<=760?searchModal():$('#q').focus();return}
  if(ev.key==='f'||ev.key==='F')fitAll();
  if(ev.key==='+'||ev.key==='=')zoomBy(1.25);
  if(ev.key==='-')zoomBy(.8);
  if((ev.key==='Delete'||ev.key==='Backspace')&&S.sel){ev.preventDefault();if(S.sel.t==='conn')ACT['conn-del']({id:S.sel.id});else if(S.sel.t==='element')ACT['el-del']({el:S.sel.el});else ACT['del-entity']()}
});

