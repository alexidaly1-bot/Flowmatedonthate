// =========================================================
// FM6 · USER-FLOW LAYOUT
// Left to right by journey step, one band per group so groups never overlap,
// rows ordered to cut down crossing lines, real card sizes when known.
// =========================================================
function flowSize(p,e,mode){
  const g=CE.g.get(e.id);if(g&&!g.est&&CE.mode===mode&&CE.pid===p.id)return{w:g.w,h:g.h};
  if(mode==='screens')return{w:curDev().w+40,h:(S.scrH[e.id]||estScreenH(e))+96};
  return estSize(e);
}
function flowLayout(p,mode){
  const scr=mode==='screens';
  const ents=Object.values(p.entities).filter(e=>!scr||e.kind==='page');if(!ents.length)return false;
  const links=scr?derivedEdges(p).map(d=>({a:d.from.entity,b:d.to})):Object.values(p.connections).map(c=>({a:c.from.entity,b:c.to}));
  const out=new Map(),inn=new Map();const has=new Set(ents.map(e=>e.id));
  for(const l of links){if(!has.has(l.a)||!has.has(l.b)||l.a===l.b)continue;(out.get(l.a)||out.set(l.a,[]).get(l.a)).push(l.b);(inn.get(l.b)||inn.set(l.b,[]).get(l.b)).push(l.a)}
  const start=p.startPageId&&has.has(p.startPageId)?p.startPageId:(ents.find(e=>e.kind==='page')||ents[0]).id;
  const depth=new Map([[start,0]]),parent={},order=[start];
  const bfs=q=>{while(q.length){const id=q.shift();for(const t of out.get(id)||[])if(!depth.has(t)){depth.set(t,depth.get(id)+1);parent[t]=id;order.push(t);q.push(t)}}};
  bfs([start]);
  // things nobody links to start their own little flow at the left
  for(const e of ents)if(!depth.has(e.id)&&!(inn.get(e.id)||[]).length){depth.set(e.id,0);order.push(e.id);bfs([e.id])}
  for(const e of ents)if(!depth.has(e.id)){depth.set(e.id,0);order.push(e.id);bfs([e.id])}
  const band=e=>e.moduleId&&p.modules[e.moduleId]?e.moduleId:null;
  const mods=Object.values(p.modules).sort((a,b)=>a.order-b.order).map(m=>m.id).concat([null]);
  const size=new Map(ents.map(e=>[e.id,flowSize(p,e,mode)]));
  const gapX=scr?190:150,gapY=scr?110:46,groupGapX=scr?260:220,groupGapY=scr?230:200;
  // 1. lay out each group on its own: columns = journey steps inside the group
  const groups=[];
  for(const mid of mods){
    const ids=order.filter(id=>band(p.entities[id])===mid);if(!ids.length)continue;
    const steps=[...new Set(ids.map(id=>depth.get(id)))].sort((a,b)=>a-b);const col=new Map(steps.map((d,i)=>[d,i]));
    const cols=[];for(const id of ids){const c=col.get(depth.get(id));(cols[c]=cols[c]||[]).push(id)}
    // barycentre ordering: sit each card level with the cards that lead to it
    const rank=new Map();cols[0].forEach((id,i)=>rank.set(id,i));
    for(let pass=0;pass<2;pass++)for(let d=pass?0:1;d<cols.length;d++){const c=cols[d];
      const key=id=>{const pr=(inn.get(id)||[]).filter(a=>rank.has(a)&&a!==id);return pr.length?pr.reduce((s,a)=>s+rank.get(a),0)/pr.length:(rank.has(id)?rank.get(id):1e3)};
      c.sort((a,b)=>key(a)-key(b));c.forEach((id,i)=>rank.set(id,i))}
    const pos=new Map();let x=0,H=0;
    for(const c of cols){const w=Math.max(...c.map(id=>size.get(id).w));let y=0;
      for(const id of c){const sz=size.get(id);pos.set(id,{x:x+(p.entities[id].kind==='decision'?Math.round((w-sz.w)/2):0),y});y+=sz.h+gapY}
      H=Math.max(H,y-gapY);x+=w+gapX}
    const nm=mid&&p.modules[mid]?p.modules[mid].name:'';
    groups.push({ids,pos,w:Math.max(x-gapX,nm.length*19+150),h:H});
  }
  // 2. pack the groups in rows, like a wall of screens, aiming for a landscape shape
  const area=groups.reduce((s,g)=>s+(g.w+groupGapX)*(g.h+groupGapY),0);
  const target=Math.max(Math.max(...groups.map(g=>g.w)),Math.sqrt(area*1.7));
  let gx=0,gy=0,rowH=0;
  for(const g of groups){
    if(gx>0&&gx+g.w>target){gx=0;gy+=rowH+groupGapY;rowH=0}
    for(const id of g.ids){const e=p.entities[id];const q=g.pos.get(id);if(scr){e.sx=gx+q.x;e.sy=gy+q.y}else{e.x=gx+q.x;e.y=gy+q.y}}
    gx+=g.w+groupGapX;rowH=Math.max(rowH,g.h);
  }
  if(!scr)for(const e of ents)if(!e.parentId||!p.entities[e.parentId])e.parentId=parent[e.id]||null;
  return true;
}
// New screens go into their own group's band, not a far-off column
screensLayout=function(p,all){
  const pages=Object.values(p.entities).filter(e=>e.kind==='page');if(!pages.length)return false;
  if(all||!pages.some(e=>e.sx!=null))return flowLayout(p,'screens');
  const miss=pages.filter(e=>e.sx==null);if(!miss.length)return false;
  const colW=curDev().w+220;
  for(const e of miss){
    const mates=pages.filter(o=>o!==e&&o.sx!=null&&(o.moduleId||null)===(e.moduleId||null));
    const par=e.parentId&&p.entities[e.parentId];
    if(par&&par.kind==='page'&&par.sx!=null&&(par.moduleId||null)===(e.moduleId||null)){e.sx=par.sx+colW;e.sy=par.sy;}
    else if(mates.length){e.sx=Math.max(...mates.map(o=>o.sx))+colW;e.sy=Math.min(...mates.map(o=>o.sy))}
    else{const placed=pages.filter(o=>o.sx!=null);e.sx=0;e.sy=placed.length?Math.max(...placed.map(o=>o.sy+(S.scrH[o.id]||estScreenH(o))+96))+170:0}
    // step down until it does not sit on top of another screen
    const h=estScreenH(e)+96,w=curDev().w+40;let guard=0;
    while(guard++<40&&pages.some(o=>o!==e&&o.sx!=null&&Math.abs(o.sx-e.sx)<w&&e.sy<o.sy+(S.scrH[o.id]||estScreenH(o))+96&&o.sy<e.sy+h))e.sx+=colW;
  }
  return true;
};
autoLayout=function(p){return flowLayout(p,'blocks')};
ACT.tidy=()=>{commit('Tidy up layout',p=>flowLayout(p,isScreens()?'screens':'blocks'));S.ovDismiss=null;requestAnimationFrame(fitAll)};

