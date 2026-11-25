// =========================================================
// LIVE PREVIEW — Screens canvas, parts tray, Play mode, page web, saved paths
// Everything is drawn from the same saved project. Nothing here runs
// until the person opens Screens or Play.
// =========================================================
const DEVICES={
  phone:{label:'Phone',w:360,h:760,ratio:1.75,status:true,frame:'phone'},
  foldc:{label:'Fold closed',w:344,h:800,ratio:2,status:true,frame:'phone'},
  foldo:{label:'Fold open',w:720,h:780,ratio:1.05,status:true,frame:'phone'},
  tablet:{label:'Tablet',w:820,h:1080,ratio:1.25,status:true,frame:'tablet'},
  web:{label:'Web',w:1280,h:760,ratio:.6,web:true,frame:'web'},
};
const curDev=()=>DEVICES[S.prefs.device]||DEVICES.phone;
const isScreens=()=>S.prefs.view==='screens';
const PX=e=>isScreens()&&e.kind==='page'?e.sx:e.x;
const PY=e=>isScreens()&&e.kind==='page'?e.sy:e.y;
function setPos(e,x,y){if(isScreens()&&e.kind==='page'){e.sx=x;e.sy=y}else{e.x=x;e.y=y}}
S.scrH={};S.heavy=new Set();

// ---------- App look ----------
const LOOK_DEF={primary:'#E2805F',mode:'light',corners:'round',text:100};
function hexRgb(h){h=String(h||'').replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);if(h.length!==6||isNaN(n))return [226,128,95];return [n>>16&255,n>>8&255,n&255]}
function lum(c){const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])}
function contrastRatio(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
const mixRgb=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
const toHex=c=>'#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');
const lookCache=new Map();
function lookStyle(look,mode){
  const L=Object.assign({},LOOK_DEF,look||{});const m=mode||L.mode;const key=JSON.stringify(L)+m;
  if(lookCache.has(key))return lookCache.get(key);
  if(L.palette&&L.palette[m]){const P=L.palette[m];const rr={round:22,soft:12,square:4}[L.corners]??22;const st=`--ap:${P.primary};--ap-ink:${P.onPrimary};--ap-link:${P.link};--ap-bg:${P.background};--ap-surface:${P.surface};--ap-text:${P.text};--ap-line:${P.border};--ap-r:${rr}px;--ap-fs:${(+L.text||100)/100}`;lookCache.set(key,st);return st}
  const dark=m==='dark';
  const bg=dark?[30,27,27]:[255,255,255],surface=dark?[44,39,39]:[245,241,238],text=dark?[242,236,232]:[31,27,26],line=dark?[66,58,57]:[226,219,214];
  const pr=hexRgb(L.primary);
  const ink=contrastRatio(pr,[255,255,255])>=4.5?[255,255,255]:[31,27,26];
  let link=pr;for(let k=0;k<6&&contrastRatio(link,bg)<4.5;k++)link=mixRgb(link,dark?[255,255,255]:[0,0,0],.18);
  const r={round:22,soft:12,square:4}[L.corners]??22;
  const s=`--ap:${toHex(pr)};--ap-ink:${toHex(ink)};--ap-link:${toHex(link)};--ap-bg:${toHex(bg)};--ap-surface:${toHex(surface)};--ap-text:${toHex(text)};--ap-line:${toHex(line)};--ap-r:${r}px;--ap-fs:${(+L.text||100)/100}`;
  lookCache.set(key,s);return s;
}

// ---------- Links as the user experiences them (through functions and decisions) ----------
const PASS=new Set(['navigate','modal','back','condition','error','trigger','workflow','permission']);
function derivedEdges(p){
  const out=[],seenKey=new Set();
  const add=d=>{const k=d.from.entity+'|'+(d.from.element||'')+'|'+d.to;if(seenKey.has(k))return;seenKey.add(k);out.push(d)};
  for(const c of Object.values(p.connections)){
    const a=p.entities[c.from.entity],b=p.entities[c.to];if(!a||!b||a.kind!=='page')continue;
    if(b.kind==='page'){add({id:c.id,connId:c.id,from:c.from,to:b.id,type:c.type,label:c.label,via:null});continue}
    if(!PASS.has(c.type))continue;
    const seen=new Set([b.id]);const q=[{id:b.id,depth:0}];
    while(q.length){const {id,depth}=q.shift();
      for(const k of outConns(p,id)){if(!PASS.has(k.type))continue;const t=p.entities[k.to];if(!t)continue;
        if(t.kind==='page')add({id:c.id+'>'+k.id,connId:c.id,from:c.from,to:t.id,type:k.type,label:k.label,via:b});
        else if(!seen.has(t.id)&&depth<4&&(t.kind==='function'||t.kind==='decision'||t.kind==='component')){seen.add(t.id);q.push({id:t.id,depth:depth+1})}}}
  }
  return out;
}
function edgeList(p,vis){
  if(!isScreens())return Object.values(p.connections).filter(c=>vis.has(c.from.entity)&&vis.has(c.to)).map(c=>({id:c.id,connId:c.id,from:c.from,to:c.to,type:c.type,label:c.label}));
  return derivedEdges(p).filter(d=>vis.has(d.from.entity)&&vis.has(d.to)).map(d=>Object.assign({},d,{label:d.via?`${d.via.kind==='decision'?'asks':'runs'} ${d.via.name}${d.label?' · '+d.label:''}`:d.label}));
}

// ---------- Screen layout ----------
const PART_H={button:58,link:34,listitem:132,menuitem:54,toggle:52,input:82,dropdown:82,image:140,section:94};
function estScreenH(e){
  const d=curDev();let h=(d.status?24:0)+(d.web?36:0)+60+32;let inTabs=false;
  for(const el of e.elements||[]){if(el.type==='tab'){if(!inTabs)h+=52;inTabs=true;continue}inTabs=false;h+=PART_H[el.type]||60}
  if(/Confirmation|Error|Login/.test(e.pageType))h+=110;
  return Math.max(Math.round(d.w*d.ratio),h);
}
function screensLayout(){}
function ensureScreenPositions(p){if(screensLayout(p,!Object.values(p.entities).some(e=>e.kind==='page'&&e.sx!=null)))saveLocal(p)}
function changeDevice(k){
  if(!DEVICES[k])return;const ow=curDev().w+220;S.prefs.device=k;savePrefs();const nw=curDev().w+220;
  for(const e of Object.values(S.p.entities))if(e.kind==='page'&&e.sx!=null)e.sx=Math.round(e.sx*nw/ow);
  S.scrH={};saveLocal(S.p);renderMid();renderCanvas();
}
function setView(v){
  if((S.prefs.view||'blocks')===v)return;
  S.viewByMode=S.viewByMode||{};S.viewByMode[S.prefs.view||'blocks']={...S.view};
  S.prefs.view=v;savePrefs();const back=S.viewByMode[v];S.zl=0;
  if(back)S.view=back;applyView();renderAll();
  if(!back)requestAnimationFrame(()=>{const id=S.sel&&S.sel.t!=='conn'&&S.geo[S.sel.id]?S.sel.id:(S.p.startPageId&&S.geo[S.p.startPageId]?S.p.startPageId:null);if(id)centreOn(id,v==='screens'?.6:undefined);else fitAll()});
}

// ---------- Drawing a screen ----------
function toggleOn(p,e,el,sim){
  const c=outConns(p,e.id,el.id).find(k=>p.entities[k.to]&&p.entities[k.to].kind==='setting');
  if(c){const set=p.entities[c.to];return isOnVal(sim&&sim.settings[set.id]!=null?sim.settings[set.id]:(effectiveSetting(p,set,e.id,typeof PL!=='undefined'&&PL.open?PL.role:null)??set.defaultValue))}
  return !!(sim&&sim.inputs[el.id]==='on');
}
const isOnVal=v=>/^(on|yes|true|1)$/i.test(String(v??'').trim());
function screenHTML(p,e,o={}){
  const play=o.mode==='play';const d=DEVICES[o.device]||curDev();
  const els=e.elements||[];const pt=e.pageType||'Custom';
  const isHome=/Home/.test(pt);const sheet=/Modal|Bottom sheet/.test(pt);
  const lastBtn=pt==='Form'&&els.length&&els[els.length-1].type==='button'?els[els.length-1].id:null;
  const sel=S.sel;let firstBtn=true,body='',foot='';
  const part=(el,inner,cls)=>{
    const cs=outConns(p,e.id,el.id);const act=EL_TYPES[el.type]?.act;const dead=act&&!cs.length;
    const isSel=!play&&sel&&sel.t==='element'&&sel.id===e.id&&sel.el===el.id;
    return `<div class="sp ${cls}${dead&&!play?' dead':''}${isSel?' sel':''}" data-el="${el.id}" data-ent="${e.id}"${play?` data-pl="${el.id}" role="button" tabindex="0" aria-label="${esc(el.label)}"`:''}>${inner}${!play&&(act||cs.length)?`<span class="port sp-port${cs.length?' on':''}" data-port="el" data-ent="${e.id}" data-el="${el.id}" title="Drag to link this to another screen"></span>`:''}${dead&&!play?'<b class="sp-bad" title="Does nothing yet">!</b>':''}</div>`;
  };
  let i=0;
  while(i<els.length){
    const el=els[i];
    if(el.type==='tab'){const tabs=[];while(i<els.length&&els[i].type==='tab')tabs.push(els[i++]);body+=`<div class="sp-tabs">${tabs.map(t=>part(t,`<span>${esc(t.label)}</span>`,'sp-tab'+(outConns(p,e.id,t.id).some(c=>c.to===e.id)?' on':''))).join('')}</div>`;continue}
    i++;const L=esc(el.label);let h;
    switch(el.type){
      case 'button':{h=part(el,`<span>${L}</span>`,'sp-btn'+(firstBtn&&el.id!==lastBtn?'':' out')+(el.id===lastBtn?' main':''));if(el.id!==lastBtn)firstBtn=false;if(el.id===lastBtn){foot+=h.replace('sp-btn out main','sp-btn main');continue}break}
      case 'link':h=part(el,`<span>${L}</span>`,'sp-link');break;
      case 'listitem':h=part(el,`<i class="av">${icon(autoIcon(el.label,'user'))}</i><span class="t">${L}<small>Tap to open</small></span>${icon('chev')}`,'sp-li')+`<div class="sp-li faint" aria-hidden="true"><i class="av"></i><span class="t">${L}<small>Another one</small></span>${icon('chev')}</div>`;break;
      case 'menuitem':h=part(el,`<span class="t">${L}</span>${icon('chev')}`,'sp-mi');break;
      case 'toggle':{const on=toggleOn(p,e,el,o.sim);h=part(el,`<span class="t">${L}</span><span class="sw${on?' on':''}" role="switch" aria-checked="${on}"></span>`,'sp-tg');break}
      case 'input':h=part(el,`<label>${L}</label>${play?`<input class="box" data-in="${el.id}" value="${esc(o.sim&&o.sim.inputs[el.id]||'')}" placeholder="Type here" aria-label="${L}">`:'<div class="box"></div>'}`,'sp-in');break;
      case 'dropdown':h=part(el,`<label>${L}</label><div class="box dd"><span>${esc(o.sim&&o.sim.inputs[el.id]||'Choose…')}</span>${icon('chevdown')}</div>`,'sp-in');break;
      case 'image':h=part(el,icon('image'),'sp-img');break;
      default:h=part(el,`<h4>${L}</h4><div class="ln"></div><div class="ln" style="width:72%"></div>`,'sp-sec');
    }
    body+=h;
  }
  const hero=pt==='Confirmation'?`<div class="sp-hero ok">${icon('check')}</div>`:pt==='Error'?`<div class="sp-hero err">${icon('alert')}</div>`:/Login/.test(pt)?`<div class="sp-hero logo">${esc((p.name||'A').slice(0,1))}</div>`:'';
  const top=isHome?`<div class="scr-big">${esc(e.name)}</div>`:`<div class="scr-top">${sheet?'':`<span class="bk"${play?' data-plback="1" role="button" tabindex="0" aria-label="Back"':''}>${icon('back')}</span>`}<b>${esc(e.name)}</b></div>`;
  const status=d.status?`<div class="scr-status"><span>9:41</span><span>▂▄▆ ▮</span></div>`:'';
  const url=d.web?`<div class="scr-url"><i></i><i></i><i></i><span>${esc((p.name||'app').toLowerCase().replace(/[^a-z0-9]+/g,''))}.app/${esc(e.name.toLowerCase().replace(/[^a-z0-9]+/g,'-'))}</span></div>`:'';
  const size=play?`width:${d.w}px;height:${d.h}px`:`width:${d.w}px;min-height:${Math.round(d.w*d.ratio)}px`;
  return `<div class="scr${sheet?' sheet':''}" style="${lookStyle(lookFor(p,e.id,o.mode==='play'&&typeof PL!=='undefined'?PL.role:null),o.modeOverride)};${size}">${url}${status}${sheet?'<div class="grab"></div>':''}${top}<div class="scr-body">${hero}${body||'<p class="scr-empty">Drag parts here</p>'}</div>${foot?`<div class="scr-foot">${foot}</div>`:''}</div>`;
}
function screenCardHTML(p,e,hiddenCount){
  const mc=modColour(p,e);const sel=S.sel&&S.sel.t==='entity'&&S.sel.id===e.id;const d=curDev();
  const heavy=S.heavy.has(e.id);
  const noIn=!inConns(p,e.id).length&&p.startPageId!==e.id;
  const roles=(e.roles||[]).map(r=>(p.roles.find(x=>x.id===r)||{}).name).filter(Boolean);
  const kids=descendants(p,e.id).size;
  const coll=kids?`<button class="collapse-btn" data-act="toggle-collapse" data-id="${e.id}" aria-expanded="${!e.collapsed}">${e.collapsed?`Show ${hiddenCount||kids} hidden ▸`:`Hide branch (${kids}) ▾`}</button>`:'';
  const phH=S.scrH[e.id]||estScreenH(e);
  return `<div class="card scard${sel?' sel':''}" data-id="${e.id}" data-heavy="${heavy?1:0}" style="left:${e.sx}px;top:${e.sy}px;--mc:${mc}" tabindex="0" role="button" aria-label="Screen: ${esc(e.name)}">
    <span class="inport" aria-hidden="true"></span>
    <div class="hd"><span class="tile">${icon(autoIcon(e.name,PAGE_ICON[e.pageType]||'section'))}</span><span class="ttl">${esc(e.name)}<span class="kind">${esc(e.pageType)}${p.startPageId===e.id?' · Start':''}</span></span>${noIn?'<span class="chip st-blocked">No way in</span>':''}${roles.length?`<span class="chip st-planned" title="Only these roles can see it">${esc(roles.join(', '))}</span>`:''}${cardBadges(p,e)}<span class="chip ${stClass(e.status)}">${esc(e.status)}</span><span class="port card-port${outConns(p,e.id).some(c=>!c.from.element)?' on':''}" data-port="card" data-ent="${e.id}" title="Drag to link this screen"></span></div>
    <div class="dev dev-${d.frame}">${heavy?screenHTML(p,e,{mode:'canvas'}):`<div class="scr-ph" style="width:${d.w}px;height:${phH}px"><span>${esc(e.name)}</span><small>${e.elements.length} part${e.elements.length===1?'':'s'}</small></div>`}</div>
    ${coll}</div>`;
}

// ---------- Draw only what can be seen ----------
function computeHeavy(){}
let heavyTimer=null;
function scheduleHeavy(){}

// ---------- Parts tray + drag and drop ----------
const PARTS=[['button','Button','chev'],['link','Link','link'],['tab','Tab','tab'],['listitem','List item','list'],['menuitem','Menu item','list'],['toggle','Toggle','toggle'],['input','Text field','input'],['dropdown','Dropdown','dropdown'],['image','Image','image'],['section','Section','section'],['screen','New screen','plus']];
function renderTray(){}
let GHOST=null,DLINE=null;
function ghostAt(x,y,label){if(!GHOST){GHOST=document.createElement('div');GHOST.className='dragghost';GHOST.setAttribute('aria-hidden','true');document.body.appendChild(GHOST)}GHOST.textContent=label;GHOST.style.left=x+'px';GHOST.style.top=y+'px';GHOST.hidden=false}
function showLine(l){if(!DLINE){DLINE=document.createElement('div');DLINE.className='dline';DLINE.setAttribute('aria-hidden','true');document.body.appendChild(DLINE)}DLINE.hidden=false;DLINE.style.left=l.x+'px';DLINE.style.top=l.y+'px';DLINE.style.width=(l.w||4)+'px';DLINE.style.height=(l.h||4)+'px'}
function clearDrag(){if(GHOST)GHOST.hidden=true;if(DLINE)DLINE.hidden=true;$$('.scard.drop').forEach(n=>n.classList.remove('drop'))}
function dropIndex(card,x,y){
  const pg=S.p.entities[card.dataset.id];const parts=[...card.querySelectorAll('.scr .sp[data-el]')];
  if(!parts.length){const b=card.querySelector('.scr-body').getBoundingClientRect();return{idx:pg.elements.length,line:{x:b.left+14,y:b.top+12,w:b.width-28}}}
  const cw=card.getBoundingClientRect().width;
  for(const n of parts){const r=n.getBoundingClientRect();const same=y>=r.top&&y<=r.bottom;const narrow=r.width<cw*.6;
    if((!same&&y<r.top+r.height/2)||(same&&narrow&&x<r.left+r.width/2)||(same&&!narrow&&y<r.top+r.height/2))return{idx:pg.elements.findIndex(e=>e.id===n.dataset.el),line:same&&narrow?{x:r.left-4,y:r.top,w:4,h:r.height}:{x:r.left,y:r.top-6,w:r.width}}}
  const r=parts[parts.length-1].getBoundingClientRect();return{idx:pg.elements.length,line:{x:r.left,y:r.bottom+3,w:r.width}};
}
function dropTarget(x,y){
  const n=document.elementFromPoint(x,y);if(!n)return{};
  if(n.closest('#tray,.overlay,#panel,#editor,#minimap,#lkey'))return{};
  const card=n.closest('.scard');
  if(card)return card.dataset.heavy==='1'?Object.assign({card,page:card.dataset.id},dropIndex(card,x,y)):{card,page:card.dataset.id,idx:null};
  const hit=n.closest('[data-conn]');if(hit)return{conn:hit.dataset.conn};
  if(n.closest('#viewport'))return{canvas:true};return{};
}
function dragMove(g,ev){
  const label=g.type==='tray'?PARTS.find(x=>x[0]===g.part)[1]:((findElement(S.p,g.id,g.el)||{}).label||'Part');
  ghostAt(ev.clientX,ev.clientY,label);
  const t=dropTarget(ev.clientX,ev.clientY);
  $$('.scard.drop').forEach(n=>n.classList.remove('drop'));
  if(t.card&&g.part!=='screen'){t.card.classList.add('drop');if(t.line)showLine(t.line);else if(DLINE)DLINE.hidden=true}
  else if(DLINE)DLINE.hidden=true;
}
function focusLabel(elId){setTimeout(()=>{const i=$('#el-l-'+elId);if(i){i.focus();i.select()}},40)}
function addPartAt(pageId,type,idx){
  const lab=PARTS.find(x=>x[0]===type)[1];
  const el=commit(`Add ${lab.toLowerCase()} to “${S.p.entities[pageId].name}”`,p=>{const pg=p.entities[pageId];const el={id:uid('el'),label:type==='section'?'New section':'New '+lab.toLowerCase(),type};pg.elements.splice(idx==null?pg.elements.length:idx,0,el);return el});
  if(el){S.sel={t:'element',id:pageId,el:el.id,scroll:true};renderCanvas();renderEditor();focusLabel(el.id)}
}
function insertScreenOnLink(connId){
  const c=S.p.connections[connId];if(!c)return;
  const e=commit('Add screen in the middle of a link',p=>{const c=p.connections[connId];const a=p.entities[c.from.entity],b=p.entities[c.to];
    const e=addEntity(p,'page',{name:'New screen',pageType:'Custom',moduleId:a.moduleId,parentId:a.id,x:a.x+200,y:a.y+120,elements:[]});
    if(a.sx!=null&&b.sx!=null){e.sx=Math.round((a.sx+b.sx)/2);e.sy=Math.round((a.sy+b.sy)/2)+120}
    const el=addElement(p,e.id,{label:'Continue',type:'button'});const old=c.to;c.to=e.id;addConn(p,{entity:e.id,element:el.id},old,'navigate');return e});
  if(e){select({t:'entity',id:e.id});setTimeout(()=>{const f=$('#f-name');f&&(f.focus(),f.select())},40);toast('Added a screen in the middle of that link')}
}
function dragDrop(g,ev){
  const t=dropTarget(ev.clientX,ev.clientY);clearDrag();
  if(g.type==='tray'){
    if(g.part==='screen'){
      if(t.conn)return insertScreenOnLink(t.conn);
      if(t.canvas){const w=toWorld(ev.clientX,ev.clientY);const e=commit('Add screen',p=>{const e=addEntity(p,'page',{name:'New screen',pageType:'Custom',x:Math.round(w.x),y:Math.round(w.y)});e.sx=Math.round(w.x-30);e.sy=Math.round(w.y-30);if(!p.startPageId)p.startPageId=e.id;return e});if(e){select({t:'entity',id:e.id});setTimeout(()=>{const f=$('#f-name');f&&(f.focus(),f.select())},40)}}
      return;
    }
    if(!t.page)return toast('Drop parts onto a screen');
    return addPartAt(t.page,g.part,t.idx);
  }
  if(g.type==='part'){
    if(!t.page){renderCanvas();return}
    const moved=commit(t.page===g.id?'Reorder parts':'Move part to another screen',p=>{const from=p.entities[g.id],to=p.entities[t.page];const i=from.elements.findIndex(x=>x.id===g.el);if(i<0)throw new Error('That part is gone');let idx=t.idx==null?to.elements.length:t.idx;if(from===to&&i<idx)idx--;const [el]=from.elements.splice(i,1);to.elements.splice(Math.max(0,idx),0,el);if(from!==to)for(const c of Object.values(p.connections))if(c.from.entity===from.id&&c.from.element===el.id)c.from.entity=to.id;return true});
    if(moved){S.sel={t:'element',id:t.page,el:g.el};renderCanvas();renderEditor()}
  }
}
function trayTap(part){
  if(part==='screen')return addPageModal();
  const s=S.sel;const pg=s&&s.t!=='conn'&&S.p.entities[s.id]&&S.p.entities[s.id].kind==='page'?s.id:null;
  if(!pg)return toast('Tap a screen first, then tap a part to add it');
  let idx=null;if(s.t==='element'){const i=S.p.entities[pg].elements.findIndex(x=>x.id===s.el);if(i>=0)idx=i+1}
  addPartAt(pg,part,idx);
}

// ---------- Play mode ----------
var PL={open:false,steps:[],role:'',device:'phone',mode:'',sheet:null,replay:null,showInfo:window.innerWidth>1000};
const plCur=()=>PL.steps[PL.steps.length-1];
function openPlay(startId,keepSteps){
  const p=S.p;const pages=Object.values(p.entities).filter(e=>e.kind==='page');if(!pages.length)return toast('Add a page first');
  const selPage=S.sel&&S.sel.t!=='conn'&&p.entities[S.sel.id]&&p.entities[S.sel.id].kind==='page'?S.sel.id:null;
  const s=startId&&p.entities[startId]?startId:(selPage||(p.startPageId&&p.entities[p.startPageId]?p.startPageId:pages[0].id));
  closeSidebar();hideDropMenu();PL.open=true;PL.device=S.prefs.device||'phone';PL.mode='';PL.sheet=null;stopReplay();
  if(!keepSteps)PL.steps=[{page:s,kind:'start',via:'Start',el:null,choice:null,modal:false,sim:{settings:{},inputs:{}},notes:[]}];
  let el=$('#play');if(!el){el=document.createElement('div');el.id='play';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Play mode');document.body.appendChild(el);bindPlay(el)}
  el.hidden=false;renderPlay();setTimeout(()=>{const f=el.querySelector('[data-pl]');f&&f.focus({preventScroll:true})},30);
}
function closePlay(){stopReplay();PL.open=false;const el=$('#play');if(el)el.hidden=true;const last=plCur();if(last&&S.p&&S.p.entities[last.page])select({t:'entity',id:last.page},{centre:true})}
function playMode(){return PL.mode||(S.p.look&&S.p.look.mode)||'light'}
function renderPlay(){
  const el=$('#play');if(!el||!PL.open)return;const p=S.p;const st=plCur();const pg=p.entities[st.page];const d=DEVICES[PL.device]||DEVICES.phone;
  const mode=playMode();
  const screen=pg?screenHTML(p,pg,{mode:'play',sim:st.sim,device:PL.device,modeOverride:mode}):'<div class="scr-ph">This page was deleted</div>';
  let stage=screen;
  if(st.modal){const base=[...PL.steps].reverse().find(s=>!s.modal);const bp=base&&p.entities[base.page];stage=(bp?`<div class="pl-under">${screenHTML(p,bp,{mode:'play',sim:st.sim,device:PL.device,modeOverride:mode})}</div>`:'')+`<div class="pl-dim"></div><div class="pl-over">${screen}</div>`}
  const rp=PL.replay;
  const tools=rp?`<span class="pl-rp">Replaying “${esc(rp.path.name)}” · step ${rp.i+1} of ${rp.path.steps.length}</span><button class="btn small" data-pact="rp-back" ${rp.i===0?'disabled':''}>${icon('back')}<span class="lbl2">Back</span></button><button class="btn small gold" data-pact="rp-toggle">${rp.paused?'Play':'Pause'}</button><button class="btn small" data-pact="rp-next">Next</button><button class="btn small" data-pact="rp-stop">Stop</button>`
    :`<button class="btn small" data-pact="back" aria-label="Back one step" ${PL.steps.length<2?'disabled':''}>${icon('back')}<span class="lbl2">Back</span></button><button class="btn small" data-pact="restart" aria-label="Restart">${icon('undo')}<span class="lbl2">Restart</span></button><label class="sr" for="pl-dev">Device</label><select id="pl-dev" class="inp pl-sel" data-pchg="device">${Object.entries(DEVICES).map(([k,v])=>opt(k,PL.device,v.label)).join('')}</select><label class="sr" for="pl-role">Play as</label><select id="pl-role" class="inp pl-sel" data-pchg="role">${opt('',PL.role,'Any role')}${p.roles.map(r=>opt(r.id,PL.role,'As '+r.name)).join('')}</select><button class="btn small" data-pact="mode" aria-label="Switch light or dark">${icon(mode==='dark'?'sun':'eye')}<span class="lbl2">${mode==='dark'?'Light':'Dark'}</span></button><button class="btn small" data-pact="web" aria-label="Page web">${icon('trace')}<span class="lbl2">Page web</span></button><button class="btn small" data-pact="paths" aria-label="Saved paths">${icon('history')}<span class="lbl2">Paths</span></button><button class="btn small gold" data-pact="save" aria-label="Save path">${icon('save')}<span class="lbl2">Save path</span></button>`;
  el.innerHTML=`<div class="pl-top"><button class="btn icon ghost" data-pact="close" aria-label="Close Play">${icon('x')}</button><b class="pl-title">${icon('play')}Play</b><span class="pl-sim">Simulation, not a real app</span><span class="pl-sp"></span>${tools}</div>
  <div class="pl-main">
    <ol class="pl-trail" aria-label="Journey trail">${PL.steps.map((s,i)=>`<li><button class="${i===PL.steps.length-1?'on':''}" data-pact="jump" data-i="${i}" aria-current="${i===PL.steps.length-1?'step':'false'}"><b>${i+1}</b>${esc((p.entities[s.page]||{}).name||'Deleted page')}<small>${esc(s.via)}${s.choice?' · '+esc(s.choice):''}</small></button></li>`).join('')}</ol>
    <div class="pl-stage" id="pl-stage"><div class="pl-fit" id="pl-fit"><div class="pl-dev dev dev-${d.frame}" style="width:${d.w}px;height:${d.h}px">${stage}</div></div><div class="pl-strip" id="pl-strip"${st.notes&&st.notes.length?'':' hidden'} role="status">${(st.notes||[]).map(n=>`<span>${esc(n)}</span>`).join('')}</div></div>
    <aside class="pl-info${PL.showInfo?'':' folded'}" aria-label="What's going on">${plInfoHTML()}</aside>
  </div>${PL.sheet?plSheetHTML():''}`;
  fitDevice();
  if(PL.sheet){const b=el.querySelector('.pl-card .btn.primary')||el.querySelector('.pl-card .btn');b&&b.focus()}
}
function fitDevice(){
  const st=$('#pl-stage'),fit=$('#pl-fit');if(!st||!fit)return;const dv=fit.firstElementChild;const d=DEVICES[PL.device]||DEVICES.phone;
  const bw=d.frame==='web'?4:d.frame==='tablet'?20:14;const W=d.w+bw,H=d.h+bw;const strip=$('#pl-strip');
  const avW=st.clientWidth-24,avH=st.clientHeight-24-(strip&&!strip.hidden?strip.offsetHeight+10:0);
  const s=Math.max(.2,Math.min(1,avW/W,avH/H));dv.style.transform=`scale(${s})`;fit.style.width=Math.round(W*s)+'px';fit.style.height=Math.round(H*s)+'px';
}
function plInfoHTML(){
  const p=S.p,st=plCur(),pg=p.entities[st.page];
  const sets=Object.entries(st.sim.settings).map(([id,v])=>`<li>${esc((p.entities[id]||{}).name||id)}: <b>${esc(v)}</b></li>`).join('');
  const choices=PL.steps.filter(s=>s.choice).map(s=>`<li>${esc((p.entities[s.page]||{}).name||'?')}: ${esc(s.choice)}</li>`).join('');
  const role=PL.role?(p.roles.find(r=>r.id===PL.role)||{}).name:'Any role';
  return `<button class="pl-ifold" data-pact="info" aria-expanded="${PL.showInfo}">What's going on ${PL.showInfo?'▾':'▸'}</button><div class="pl-ibody"><div class="kv"><span>Page</span><b>${esc(pg?pg.name:'?')}</b><span>Type</span><span>${esc(pg?pg.pageType:'')}</span><span>Playing as</span><span>${esc(role)}</span><span>Device</span><span>${esc(DEVICES[PL.device].label)}</span><span>Steps</span><span>${PL.steps.length}</span></div>
  <div class="mod-h">Settings changed this run</div>${sets?`<ul>${sets}</ul>`:'<p class="help">None yet. Tap a toggle to change one.</p>'}
  <div class="mod-h">Choices made</div>${choices?`<ul>${choices}</ul>`:'<p class="help">None yet.</p>'}
  <p class="help">Nothing here is saved or sent. It's a practice run of your map.</p></div>`;
}
function plSheetHTML(){const s=PL.sheet;return `<div class="pl-sheet"><div class="pl-card" role="alertdialog" aria-labelledby="pl-sh-t"><h3 id="pl-sh-t">${esc(s.title)}</h3>${s.text?`<p>${esc(s.text)}</p>`:''}${s.options.map((o,i)=>`<button class="btn${o.primary?' primary':''}" data-pact="sheet" data-i="${i}"><span>${esc(o.label)}</span>${o.sub?`<small>${esc(o.sub)}</small>`:''}</button>`).join('')}</div></div>`}
function pushStep(page,ctx){const prev=plCur();PL.steps.push({page,kind:ctx.kind||'tap',via:ctx.via||'',el:ctx.el||null,choice:ctx.choice||null,modal:!!ctx.modal,sim:clone(prev.sim),notes:ctx.notes||[]});PL.sheet=null;renderPlay()}
function addNote(n){const st=plCur();st.notes=(st.notes||[]).concat(n);}
function flipSetting(set){const st=plCur();const v=st.sim.settings[set.id]!=null?st.sim.settings[set.id]:(effectiveSetting(S.p,set,st.page,PL.role)??set.defaultValue);const onoff=set.valueType==='On / off'||/^(on|off)$/i.test(String(v));const nv=onoff?(isOnVal(v)?'Off':'On'):v;st.sim.settings[set.id]=nv;addNote(`${set.name} is now ${nv} (this run only)`)}
function playTap(elId,node){
  if(PL.replay||PL.sheet)return;const p=S.p,st=plCur(),pg=p.entities[st.page];if(!pg)return;const el=findElement(p,pg.id,elId);if(!el||el.type==='input')return;
  const cs=outConns(p,pg.id,elId);const via=`Tapped “${el.label}”`;
  if(el.type==='dropdown'&&!cs.length){PL.sheet={title:el.label,text:'Pick a value for this practice run.',options:['Option 1','Option 2','Option 3'].map(v=>({label:v,run:()=>{st.sim.inputs[elId]=v}}))};return renderPlay()}
  if(!cs.length){
    if(el.type==='toggle'){st.sim.inputs[elId]=st.sim.inputs[elId]==='on'?'off':'on';return renderPlay()}
    if(!EL_TYPES[el.type]?.act)return;
    if(node){node.classList.remove('wobble');void node.offsetWidth;node.classList.add('wobble')}
    PL.sheet={title:"This button doesn't do anything yet",text:`“${el.label}” on ${pg.name} isn't linked to a page or a function.`,options:[{label:'Link it',primary:true,run:()=>{closePlay();setView('screens');select({t:'element',id:pg.id,el:elId,scroll:true},{centre:true})}},{label:'Keep playing',run:()=>{}}]};
    return setTimeout(renderPlay,260);
  }
  const setC=cs.filter(c=>p.entities[c.to]&&p.entities[c.to].kind==='setting');setC.forEach(c=>flipSetting(p.entities[c.to]));
  const dataNotes=cs.filter(c=>c.type==='write'||c.type==='read').map(c=>`Would ${c.type==='write'?'save':'read'} ${entityLabel(p,c.to)} (simulated)`);
  const go=cs.filter(c=>!setC.includes(c)&&p.entities[c.to]&&(PASS.has(c.type)||p.entities[c.to].kind==='page'));
  if(!go.length){dataNotes.forEach(addNote);return renderPlay()}
  const ctx={el:elId,via,notes:dataNotes,kind:'tap'};
  if(go.length>1){PL.sheet={title:'Where does this go?',text:`“${el.label}” has ${go.length} links. Pick one for this run.`,options:go.map(c=>({label:entityLabel(p,c.to),sub:(CONN[c.type]||{}).label,run:()=>follow(c,{...ctx,choice:entityLabel(p,c.to)},0)}))};return renderPlay()}
  follow(go[0],ctx,0);
}
function follow(c,ctx,depth){
  const p=S.p;const t=p.entities[c.to];
  if(!t||depth>8){PL.sheet={title:'Play stopped here',text:t?'These links go round in a circle.':'A link points to something that was deleted.',options:[{label:'OK',primary:true,run:()=>{}}]};return renderPlay()}
  if(c.type==='back'){const prev=PL.steps.length>1?PL.steps[PL.steps.length-2]:null;return arrive(prev?prev.page:t.id,{...ctx,kind:'back',modal:prev?prev.modal:false})}
  if(t.kind==='page')return arrive(t.id,{...ctx,modal:c.type==='modal'||/Modal|Bottom sheet/.test(t.pageType)});
  if(t.kind==='setting'){flipSetting(t);return renderPlay()}
  if(t.kind==='data'){addNote(`Would ${c.type==='write'?'save':'read'} ${t.name} (simulated)`);return renderPlay()}
  if(t.kind==='decision')return decide(t,ctx,depth);
  const outs=outConns(p,t.id);
  const notes=[`Ran “${t.name}”`].concat(outs.filter(k=>k.type==='write').map(k=>`Would save ${entityLabel(p,k.to)}`),outs.filter(k=>k.type==='notify').map(k=>`Would run “${entityLabel(p,k.to)}”`));
  ctx={...ctx,notes:(ctx.notes||[]).concat(notes)};
  const cand=outs.filter(k=>['navigate','modal','back','error','condition','trigger','workflow','permission'].includes(k.type)&&p.entities[k.to]&&!['data','setting'].includes(p.entities[k.to].kind));
  if(!cand.length){ctx.notes.forEach(addNote);addNote(`“${t.name}” doesn't open another screen, so you stay here.`);return renderPlay()}
  if(cand.length===1)return follow(cand[0],ctx,depth+1);
  const steps=(t.steps||'').split('\n').filter(Boolean).map((s,i)=>`${i+1}. ${s}`).join('\n');
  PL.sheet={title:`Running “${t.name}”`,text:(steps?steps+'\n\n':'')+'How does it go this time?',options:cand.map(k=>{const works=k.type!=='error'&&(/success|work|found|ok|done|saved/i.test(k.label)||((k.type==='navigate'||k.type==='trigger')&&!k.label));const lab=k.type==='error'?'Pretend it fails':works?'Pretend it works':(k.label||entityLabel(p,k.to));return{label:lab,sub:'→ '+entityLabel(p,k.to),primary:works,run:()=>follow(k,{...ctx,choice:k.type==='error'?'Failed':works?'Worked':lab},depth+1)}})};
  renderPlay();
}
function decide(d,ctx,depth){
  const p=S.p;const outs=outConns(p,d.id);
  const conds=outs.filter(k=>k.type!=='reference'&&k.type!=='read'&&p.entities[k.to]&&!['data','setting'].includes(p.entities[k.to].kind));
  if(!conds.length){addNote(`Decision “${d.name}” has no answers yet.`);return renderPlay()}
  const set=outs.map(k=>p.entities[k.to]).find(e=>e&&e.kind==='setting');let sug=-1,reason='';
  if(set){const v=plCur().sim.settings[set.id]!=null?plCur().sim.settings[set.id]:(effectiveSetting(p,set,plCur().page,PL.role)??set.defaultValue);const on=isOnVal(v);sug=conds.findIndex(k=>on?/^(yes|on|true|allowed|ok)/i.test(k.label||''):/^(no|off|false|not)/i.test(k.label||''));if(sug>=0)reason=`Suggested answer: “${conds[sug].label}”, because ${set.name} is ${v}.`}
  PL.sheet={title:d.name,text:reason||'Pick an answer to carry on.',options:conds.map((k,i)=>({label:k.label||entityLabel(p,k.to),sub:'→ '+entityLabel(p,k.to)+(i===sug?' · suggested':''),primary:i===sug,run:()=>follow(k,{...ctx,choice:k.label||entityLabel(p,k.to)},depth+1)}))};
  renderPlay();
}
function arrive(pageId,ctx){
  const p=S.p,pg=p.entities[pageId];if(!pg)return;
  if(PL.role&&pg.roles&&pg.roles.length&&!pg.roles.includes(PL.role)){
    const names=pg.roles.map(r=>(p.roles.find(x=>x.id===r)||{}).name).filter(Boolean).join(', ');const me=(p.roles.find(r=>r.id===PL.role)||{}).name;
    PL.sheet={title:`Only ${names} can see this page`,text:`You're playing as ${me}. “${pg.name}” is set to ${names}.`,options:[{label:'Stay here',primary:true,run:()=>{}},{label:'Continue anyway',sub:'for this run',run:()=>pushStep(pageId,{...ctx,choice:(ctx.choice?ctx.choice+' · ':'')+'role overridden'})}]};
    return renderPlay();
  }
  pushStep(pageId,ctx);
}
function plBack(){if(PL.steps.length<2)return;PL.steps.pop();PL.sheet=null;renderPlay()}
// Saved paths
function savePathModal(){
  const p=S.p;const a=p.entities[PL.steps[0].page],b=p.entities[plCur().page];
  openModal({title:'Save this path',sub:`${PL.steps.length} steps. You can replay it any time.`,ic:'save',body:`<div class="field"><label for="pth-n">Name</label><input id="pth-n" class="inp big" value="${esc((a?a.name:'Start')+' to '+(b?b.name:'end'))}"></div>`,actions:[{label:'Cancel',run:closeModal},{label:'Save path',primary:true,icon:'check',run:()=>{const name=$('#pth-n').value.trim()||'My path';closeModal();commit('Save path “'+name+'”',p=>{p.paths=(p.paths||[]).concat([{id:uid('path'),name,at:Date.now(),role:PL.role||null,expect:'',steps:PL.steps.map(s=>({page:s.page,kind:s.kind,via:s.via,el:s.el,choice:s.choice,modal:s.modal,sim:s.sim}))}])});toast('Saved “'+name+'”');renderPlay()}}]});
}
function pathsSheet(){
  const ps=S.p.paths||[];
  PL.sheet={title:'Saved paths',text:ps.length?'Pick one to replay it step by step.':'No saved paths yet. Tap through a journey, then tap Save path.',options:ps.map(x=>({label:x.name,sub:`${x.steps.length} steps`,run:()=>startReplay(x)})).concat([{label:'Close',run:()=>{}}])};renderPlay();
}
function canReach(from,s,n){
  const p=S.p;if(!p.entities[s.page])return{ok:false,why:`the page in step ${n} was deleted`};
  if(s.kind!=='tap'||!s.el)return{ok:true};
  const el=findElement(p,from,s.el);if(!el)return{ok:false,why:`the button it tapped is gone from “${entityLabel(p,from)}”`};
  const reach=derivedEdges(p).filter(d=>d.from.entity===from&&d.from.element===s.el).map(d=>d.to);
  if(reach.includes(s.page)||s.page===from)return{ok:true};
  if(PL.steps.length>1&&s.page===PL.steps[PL.steps.length-2].page&&outConns(p,from,s.el).some(c=>c.type==='back'))return{ok:true};
  return{ok:false,why:`“${el.label}” no longer leads to “${entityLabel(p,s.page)}”`};
}
function startReplay(path){
  stopReplay();const s0=path.steps[0];if(!s0||!S.p.entities[s0.page])return failReplay(path,0,'its start page was deleted');
  PL.steps=[Object.assign(clone(s0),{notes:[]})];PL.replay={path,i:0,paused:false,timer:null};PL.sheet=null;renderPlay();scheduleReplay();
}
function scheduleReplay(){const r=PL.replay;if(!r||r.paused)return;clearTimeout(r.timer);r.timer=setTimeout(replayNext,1500)}
function replayNext(){
  const r=PL.replay;if(!r)return;
  if(r.i>=r.path.steps.length-1){r.paused=true;renderPlay();toast('Replay finished');return}
  const s=r.path.steps[r.i+1];const ok=canReach(plCur().page,s,r.i+2);
  if(!ok.ok)return failReplay(r.path,r.i+1,ok.why);
  PL.steps.push(Object.assign(clone(s),{notes:[]}));r.i++;renderPlay();scheduleReplay();
}
function failReplay(path,i,why){stopReplay();PL.sheet={title:`Replay stopped at step ${i+1}`,text:`“${path.name}” can't carry on because ${why}.`,options:[{label:'OK',primary:true,run:()=>{}}]};renderPlay()}
function stopReplay(){if(PL.replay){clearTimeout(PL.replay.timer);PL.replay=null}}
function bindPlay(el){
  el.addEventListener('click',ev=>{
    const a=ev.target.closest('[data-pact]');
    if(a){if(a.disabled)return;const k=a.dataset.pact;
      if(k==='close')return closePlay();
      if(k==='back')return plBack();
      if(k==='restart'){PL.steps=[{...PL.steps[0],sim:{settings:{},inputs:{}},notes:[]}];PL.sheet=null;return renderPlay()}
      if(k==='jump'){PL.steps=PL.steps.slice(0,+a.dataset.i+1);PL.sheet=null;return renderPlay()}
      if(k==='mode'){PL.mode=playMode()==='dark'?'light':'dark';return renderPlay()}
      if(k==='info'){PL.showInfo=!PL.showInfo;return renderPlay()}
      if(k==='web')return openWeb(plCur().page,id=>{if(id!==plCur().page)arrive(id,{kind:'jump',via:'Jumped from the page web'})});
      if(k==='save')return savePathModal();
      if(k==='paths')return pathsSheet();
      if(k==='sheet'){const o=PL.sheet&&PL.sheet.options[+a.dataset.i];PL.sheet=null;if(o)o.run();return renderPlay()}
      if(k==='rp-toggle'){const r=PL.replay;if(!r)return;r.paused=!r.paused;if(!r.paused&&r.i>=r.path.steps.length-1){return startReplay(r.path)}renderPlay();return scheduleReplay()}
      if(k==='rp-next'){const r=PL.replay;if(!r)return;r.paused=true;clearTimeout(r.timer);return replayNext()}
      if(k==='rp-back'){const r=PL.replay;if(!r||r.i===0)return;clearTimeout(r.timer);r.paused=true;PL.steps.pop();r.i--;return renderPlay()}
      if(k==='rp-stop'){stopReplay();return renderPlay()}
      return;
    }
    if(ev.target.closest('.pl-under,.pl-sheet'))return;
    if(ev.target.closest('[data-plback]'))return plBack();
    const part=ev.target.closest('[data-pl]');if(part&&!ev.target.matches('input'))playTap(part.dataset.pl,part);
  });
  el.addEventListener('keydown',ev=>{const part=ev.target.closest&&ev.target.closest('[data-pl],[data-plback]');if(part&&(ev.key==='Enter'||ev.key===' ')&&!ev.target.matches('input')){ev.preventDefault();part.dataset.plback?plBack():playTap(part.dataset.pl,part)}});
  el.addEventListener('input',ev=>{const k=ev.target.dataset&&ev.target.dataset.in;if(k)plCur().sim.inputs[k]=ev.target.value});
  el.addEventListener('change',ev=>{const k=ev.target.dataset&&ev.target.dataset.pchg;if(k==='device'){PL.device=ev.target.value;renderPlay()}if(k==='role'){PL.role=ev.target.value;renderPlay()}});
}

// ---------- Page web pop-up ----------
function openWeb(center,onPick){
  const p=S.p;const pages=Object.values(p.entities).filter(e=>e.kind==='page');if(!pages.length)return;
  if(!p.entities[center]||p.entities[center].kind!=='page')center=p.startPageId&&p.entities[p.startPageId]?p.startPageId:pages[0].id;
  const D=derivedEdges(p);const outs=new Map(),ins=new Set();
  for(const d of D){if(d.from.entity===center&&d.to!==center&&!outs.has(d.to)){const el=d.from.element?findElement(p,center,d.from.element):null;outs.set(d.to,el?el.label:(d.label||''))}if(d.to===center&&d.from.entity!==center)ins.add(d.from.entity)}
  const r1=[...outs.keys()],r2=[...ins].filter(id=>!outs.has(id));let r3=pages.map(e=>e.id).filter(id=>id!==center&&!outs.has(id)&&!ins.has(id));
  const room=Math.max(0,40-r1.length-r2.length);const more=Math.max(0,r3.length-room);r3=r3.slice(0,room);
  const C=400;const pos=(ids,R,off)=>ids.map((id,i)=>{const a=-Math.PI/2+off+(i/Math.max(1,ids.length))*Math.PI*2;return{id,x:C+R*Math.cos(a),y:C+R*Math.sin(a)}});
  const n1=pos(r1,170,0),n2=pos(r2,285,.25),n3=pos(r3,365,.12);
  const short=s=>s.length>17?s.slice(0,16)+'…':s;
  const node=(n,cls)=>{const e=p.entities[n.id];const m=p.modules[e.moduleId];return `<g data-wnode="${n.id}" class="${cls}" tabindex="0" role="button" aria-label="${esc(e.name)}"><rect x="${n.x-66}" y="${n.y-18}" width="132" height="36" rx="12" style="fill:color-mix(in srgb,var(--m-${m?m.colour:'coral'}) ${cls==='w3'?10:22}%,var(--card));stroke:var(--m-${m?m.colour:'coral'})" stroke-width="1.5"/><text x="${n.x}" y="${n.y+5}" text-anchor="middle" style="fill:var(--ink)" font-size="13" font-weight="${cls==='w3'?400:700}">${esc(short(e.name))}</text></g>`};
  let svg=`<svg viewBox="0 0 800 800" role="img" aria-label="Page web around ${esc(p.entities[center].name)}">`;
  svg+=n3.map(n=>`<line x1="${C}" y1="${C}" x2="${n.x}" y2="${n.y}" style="stroke:var(--line)" stroke-width="1"/>`).join('');
  svg+=n2.map(n=>`<line x1="${n.x}" y1="${n.y}" x2="${C}" y2="${C}" style="stroke:var(--gold)" stroke-width="2.2" stroke-dasharray="6 5"/>`).join('');
  svg+=n1.map(n=>`<line x1="${C}" y1="${C}" x2="${n.x}" y2="${n.y}" style="stroke:var(--coral)" stroke-width="2.6"/>`).join('');
  svg+=n1.map(n=>{const lab=outs.get(n.id);if(!lab)return '';const mx=C+(n.x-C)*.55,my=C+(n.y-C)*.55;return `<text x="${mx}" y="${my-6}" text-anchor="middle" font-size="11" style="fill:var(--coral-text);paint-order:stroke;stroke:var(--bar);stroke-width:4px">${esc(short(lab))}</text>`}).join('');
  svg+=n3.map(n=>node(n,'w3')).join('')+n2.map(n=>node(n,'w2')).join('')+n1.map(n=>node(n,'w1')).join('');
  const ce=p.entities[center];svg+=`<g><rect x="${C-90}" y="${C-28}" width="180" height="56" rx="16" style="fill:var(--coral-fill)"/><text x="${C}" y="${C+6}" text-anchor="middle" font-size="16" font-weight="800" style="fill:var(--on-fill)">${esc(short(ce.name))}</text></g></svg>`;
  let w=$('#web');if(!w){w=document.createElement('div');w.id='web';document.body.appendChild(w);
    w.addEventListener('click',ev=>{const n=ev.target.closest('[data-wnode]');if(n){const f=w._pick;w.hidden=true;f&&f(n.dataset.wnode);return}if(ev.target.closest('[data-wact=close]')||ev.target===w)w.hidden=true});
    w.addEventListener('keydown',ev=>{if(ev.key==='Escape'){ev.stopPropagation();w.hidden=true}const n=ev.target.closest&&ev.target.closest('[data-wnode]');if(n&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();n.click()}})}
  w._pick=onPick;w.hidden=false;
  w.innerHTML=`<div class="web-box" role="dialog" aria-modal="true" aria-labelledby="web-t"><div class="web-h"><b id="web-t">Page web</b><span>${esc(ce.name)}: ${r1.length} one tap away, ${r2.length} lead here</span><button class="btn icon ghost" data-wact="close" aria-label="Close page web">${icon('x')}</button></div>${svg}<div class="web-key"><span><i style="background:var(--coral)"></i>One tap away</span><span><i style="background:var(--gold)"></i>Leads here</span><span><i style="background:var(--line)"></i>Everything else</span>${more?`<span>+${more} more pages not shown</span>`:''}</div><p class="help">Tap a page to go there.</p></div>`;
  const f=w.querySelector('[data-wnode]')||w.querySelector('[data-wact]');f&&f.focus();
}
function pathsHTML(){const ps=(S.p.paths||[]).slice().reverse();return `<div class="mod-h">Saved paths</div><div class="list">${ps.map(x=>`<div class="li"><span class="grow">${esc(x.name)}<small>${x.steps.length} steps · ${ago(x.at)}</small></span><button class="btn small" data-act="path-replay" data-id="${x.id}">Replay</button><button class="mini" data-act="path-del" data-id="${x.id}" aria-label="Delete path ${esc(x.name)}">${icon('trash')}</button></div>`).join('')||'<p class="help">None yet. Save one from Play.</p>'}</div>`}

Object.assign(ACT,{
  view:d=>setView(d.v),
  play:()=>openPlay(),
  web:()=>{const s=S.sel;openWeb(s&&s.t!=='conn'?s.id:S.p.startPageId,id=>select({t:'entity',id},{centre:true}))},
  'path-replay':d=>{const x=(S.p.paths||[]).find(q=>q.id===d.id);if(!x)return;openPlay(x.steps[0].page);startReplay(x)},
  'path-del':d=>{const x=(S.p.paths||[]).find(q=>q.id===d.id);if(x)commit('Delete path “'+x.name+'”',p=>{p.paths=p.paths.filter(q=>q.id!==d.id)})},
});
window.addEventListener('resize',()=>{if(PL.open)fitDevice()});

// ---------- Theme ----------

// ---------- Appearance: link families, link key, Settings > Appearance ----------
/* Every link type belongs to one of 8 families. Each family has its own colour, dash pattern and symbol,
   and means the same thing in every theme. Patterns are tuned for a 3px line so they stay recognisable. */
const FAMS={
  navigate:{label:'Navigate',plain:'Go to another screen',col:'--e-nav',dash:''},
  function:{label:'Function',plain:'Runs something the app does',col:'--e-fn',dash:'14 6'},
  data:{label:'Data',plain:'Reads or saves stored information',col:'--e-data',dash:'3 6'},
  condition:{label:'Condition',plain:'An answer to a decision, like Yes or No',col:'--e-cond',dash:'10 5 3 5'},
  error:{label:'Error',plain:'Where things go if something fails',col:'--e-err',dash:'7 4'},
  permission:{label:'Permission',plain:'Only lets certain users through',col:'--e-perm',dash:'16 5 3 5'},
  api:{label:'API',plain:'Talks to an outside service',col:'--e-api',dash:'8 4 3 4 3 4'},
  reference:{label:'Reference',plain:'Uses or depends on something',col:'--e-ref',dash:'0.1 7'}
};
const FAMILY={navigate:'navigate',modal:'navigate',back:'navigate',trigger:'function',setting:'function',notify:'function',workflow:'function',read:'data',write:'data',background:'data',condition:'condition',permission:'permission',api:'api',error:'error',reference:'reference'};
const famOf=t=>FAMILY[t]||'navigate';
function safeJSON(s){try{const v=JSON.parse(s||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch(e){return {}}}
function nodeIds(p){
  const n=Object.keys(p.entities).length;
  if(S._nidP===p&&S._nidN===n)return S._nid;
  const pre={page:'P',function:'F',decision:'D',setting:'S',data:'DT',component:'C'};const cnt={},m={};
  for(const e of Object.values(p.entities)){const k=pre[e.kind]||'N';cnt[k]=(cnt[k]||0)+1;m[e.id]=k+String(cnt[k]).padStart(2,'0')}
  S._nid=m;S._nidP=p;S._nidN=n;return m;
}
function renderLinkKey(){
  const k=$('#lkey');if(!k)return;const hide=S.linkHide;
  k.innerHTML=`<h3>Link key<button class="btn icon small ghost" data-act="lkey" aria-label="Close link key">${icon('x')}</button></h3>`+Object.entries(FAMS).map(([f,v])=>{const on=!hide.has(f);
    return `<button class="lg-row f-${f}" data-act="lfilter" data-f="${f}" aria-pressed="${on}" aria-label="${v.label} links: ${on?'shown':'hidden'}. ${esc(v.plain)}"><span class="cb" aria-hidden="true">${on?'✓':''}</span><svg viewBox="0 0 46 14" aria-hidden="true"><path d="M2 7H37" style="stroke:var(${v.col});stroke-width:3;fill:none${f==='reference'?';stroke-linecap:round':''}" ${v.dash?`stroke-dasharray="${v.dash}"`:''}/><path d="M36 2 45 7 36 12z" style="fill:var(${v.col})"/></svg><i class="g" aria-hidden="true"></i><span class="nm">${v.label}</span></button>`}).join('')
    +`<p class="lg-note">Each type has its own colour, line pattern and symbol. Tap one to hide or show it.</p>`;
}
function themePreview(id,mode){
  const t=FMT.THEMES[id];const st=FMT.css(FMT.vars(id,mode));
  return `<span class="thp" aria-hidden="true" data-s="${t.shape.shadowStyle}" style="${esc(st)}"><span class="tb"></span><span class="hd">Aa</span><span class="gr"></span><span class="md"></span>
  <svg viewBox="0 0 118 84"><path d="M39 30.5H53" style="stroke:var(--fm-link-navigate);stroke-width:1.8;fill:none"/><path d="M53 27.5l4 3-4 3z" style="fill:var(--fm-link-navigate)"/><path d="M23 40V58H34" style="stroke:var(--fm-link-function);stroke-width:1.8;fill:none" stroke-dasharray="4 2"/><path d="M85 31V46" style="stroke:var(--fm-link-data);stroke-width:1.8;fill:none" stroke-dasharray="1.2 2"/></svg>
  <span class="nd" style="left:9px;top:22px">Home</span><span class="nd" style="left:58px;top:22px">List</span><span class="dm" style="left:78px;top:48px"></span><span class="nd" style="left:35px;top:50px">Save</span><span class="sa">Smart</span></span>`;
}
function appearanceHTML(){
  const pr=S.prefs;const mode=FMT.current().mode||'light';
  const seg=(key,opts,lab,help)=>`<div class="field"><span class="flabel" id="apl-${key}">${lab}</span>${help?`<p class="help">${help}</p>`:''}<div class="chips" role="group" aria-labelledby="apl-${key}">${opts.map(([v,l])=>{const on=String(pr[key])===String(v);return `<button class="${on?'on':''}" aria-pressed="${on}" data-act="ap" data-k="${key}" data-v="${v}">${l}</button>`}).join('')}</div></div>`;
  const cards=FMT.ORDER.map(id=>{const t=FMT.THEMES[id];const on=pr.themeId===id;
    const sw=m=>['canvas','card','primary','accent'].map(k=>`<i style="background:${t[m][k]}"></i>`).join('');
    return `<button class="thc" role="radio" aria-checked="${on}" tabindex="${on?0:-1}" data-act="ap" data-k="themeId" data-v="${id}">${themePreview(id,mode)}<span class="thn"><b style="font-family:${esc(FMT.vars(id,mode)['--fm-font-display'])}">${esc(t.name)}</b><small>${esc(t.mood)}</small><span class="ths" aria-hidden="true"><span>${sw('light')} Light</span><span>${sw('dark')} Dark</span></span>${on?'<span class="thk">✓ Selected</span>':''}</span></button>`}).join('');
  return `<div class="field"><span class="flabel" id="apl-themeId">Theme</span><p class="help">Changes show straight away. They change FlowMate only, not the apps you plan.</p><div class="thg" role="radiogroup" aria-labelledby="apl-themeId">${cards}</div></div>
  ${seg('theme',[['auto','Follow system'],['light','Light'],['dark','Dark']],'Mode')}
  ${seg('textSize',[[100,'100%'],[115,'115%'],[130,'130%'],[150,'150%']],'Text size')}
  ${seg('density',[['comfortable','Comfortable'],['compact','Compact']],'Spacing')}
  ${seg('contrast',[[false,'Normal'],[true,'Increased']],'Contrast','Increased makes borders, lines and grey text darker or lighter.')}
  ${seg('motion',[['auto','Follow device'],['off','Reduced']],'Motion')}
  ${seg('grid',[[true,'Show'],[false,'Hide']],'Canvas dot grid')}
  ${seg('linkLabels',[[true,'Words + symbols'],[false,'Symbols only']],'Link labels')}
  <div class="field"><button class="btn small ap-reset" data-act="ap-reset">${icon('back')}Reset appearance</button><p class="help">Only resets how FlowMate looks. Your projects stay as they are.</p></div>`;
}
function setAppearance(k,v){
  S.prefs[k]=v;S.prefs=FMT.sanitize(S.prefs);savePrefs();applyPrefs();
  if(S.p)renderCanvas();
}
/* Re-draw the settings panel without losing the focused control or scroll spot */
function rerenderPanelKeep(sel){
  const pn=$('#panel');const a=document.activeElement;const inPanel=pn&&a&&pn.contains(a);
  if(!sel&&inPanel&&a.dataset&&a.dataset.act)sel=`[data-act="${a.dataset.act}"]`+(a.dataset.k?`[data-k="${a.dataset.k}"]`:'')+(a.dataset.v!=null?`[data-v="${a.dataset.v}"]`:'');
  const sc=pn?pn.scrollTop:0;renderPanel();if(pn)pn.scrollTop=sc;
  if(inPanel&&sel){const el=document.querySelector('#panel '+sel);if(el)el.focus({preventScroll:true})}
}
Object.assign(ACT,{
  ap:d=>{let v=d.v;const k=d.k;if(k==='textSize')v=+v;if(['contrast','grid','linkLabels'].includes(k))v=v==='true';
    S._apBusy=true;setAppearance(k,v);S._apBusy=false;rerenderPanelKeep(`[data-act="ap"][data-k="${k}"][data-v="${d.v}"]`)},
  'ap-reset':()=>{for(const k of ['themeId','theme','textSize','density','motion','contrast','grid','linkLabels'])S.prefs[k]=FMT.AP_DEF[k];
    S._apBusy=true;setAppearance('apVersion',1);S._apBusy=false;rerenderPanelKeep('[data-act="ap-reset"]');toast('Appearance reset. Your projects are unchanged.')},
  lkey:(d,btn)=>{const k=$('#lkey');k.hidden=!k.hidden;$$('.lkey-btn').forEach(b=>b.setAttribute('aria-expanded',String(!k.hidden)));if(btn&&btn.classList.contains('lkey-btn'))S._lkeyFrom=btn;
    if(!k.hidden){renderLinkKey();const f=k.querySelector('.lg-row');f&&f.focus()}else{const b=S._lkeyFrom&&S._lkeyFrom.offsetParent?S._lkeyFrom:$$('.lkey-btn').find(x=>x.offsetParent);b&&b.focus()}},
  lfilter:d=>{const h=S.linkHide;h.has(d.f)?h.delete(d.f):h.add(d.f);renderCanvas();renderLinkKey();const b=$(`#lkey [data-f="${d.f}"]`);b&&b.focus();
    $$('.lkey-btn').forEach(b=>{b.classList.toggle('on',h.size>0);b.setAttribute('aria-label',h.size?`Link key (${h.size} type${h.size>1?'s':''} hidden)`:'Link key and filter')})}
});
/* Arrow keys move between theme cards (radio group) */
document.addEventListener('keydown',ev=>{
  const c=ev.target.closest&&ev.target.closest('.thc');if(!c)return;
  const d={ArrowDown:1,ArrowRight:1,ArrowUp:-1,ArrowLeft:-1}[ev.key];if(!d)return;ev.preventDefault();
  const ids=FMT.ORDER;const i=(ids.indexOf(c.dataset.v)+d+ids.length)%ids.length;ACT.ap({k:'themeId',v:ids[i]});
});
/* Keep open tabs in step */
window.addEventListener('storage',e=>{
  if(e.key!=='fm.prefs')return;const n=FMT.sanitize(safeJSON(e.newValue));
  for(const k of Object.keys(FMT.AP_DEF))S.prefs[k]=n[k];applyPrefs();if(S.p)renderCanvas();if(S.panel==='settings')rerenderPanelKeep();
});


