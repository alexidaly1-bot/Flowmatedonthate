// =========================================================
// FM6 · ACTIVITY & REASONING LOG
// Every change is recorded (manual or Smart Action), even with the panel shut.
// Reasons are only ever what was stated: the AI's own purpose, or the
// objective the person set. Nothing is guessed for manual changes.
// =========================================================
const LOG={next:null,mode:'activity',q:[],t:0};
// What changed is worked out just after the change, so editing stays quick
function logSchedule(){if(LOG.t)return;const run=()=>{LOG.t=0;logFlush()};LOG.t=window.requestIdleCallback?requestIdleCallback(run,{timeout:600}):setTimeout(run,60)}
function logFlush(){
  const q=LOG.q;LOG.q=[];if(!q.length)return;let any=false;
  for(let i=0;i<q.length;i++){const it=q[i];if(!S.p||S.p.id!==it.pid){it.ent.ch=[];continue}
    let ch=[];try{const after=i+1<q.length&&q[i+1].pid===it.pid?JSON.parse(q[i+1].before):S.p;ch=logDiff(JSON.parse(it.before),after)}catch(e){}
    it.ent.ch=ch.slice(0,40);if(ch.length>40)it.ent.more=ch.length-40;any=true}
  if(any&&S.p){saveLocal(S.p);if(S.panel==='activity')renderPanel()}
}
function logNorm(p){if(!Array.isArray(p.activity))p.activity=[];if(!Array.isArray(p.objectives))p.objectives=[];if(p.objActive&&!p.objectives.some(o=>o.id===p.objActive&&!o.end))p.objActive=null}
function logDiff(a,b){
  const ch=[];const nm=e=>(e&&e.name)||'(unnamed)';const J=JSON.stringify;let moved=0;
  const POS=new Set(['x','y','sx','sy','updatedAt','elements','collapsed']);
  for(const id in b.entities){const e=b.entities[id],o=a.entities[id];
    if(!o){ch.push({op:'added',k:e.kind,n:nm(e)});continue}
    if(o===e||J(o)===J(e))continue;
    const f=[];for(const k of new Set([...Object.keys(o),...Object.keys(e)]))if(!POS.has(k)&&J(o[k])!==J(e[k]))f.push(k);
    if(f.length)ch.push({op:'edited',k:e.kind,n:nm(e),f});
    if(o.x!==e.x||o.y!==e.y||o.sx!==e.sx||o.sy!==e.sy)moved++;
    const oe=new Map((o.elements||[]).map(x=>[x.id,x])),ne=new Map((e.elements||[]).map(x=>[x.id,x]));
    for(const[eid,x] of ne){const y=oe.get(eid);if(!y)ch.push({op:'added',k:'part',n:x.label,in:nm(e)});else if(J(x)!==J(y))ch.push({op:'edited',k:'part',n:x.label,in:nm(e),f:Object.keys(Object.assign({},x,y)).filter(k=>J(x[k])!==J(y[k]))})}
    for(const[eid,y] of oe)if(!ne.has(eid))ch.push({op:'removed',k:'part',n:y.label,in:nm(e)});
    if((o.elements||[]).length===(e.elements||[]).length&&(o.elements||[]).length>1&&J((o.elements||[]).map(x=>x.id))!==J((e.elements||[]).map(x=>x.id)))ch.push({op:'edited',k:'page',n:nm(e),f:['order of parts']});
  }
  for(const id in a.entities)if(!b.entities[id])ch.push({op:'removed',k:a.entities[id].kind,n:nm(a.entities[id])});
  const lk=(p,c)=>{const f=p.entities[c.from.entity],t=p.entities[c.to];let s=nm(f);if(c.from.element&&f){const el=(f.elements||[]).find(x=>x.id===c.from.element);if(el)s+=' › '+el.label}return s+' → '+nm(t)+(c.label?` (${c.label})`:'')};
  for(const id in b.connections){const c=b.connections[id],o=a.connections[id];if(!o)ch.push({op:'connected',k:c.type,n:lk(b,c)});else if(J(o)!==J(c))ch.push({op:'edited',k:'link',n:lk(b,c)})}
  for(const id in a.connections)if(!b.connections[id])ch.push({op:'disconnected',k:a.connections[id].type,n:lk(a,a.connections[id])});
  for(const id in b.modules||{}){const m=b.modules[id],o=(a.modules||{})[id];if(!o)ch.push({op:'added',k:'module',n:m.name});else if(J(o)!==J(m))ch.push({op:'edited',k:'module',n:m.name})}
  for(const id in a.modules||{})if(!(b.modules||{})[id])ch.push({op:'removed',k:'module',n:a.modules[id].name});
  const ar=new Map((a.roles||[]).map(r=>[r.id,r]));for(const r of b.roles||[]){const o=ar.get(r.id);if(!o)ch.push({op:'added',k:'role',n:r.name});else if(J(o)!==J(r))ch.push({op:'edited',k:'role',n:r.name})}
  for(const r of a.roles||[])if(!(b.roles||[]).some(x=>x.id===r.id))ch.push({op:'removed',k:'role',n:r.name});
  for(const k of ['name','description','platforms','look','startPageId'])if(J(a[k])!==J(b[k]))ch.push({op:'edited',k:'app',n:{name:'app name',description:'app description',platforms:'platforms',look:'app look and colours',startPageId:'start page'}[k]});
  if(moved)ch.push({op:'moved',k:'card',n:moved===1?'1 card':moved+' cards'});
  return ch;
}
// Record after every undoable change
const _puLog=pushUndo;
pushUndo=function(label,before){
  const r=_puLog.apply(this,arguments);const p=S.p;if(!p)return r;logNorm(p);
  let ent=p.activity[p.activity.length-1];if(!ent||ent.label!==String(label).slice(0,120)||ent.id){ent={at:Date.now(),label:String(label).slice(0,120)};p.activity.push(ent)}
  ent.id=uid('act');
  ent.ch=null;LOG.q.push({ent,before,pid:p.id});logSchedule();
  const nx=LOG.next;LOG.next=null;
  ent.src=nx&&nx.src==='ai'?'ai':'manual';
  if(nx&&nx.src==='ai'){ent.why=String(nx.why||'').slice(0,400);ent.req=String(nx.req||'').slice(0,300);ent.title=String(nx.title||'').slice(0,120)}
  if(p.objActive)ent.obj=p.objActive;
  if(p.activity.length>400)p.activity.splice(0,p.activity.length-400);
  return r;
};
// Undo and redo are part of the record too (and never wipe it)
function logCarry(fn,word){return function(){
  logFlush();const p=S.p;if(!p)return fn.apply(this,arguments);logNorm(p);
  const keep={act:p.activity,objs:p.objectives,on:p.objActive};const h=(word==='Undid'?S.undo:S.redo).slice(-1)[0];
  const r=fn.apply(this,arguments);
  if(h&&S.p){logNorm(S.p);S.p.activity=keep.act;S.p.objectives=keep.objs;S.p.objActive=keep.on;
    S.p.activity.push({id:uid('act'),at:Date.now(),label:word+': '+h.label,src:'manual',op:word==='Undid'?'undo':'redo',obj:keep.on||undefined,ch:[]});
    saveLocal(S.p);renderPanel()}
  return r}}
undo=logCarry(undo,'Undid');redo=logCarry(redo,'Redid');
// Smart Action tells the log what it was for
const _saApplyLog=saApply;
saApply=function(){const o=AI.res&&AI.res.options[AI.chosen];if(o)LOG.next={src:'ai',why:o.why,title:o.title,req:(AI.text||'').trim()||(AI.imgs&&AI.imgs.length?'(images only)':'')};try{return _saApplyLog.apply(this,arguments)}finally{LOG.next=null}};

// ---------- Objectives ----------
function objById(p,id){return (p.objectives||[]).find(o=>o.id===id)}
function objStart(name){const p=S.p;logNorm(p);name=String(name||'').trim().slice(0,120);if(!name)return toast('Type what you are trying to do first');
  if(p.objActive){const o=objById(p,p.objActive);if(o)o.end=Date.now()}
  const o={id:uid('obj'),name,start:Date.now(),end:null};p.objectives.push(o);p.objActive=o.id;touch();renderPanel();toast('Objective set. Changes are grouped under it until you end it.')}
function objEnd(){const p=S.p;const o=objById(p,p.objActive);if(o)o.end=Date.now();p.objActive=null;touch();renderPanel()}
function objRename(id,name){const o=objById(S.p,id);name=String(name||'').trim().slice(0,120);if(!o||!name||o.name===name)return;o.name=name;touch()}

// ---------- Panel ----------
const fmtT=t=>{try{return new Date(t).toLocaleString('en-AU',{timeZone:'Australia/Sydney',hour:'numeric',minute:'2-digit',day:'numeric',month:'short'})}catch(e){return new Date(t).toLocaleString()}};
const OPW={added:'Added',edited:'Changed',removed:'Removed',connected:'Connected',disconnected:'Unlinked',moved:'Moved'};
const KW={page:'page',function:'function',decision:'decision',setting:'setting',data:'data',component:'component',part:'part',link:'link',module:'module',role:'role',app:'',card:''};
function chLine(c){const kw=KW[c.k]!==undefined?KW[c.k]:(c.op==='connected'||c.op==='disconnected'?'':c.k);
  return `<li class="op-${c.op}"><b class="opw">${OPW[c.op]||c.op}</b> ${kw?esc(kw)+' ':''}“${esc(c.n)}”${c.in?` on “${esc(c.in)}”`:''}${c.f&&c.f.length?` <small>(${esc(c.f.slice(0,4).join(', '))}${c.f.length>4?'…':''})</small>`:''}</li>`}
function actItem(p,a){
  const src=a.src==='ai'?'<span class="chip st-idea">Smart Action</span>':'<span class="chip st-new">You</span>';
  const ch=(a.ch||[]);
  return `<li class="act-i"><div class="act-top"><time>${esc(fmtT(a.at))}</time>${src}<b>${esc(a.title||a.label)}</b></div>${ch.length?`<ul class="act-ch">${ch.slice(0,8).map(chLine).join('')}${ch.length>8||a.more?`<li class="more"><details><summary>${ch.length-8+(a.more||0)} more</summary><ul class="act-ch">${ch.slice(8).map(chLine).join('')}</ul></details></li>`:''}</ul>`:''}</li>`;
}
function whyOf(p,a){
  if(a.src==='ai')return `<p class="why-ai"><b>Smart Action’s stated purpose:</b> ${a.why?esc(a.why):'None was given.'}</p>${a.req?`<p class="help">You asked: “${esc(a.req)}”</p>`:''}`;
  const o=a.obj&&objById(p,a.obj);
  return o?`<p><b>Your objective:</b> ${esc(o.name)}</p>`:`<p class="none">No reason given.</p>`;
}
function activityHTML(p){
  logNorm(p);const mode=LOG.mode;const on=p.objActive&&objById(p,p.objActive);
  let h=`<div class="obj-box">${on?`<div class="obj-on"><span class="flabel">Working on</span><label class="sr" for="obj-name">Objective name</label><input id="obj-name" class="inp" data-obj="${on.id}" value="${esc(on.name)}"><button class="btn small" data-act="obj-end">End objective</button></div><p class="help">Every change is grouped under this until you end it or start another.</p>`
    :`<label for="obj-new" class="flabel">Objective (optional)</label><div class="obj-new"><input id="obj-new" class="inp" placeholder="e.g. Simplify the sign-up steps"><button class="btn small primary" data-act="obj-start">Start</button></div><p class="help">Set one before you start editing, and changes are grouped under it. Without one, each change is listed on its own.</p>`}</div>`;
  h+=`<div class="seg act-seg" role="tablist" aria-label="Show"><button role="tab" class="${mode==='activity'?'on':''}" aria-selected="${mode==='activity'}" data-act="act-mode" data-v="activity">Activity</button><button role="tab" class="${mode==='reason'?'on':''}" aria-selected="${mode==='reason'}" data-act="act-mode" data-v="reason">Reasoning</button></div>`;
  const list=p.activity.slice().reverse();
  if(!list.length)return h+`<p class="help" style="margin-top:12px">Nothing yet. Changes you or Smart Action make show up here as they happen.</p>`;
  if(mode==='reason'){
    h+=`<p class="help">Why the last 6 changes were made. Only stated reasons are shown.</p><ol class="act-list reason">`+list.slice(0,6).map(a=>`<li class="act-i"><div class="act-top"><time>${esc(fmtT(a.at))}</time>${a.src==='ai'?'<span class="chip st-idea">Smart Action</span>':'<span class="chip st-new">You</span>'}<b>${esc(a.title||a.label)}</b></div>${whyOf(p,a)}</li>`).join('')+`</ol>`;
    return h;
  }
  // group runs of changes under the same objective
  h+=`<div class="act-list">`;let cur=undefined,open=false;
  for(const a of list.slice(0,150)){const g=a.obj||null;
    if(g!==cur){if(open)h+=`</ol></section>`;cur=g;open=true;const o=g&&objById(p,g);
      h+=`<section class="act-grp${o?' has-obj':''}">${o?`<div class="obj-h"><span class="flabel">Objective</span><label class="sr" for="obj-${o.id}-${a.id}">Rename objective</label><input class="inp obj-rn" id="obj-${o.id}-${a.id}" data-obj="${o.id}" value="${esc(o.name)}">${o.end?'':'<span class="chip st-done">Active</span>'}</div>`:''}<ol>`}
    h+=actItem(p,a)}
  if(open)h+=`</ol></section>`;
  if(list.length>150)h+=`<p class="help">Showing the latest 150 of ${list.length}.</p>`;
  return h+`</div>`;
}
Object.assign(ACT,{
  'obj-start':()=>objStart(($('#obj-new')||{}).value),
  'obj-end':()=>objEnd(),
  'act-mode':d=>{LOG.mode=d.v;renderPanel()},
});
document.addEventListener('change',ev=>{const t=ev.target;if(t&&t.matches&&t.matches('#panel input[data-obj]')){objRename(t.dataset.obj,t.value);renderPanel()}});
document.addEventListener('keydown',ev=>{const t=ev.target;if(ev.key==='Enter'&&t&&t.id==='obj-new'){ev.preventDefault();objStart(t.value)}if(ev.key==='Enter'&&t&&t.matches&&t.matches('#panel input[data-obj]')){ev.preventDefault();t.blur()}});
ACT.undo=()=>undo();ACT.redo=()=>redo();
