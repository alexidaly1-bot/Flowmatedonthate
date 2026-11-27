
// =========================================================
// FM6 · CANVAS ENGINE
// Keyed cards (only changed cards are rebuilt), cached port offsets (no layout
// reads while drawing links), viewport culling for big maps, a GPU layer only
// while moving, and safe drawing (a failure never takes the app down).
// =========================================================
const IX={p:null,depth:0};
function ixBuild(p){
  const out=new Map(),inn=new Map(),kids=new Map();
  for(const c of Object.values(p.connections)){const a=c.from.entity;let o=out.get(a);if(!o)out.set(a,o=[]);o.push(c);let i=inn.get(c.to);if(!i)inn.set(c.to,i=[]);i.push(c)}
  for(const e of Object.values(p.entities))if(e.parentId){let k=kids.get(e.parentId);if(!k)kids.set(e.parentId,k=[]);k.push(e.id)}
  IX.out=out;IX.inn=inn;IX.kids=kids;IX.desc=new Map();IX.p=p;
}
function withIX(fn){const p=S.p;if(!p||IX.p===p)return fn();ixBuild(p);try{return fn()}finally{IX.p=null}}
const _ocOrig=outConns,_icOrig=inConns,_dsOrig=descendants;
outConns=function(p,id,elId){if(IX.p!==p)return _ocOrig(p,id,elId);const a=IX.out.get(id)||[];return elId===undefined?a.slice():a.filter(c=>(c.from.element||null)===(elId||null))};
inConns=function(p,id){return IX.p===p?(IX.inn.get(id)||[]).slice():_icOrig(p,id)};
descendants=function(p,id){
  if(IX.p!==p)return _dsOrig(p,id);let s=IX.desc.get(id);
  if(!s){s=new Set();const st=[...(IX.kids.get(id)||[])];while(st.length){const k=st.pop();if(s.has(k)||k===id)continue;s.add(k);const kk=IX.kids.get(k);if(kk)st.push(...kk)}IX.desc.set(id,s)}
  return new Set(s);
};

// ---------- Safe drawing: one failure shows a note instead of a blank app ----------
const FAULTS={n:0,last:0};
function safeRun(name,fn){return function(){try{return fn.apply(this,arguments)}catch(err){FAULTS.n++;console.error('[FlowMate] '+name,err);if(Date.now()-FAULTS.last>4000){FAULTS.last=Date.now();try{toast('Part of the screen could not be drawn. Your work is saved.')}catch(e){}}}}}

// ---------- Cards ----------
const CE={nodes:new Map(),g:new Map(),html:new Map(),ids:[],all:true,tpl:document.createElement('template'),CULL:90,raf:0,mm:0,saveT:0,gestT:0,col:null};
const CE_GHOST=document.createElement('div');
function ceEst(e){if(isScreens()&&e.kind==='page')return{w:curDev().w+40,h:(S.scrH[e.id]||estScreenH(e))+96};return estSize(e)}
function ceRect(m){const r=vp.getBoundingClientRect();const z=S.view.z||1;const x0=-S.view.x/z,y0=-S.view.y/z,w=r.width/z,h=r.height/z;return{x0:x0-w*m,y0:y0-h*m,x1:x0+w*(1+m),y1:y0+h*(1+m)}}
function ceMeasure(e,n){
  const g={w:n.offsetWidth,h:n.offsetHeight,dec:n.classList.contains('decision'),scard:n.classList.contains('scard'),ports:{},hdY:24};
  const hd=n.querySelector('.hd');if(hd)g.hdY=hd.offsetTop+hd.offsetHeight/2;
  const rows=n.querySelectorAll('[data-el]');
  if(rows.length){const cr=n.getBoundingClientRect();const z=S.view.z||1;for(const r of rows){if(!r.offsetParent)continue;const rr=r.getBoundingClientRect();g.ports[r.dataset.el]={dy:(rr.top+rr.height/2-cr.top)/z,dx:(rr.right-cr.left)/z}}}
  if(g.scard){const dv=n.querySelector('.dev');if(dv)S.scrH[e.id]=dv.offsetHeight-14}
  return g;
}
function cePinned(id){return (S.sel&&S.sel.id===id)||(G&&(G.id===id||(G.from&&G.from.entity===id)))||(S.multi&&S.multi.has&&S.multi.has(id))}
// Mount the cards that are on (or near) the screen; returns how many were (re)measured
function ceSync(){
  const p=S.p;const ids=CE.ids;const cull=ids.length>CE.CULL;const R=cull?ceRect(.6):null;
  const keep=[];
  for(const id of ids){const e=p.entities[id];if(!e)continue;
    if(R&&!cePinned(id)){const x=PX(e),y=PY(e);const old=CE.g.get(id);const es=old&&!old.est?old:ceEst(e);if(!(x<R.x1&&x+es.w>R.x0&&y<R.y1&&y+es.h>R.y0))continue}
    keep.push(id)}
  const ks=new Set(keep);
  for(const [id,n] of CE.nodes)if(!ks.has(id)||n.parentNode!==cardsEl){n.remove();CE.nodes.delete(id)}
  const fresh=[];let at=cardsEl.firstElementChild;
  for(const id of keep){
    const h=CE.html.get(id);let n=CE.nodes.get(id);
    if(!n||n._h!==h){CE.tpl.innerHTML=h;const nn=CE.tpl.content.firstElementChild;nn._h=h;if(n){if(at===n)at=nn;n.replaceWith(nn)}n=nn;CE.nodes.set(id,n);fresh.push(id)}
    if(at!==n)cardsEl.insertBefore(n,at);else at=at.nextElementSibling;
  }
  while(at){const nx=at.nextElementSibling;if(!at.dataset||!CE.nodes.has(at.dataset.id))at.remove();at=nx}
  const meas=CE.all?keep:fresh;CE.all=false;let changed=0;
  for(const id of meas){const e=p.entities[id];const n=CE.nodes.get(id);const old=CE.g.get(id);const g=ceMeasure(e,n);
    if(!old||old.est||Math.abs(old.w-g.w)>1||Math.abs(old.h-g.h)>1||JSON.stringify(old.ports)!==JSON.stringify(g.ports))changed++;CE.g.set(id,g)}
  const geo={};
  for(const id of ids){const e=p.entities[id];if(!e)continue;let g=CE.g.get(id);
    if(!g){const es=ceEst(e);g={w:es.w,h:es.h,dec:e.kind==='decision',scard:isScreens()&&e.kind==='page',ports:{},hdY:24,est:true};CE.g.set(id,g)}
    g.x=PX(e);g.y=PY(e);g.node=CE.nodes.get(id)||CE_GHOST;geo[id]=g}
  S.geo=geo;
  return changed;
}
renderCanvas=safeRun('canvas',function(){
  const p=S.p;if(!p)return;
  withIX(()=>{
    const scr=isScreens();vp.classList.toggle('mode-screens',scr);
    if(scr){ensureScreenPositions(p);S.heavy=computeHeavy(p)}
    if(CE.mode!==S.prefs.view||CE.pid!==p.id){CE.g.clear();CE.mode=S.prefs.view;CE.pid=p.id;CE.all=true}
    const {vis}=visibleSet(p);
    const hidCount={};for(const e of Object.values(p.entities))if(e.collapsed)hidCount[e.id]=descendants(p,e.id).size;
    const html=new Map(),ids=[];
    for(const e of Object.values(p.entities))if(vis.has(e.id)){html.set(e.id,cardHTML(p,e,hidCount[e.id]));ids.push(e.id)}
    CE.html=html;CE.ids=ids;
    for(const id of [...CE.g.keys()])if(!html.has(id))CE.g.delete(id);
    ceSync();
    CE.col=null;
    renderFrames(vis);renderEdges(vis);applyTraceClasses();renderMinimap();renderCrumbs();renderTray();
    for(const [id,n] of CE.nodes)n.classList.toggle('msel',!!(S.multi&&S.multi.has(id)));
    if(typeof renderMultiBar==='function')renderMultiBar();
    const eh=$('#emptyHint');
    if(!Object.keys(p.entities).length){eh.hidden=false;eh.innerHTML=`<div><h2 class="disp">Start with one page</h2><p>Add a page, then add its buttons. Drag a button's dot onto another card to link them.</p><button class="btn primary" data-act="add-page">${icon('plus')}Add a page</button></div>`}else eh.hidden=true;
    frameCheck();
  });
});
// Every page in range draws as a real screen, at any zoom
computeHeavy=function(p){const s=new Set();for(const e of Object.values(p.entities))if(e.kind==='page')s.add(e.id);return s};
scheduleHeavy=function(){};
// Cull tick: as the view moves, mount what comes into range and drop what leaves
function ceTick(){CE.raf=0;if(!S.p||!CE.ids.length)return;
  if(CE.ids.length>CE.CULL){const ch=ceSync();if(ch){const{vis}=visibleSet(S.p);withIX(()=>{renderFrames(vis);renderEdges(vis)});applyTraceClasses()}}
  renderMinimap();
}
// Cheap view updates: no inherited CSS variables, a GPU layer only while moving
applyView=function(){
  const{x,y,z}=S.view;
  world.style.transform=`translate(${x}px,${y}px) scale(${z})`;
  if(!world.classList.contains('moving'))world.classList.add('moving');
  clearTimeout(CE.gestT);CE.gestT=setTimeout(()=>{world.classList.remove('moving')},220);
  let gs=24*z;while(gs<14)gs*=2;while(gs>48)gs/=2;
  vp.style.backgroundSize=gs+'px '+gs+'px';vp.style.backgroundPosition=(x%gs)+'px '+(y%gs)+'px';
  const pct=Math.round(z*100);const zp=$('#zoomPct');
  const l=zoomLevel(z);
  if(l!==S.zl||zp._p!==pct){
    const lvl=['','Modules','Pages','Buttons','Full detail','Screens & notes','Technical'][l];
    zp.textContent=pct+'%';zp._p=pct;zp.title='Detail level: '+lvl+'. Tap for 100%.';zp.setAttribute('aria-label',pct+'% zoom, showing '+lvl+'. Tap for 100%.');
  }
  if(l!==S.zl){vp.classList.remove('zl-'+S.zl);S.zl=l;vp.classList.add('zl-'+l);CE.all=true;renderCanvas()}
  const fb=clamp(1/z,1,6).toFixed(2);if(framesEl._fb!==fb){framesEl._fb=fb;framesEl.style.setProperty('--fboost',fb)}
  if(!CE.raf)CE.raf=requestAnimationFrame(ceTick);
  if(S.p){clearTimeout(CE.saveT);const pid=S.p.id,v=JSON.stringify(S.view);CE.saveT=setTimeout(()=>Store.set('fm.view.'+pid,v),400)}
};
// Minimap: colours read once per draw pass, drawn at most once a frame
renderMinimap=function(){
  const cv=$('#minimap');if(!cv||!S.p||cv.offsetParent===null)return;
  if(!CE.col){const css=getComputedStyle(document.documentElement);CE.col={css,line:css.getPropertyValue('--line').trim(),ink:css.getPropertyValue('--ink').trim(),m:{}}}
  const C=CE.col;const mc=k=>C.m[k]!==undefined?C.m[k]:(C.m[k]=C.css.getPropertyValue('--m-'+k).trim());const ctx=cv.getContext('2d');const W=cv.width,H=cv.height;ctx.clearRect(0,0,W,H);
  const bb=bounds(Object.keys(S.geo));if(!bb)return;
  const r=vp.getBoundingClientRect();
  const vx=-S.view.x/S.view.z,vy=-S.view.y/S.view.z,vw=r.width/S.view.z,vh=r.height/S.view.z;
  const ax=Math.min(bb.x,vx),ay=Math.min(bb.y,vy),bx=Math.max(bb.x+bb.w,vx+vw),by=Math.max(bb.y+bb.h,vy+vh);
  const s=Math.min((W-24)/(bx-ax),(H-24)/(by-ay));const ox=12-ax*s+((W-24)-(bx-ax)*s)/2,oy=12-ay*s+((H-24)-(by-ay)*s)/2;
  cv._map={s,ox,oy};ctx.strokeStyle=C.line;ctx.lineWidth=1;
  for(const[id,g] of Object.entries(S.geo)){const e=S.p.entities[id];if(!e)continue;const m=S.p.modules[e.moduleId];ctx.fillStyle=mc(m?m.colour:'coral')||'#E1ECFF';ctx.globalAlpha=S.trace&&!S.trace.ents.has(id)?.25:1;ctx.beginPath();ctx.roundRect(g.x*s+ox,g.y*s+oy,Math.max(2,g.w*s),Math.max(2,g.h*s),2);ctx.fill();ctx.stroke()}
  ctx.globalAlpha=1;ctx.strokeStyle=C.ink;ctx.lineWidth=2.5;ctx.beginPath();ctx.roundRect(vx*s+ox,vy*s+oy,vw*s,vh*s,6);ctx.stroke();
};
// Ports from the cache: no layout reads while drawing links
portPos=function(c){
  const g=S.geo[c.from.entity],t=S.geo[c.to];if(!g||!t)return null;
  let x1=g.x+g.w+(g.dec?-14:1),y1=g.y+g.hdY;const pr=c.from.element&&g.ports[c.from.element];
  if(pr){y1=g.y+pr.dy;if(g.scard)x1=g.x+pr.dx+3}
  return{x1,y1,x2:t.x+(t.dec?14:0),y2:t.y+(t.dec?t.h/2:t.hdY)};
};

// ---------- Groups: big ones behind, labels always on top, overlap warning ----------
renderFrames=function(vis){
  const p=S.p;const fr=[];
  for(const m of Object.values(p.modules).sort((a,b)=>a.order-b.order)){
    const ids=Object.values(p.entities).filter(e=>e.moduleId===m.id&&vis.has(e.id)).map(e=>e.id);
    const bb=bounds(ids);if(!bb)continue;
    const pages=Object.values(p.entities).filter(e=>e.moduleId===m.id&&e.kind==='page').length;
    const pad=26;fr.push({m,pages,x:bb.x-pad,y:bb.y-pad,w:bb.w+pad*2,h:bb.h+pad*2});
  }
  fr.sort((a,b)=>b.w*b.h-a.w*a.h);
  let html='',lab='';
  for(const f of fr){
    const st=`left:${f.x}px;top:${f.y}px;width:${f.w}px;--mc:var(--m-${f.m.colour})`;
    html+=`<div class="frame" data-mod="${f.m.id}" style="${st};height:${f.h}px"></div>`;
    lab+=`<div class="frame flonly" style="${st};height:0"><div class="fl">${esc(f.m.name)}<small>${f.pages} page${f.pages===1?'':'s'}</small></div></div>`;
  }
  framesEl.innerHTML=html+lab;
  // overlap between different groups (ignores tiny touches)
  // a real problem only when a card sits inside another group's area
  const ov=[],seen=new Set();
  for(const f of fr)for(const[id,g] of Object.entries(S.geo)){const e=p.entities[id];if(!e||!e.moduleId||e.moduleId===f.m.id||!p.modules[e.moduleId])continue;const cx=g.x+g.w/2,cy=g.y+Math.min(g.h,120)/2;
    if(cx>f.x&&cx<f.x+f.w&&cy>f.y&&cy<f.y+f.h){const k=[f.m.id,e.moduleId].sort().join('|');if(!seen.has(k)){seen.add(k);ov.push([p.modules[e.moduleId].name,f.m.name])}}}
  S.frameOverlap=ov;
};
function frameCheck(){
  let el=$('#ovwarn');const show=S.frameOverlap&&S.frameOverlap.length&&!(S.ovDismiss&&S.ovDismiss===S.p.id+'|'+S.prefs.view)&&!$('#play:not([hidden])');
  if(!show){if(el)el.hidden=true;return}
  if(!el){el=document.createElement('div');el.id='ovwarn';el.className='ovwarn';el.setAttribute('role','status');vp.appendChild(el)}
  const [a,b]=S.frameOverlap[0];const n=S.frameOverlap.length;
  el.innerHTML=`${icon('alert')}<span><b>Groups overlap.</b> A “${esc(a)}” card sits inside “${esc(b)}”${n>1?`, and ${n-1} more`:''}.</span><button class="btn small primary" data-act="tidy">${icon('tidy')}Tidy up</button><button class="btn small ghost" data-act="ov-dismiss" aria-label="Not now">Not now</button>`;
  el.hidden=false;
}
ACT['ov-dismiss']=()=>{S.ovDismiss=S.p.id+'|'+S.prefs.view;frameCheck()};

// ---------- Links: orthogonal lanes, loops around for back links, Yes/No markers ----------
const YES_RE=/^(yes|y|true|ok|okay|success|succeeded|allowed|valid|pass(ed)?|signed in|logged in|found|paid|approved|done|confirm(ed)?)\b/i;
const NO_RE=/^(no|n|false|fail(ed|ure)?|denied|invalid|error|not\b|cancel(led)?|declined|missing|rejected|wrong|blocked)/i;
function ynOf(c){const l=(c.label||'').trim();if(!l)return '';if(YES_RE.test(l))return 'yes';if(NO_RE.test(l))return 'no';return ''}
function routeD(pp,lane,g,t){
  const{x1,y1,x2,y2}=pp;const r=10;
  if(S.prefs.lines==='curved')return pathD(x1,y1,x2,y2);
  const corner=(pts)=>{let d=`M${pts[0][0]},${pts[0][1]}`;for(let i=1;i<pts.length-1;i++){const[a,b]=pts[i-1],[cx,cy]=pts[i],[e,f]=pts[i+1];const l1=Math.hypot(cx-a,cy-b),l2=Math.hypot(e-cx,f-cy);const rr=Math.min(r,l1/2,l2/2);if(rr<1){d+=` L${cx},${cy}`;continue}const ux=(cx-a)/l1,uy=(cy-b)/l1,vx=(e-cx)/l2,vy=(f-cy)/l2;d+=` L${cx-ux*rr},${cy-uy*rr} Q${cx},${cy} ${cx+vx*rr},${cy+vy*rr}`}const L=pts[pts.length-1];return d+` L${L[0]},${L[1]}`};
  if(x2>=x1+44){
    if(Math.abs(y2-y1)<2)return `M${x1},${y1} L${x2-6},${y2}`;
    let mx=x1+20+lane*12;if(mx>x2-22)mx=Math.round((x1+x2)/2);
    return corner([[x1,y1],[mx,y1],[mx,y2],[x2-6,y2]]);
  }
  // back link or same column: go out right, round below both cards, come in from the left
  const gb=g?g.y+g.h:y1,tb=t?t.y+t.h:y2;const yb=Math.max(gb,tb)+28+lane*10;const xa=x1+20+lane*12,xb=x2-26-lane*6;
  return corner([[x1,y1],[xa,y1],[xa,yb],[xb,yb],[xb,y2],[x2-6,y2]]);
}
renderEdges=function(vis){
  const p=S.p;const items=[];
  let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
  for(const c of edgeList(p,vis)){const pp=portPos(c);if(!pp)continue;items.push([c,pp])}
  if(!items.length){edgesEl.innerHTML='';labelsEl.innerHTML='';return}
  // lanes: links leaving the same card get their own vertical track, ordered by where they go
  const bySrc=new Map();for(const it of items){const k=it[0].from.entity;let a=bySrc.get(k);if(!a)bySrc.set(k,a=[]);a.push(it)}
  const lane=new Map();for(const a of bySrc.values()){a.sort((u,v)=>(u[1].y2-u[1].y1)-(v[1].y2-v[1].y1));const up=a.filter(x=>x[1].y2<x[1].y1),dn=a.filter(x=>x[1].y2>=x[1].y1);up.reverse().forEach((x,i)=>lane.set(x[0],i));dn.forEach((x,i)=>lane.set(x[0],i))}
  const scr=isScreens();
  let defs='<defs>';for(const[k,v] of Object.entries(FAMS))defs+=`<marker id="mk-${k}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.6" markerHeight="4.6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(${v.col})"/></marker>`;defs+='</defs>';
  let paths='',labels='';
  for(const[c,pp] of items){
    const def=CONN[c.type]||CONN.navigate;const fam=famOf(c.type);const fd=FAMS[fam];if(S.linkHide.has(fam))continue;
    const g=S.geo[c.from.entity],t=S.geo[c.to];const d=routeD(pp,lane.get(c)||0,g,t);
    const back=pp.x2<pp.x1+44;const yb=back?Math.max(g.y+g.h,t.y+t.h)+28+(lane.get(c)||0)*10:0;
    minx=Math.min(minx,pp.x1,pp.x2-40);miny=Math.min(miny,pp.y1,pp.y2);maxx=Math.max(maxx,pp.x1+80,pp.x2);maxy=Math.max(maxy,pp.y1,pp.y2,yb);
    const sel=S.sel&&S.sel.t==='conn'&&S.sel.id===c.connId;
    paths+=`<path class="ln f-${fam}${sel?' sel':''}" data-c="${c.connId}" d="${d}" style="stroke:var(${fd.col})" ${fd.dash?`stroke-dasharray="${fd.dash}"`:''} marker-end="url(#mk-${fam})"/><path class="hit" data-conn="${c.connId}" d="${d}"><title>${fd.label} link: ${esc(def.label)}${c.label?': '+esc(c.label):''}</title></path>`;
    const yn=ynOf(c);const mark=yn?`<b class="ynm ${yn}" aria-label="${yn==='yes'?'Yes':'No'}">${yn==='yes'?'✓':'✗'}</b>`:'';
    const lx=scr?pp.x2-8:back?pp.x2-34:pp.x2-Math.min(70,(pp.x2-pp.x1)/2.5),ly=scr?pp.y2-4:pp.y2;
    labels+=c.label?`<div class="elabel f-${fam}${c.type==='condition'?' dec':''}${yn?' yn-'+yn:''}${scr?' r':''}" data-lc="${c.connId}" style="left:${lx}px;top:${ly}px">${mark||'<i class="g" aria-hidden="true"></i>'}<span class="lt">${esc(c.label)}</span></div>`:`<div class="elabel badge f-${fam}${scr?' r':''}" data-lc="${c.connId}" style="left:${lx}px;top:${ly}px" aria-hidden="true"><i class="g"></i></div>`;
  }
  const ox=Math.floor(minx-60),oy=Math.floor(miny-60),w=Math.ceil(maxx-minx+120),h=Math.ceil(maxy-miny+120);
  edgesEl.setAttribute('width',w);edgesEl.setAttribute('height',h);edgesEl.style.left=ox+'px';edgesEl.style.top=oy+'px';edgesEl.setAttribute('viewBox',`${ox} ${oy} ${w} ${h}`);
  edgesEl.innerHTML=defs+paths;labelsEl.innerHTML=labels;
};
// Theme, text size, fonts: card sizes change, so measure again
const _apOrig6=applyPrefs;applyPrefs=function(){const r=_apOrig6.apply(this,arguments);CE.all=true;CE.col=null;return r};
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{CE.all=true;S.p&&renderCanvas()});
window.addEventListener('resize',()=>{if(!CE.raf)CE.raf=requestAnimationFrame(ceTick)});
renderEditor=safeRun('editor',(function(f){return function(){return withIX(()=>f.apply(this,arguments))}})(renderEditor));
renderPanel=safeRun('panel',(function(f){return function(){return withIX(()=>f.apply(this,arguments))}})(renderPanel));
renderSidebar=safeRun('sidebar',renderSidebar);
// Undo history: keep it under about 12 MB of snapshots
const _puOrig6=pushUndo;pushUndo=function(label,before){const r=_puOrig6.apply(this,arguments);let tot=0;for(const h of S.undo)tot+=h.json.length;while(tot>6e6&&S.undo.length>15){tot-=S.undo[0].json.length;S.undo.shift()}return r};
// Saving: skip identical writes
saveLocal=function(p){const j=JSON.stringify(p);const k=p.id+'|'+j.length+'|'+hashStr(j);if(CE.lastSave===k)return;CE.lastSave=k;Store.set('fm.p.'+p.id,j);const idx=JSON.stringify(Object.keys(S.projects));if(CE.lastIdx!==idx){CE.lastIdx=idx;Store.set('fm.index',idx)}};
