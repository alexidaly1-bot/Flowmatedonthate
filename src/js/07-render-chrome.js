// =========================================================
// RENDER — chrome
// =========================================================
function renderTop(){const p=S.p;$('#projName span').textContent=p?p.name:'Projects'}
const NAV=[['canvas','Canvas','flow'],['find','Find','search'],['pages','Pages','grid'],['functions','Functions','bolt'],['components','Components','layers'],['data','Data & settings','database'],['roles','User roles','users'],['colours','Colours','palette'],['assets','Assets','image'],['ai','AI Assistant','sparkle'],['check','Check','check2'],['testing','Testing','flask'],['progress','Progress','star'],['docs','Docs','file'],['team','Team','chat'],['activity','Activity & reasons','trace'],['history','History & versions','history'],['settings','Settings','gear'],['words','Plain English','book']];
const SOON=[];
function renderSidebar(){
  const sb=$('#sidebar');const iss=S.p?checkProject(S.p).filter(i=>i.sev==='problem').length:0;
  sb.classList.toggle('collapsed',!S.prefs.sidebar);
  let h='';
  for(const[k,l,i] of NAV){const on=(S.panel||'canvas')===k;h+=`<button class="nav${on?' on':''}" data-act="panel" data-p="${k}" aria-pressed="${on}">${icon(i)}<span>${l}</span>${k==='check'&&iss?`<b class="badge">${iss}</b>`:''}</button>`}
  h+=`<button class="nav mob-only" data-act="details">${icon('info')}<span>App details</span></button>`;
  h+=`<button class="nav mob-only" data-act="walkthrough">${icon('play')}<span>Walk me through it</span></button><button class="nav mob-only" data-act="present">${icon('eye')}<span>Present</span></button>`;
  h+=`<div class="nav-sep"></div><button class="nav desk-only" data-act="toggle-sidebar">${icon(S.prefs.sidebar?'back':'chev')}<span>${S.prefs.sidebar?'Make smaller':''}</span></button>`;
  const pages=S.p?Object.values(S.p.entities).filter(e=>e.kind==='page').length:0;
  h+=`<button class="proj-card" data-act="home" aria-label="All projects">${icon('cloud')}<div><b>${esc(S.p?S.p.name:'')}</b><small>${pages} pages · <span id="syncTxt"></span></small></div></button>`;
  sb.innerHTML=h;renderSync();
}
function renderSync(){const t=$('#syncTxt');if(!t)return;const[cls,txt]=SYNC_TEXT[Cloud.state]||SYNC_TEXT.device;t.innerHTML=`<span class="dotst ${cls}" style="display:inline-block"></span> ${esc(txt)}`}
function renderMid(){
  const cx=S.prefs.complexity,v=S.prefs.view||'blocks';
  let h=`<div class="seg" role="group" aria-label="View"><button class="${v==='blocks'?'on':''}" data-act="view" data-v="blocks" aria-pressed="${v==='blocks'}">${icon('grid')}Blocks</button><button class="${v==='screens'?'on':''}" data-act="view" data-v="screens" aria-pressed="${v==='screens'}">${icon('section')}Screens</button></div><button class="btn small primary" data-act="play">${icon('play')}Play</button>`;
  if(v==='blocks')h+=`<div class="seg desk-only" role="group" aria-label="How much detail">${[['simple','Simple'],['detailed','Detailed'],['technical','Technical']].map(([k,l])=>`<button class="${cx===k?'on':''}" data-act="complexity" data-v="${k}" aria-pressed="${cx===k}">${l}</button>`).join('')}</div>`;
  else h+=`<label class="sr" for="dev-sel">Device</label><select id="dev-sel" class="inp dev-sel" data-act-change="device">${Object.entries(DEVICES).map(([k,d])=>opt(k,S.prefs.device||'phone',d.label)).join('')}</select>`;
  h+=`<button class="btn small ghost desk-only" data-act="walkthrough" title="Walk me through a journey">${icon('mic')}Walk through</button><button class="btn small ghost desk-only" data-act="present" title="Present the map">${icon('eye')}Present</button><button class="btn small ghost desk-only" data-act="web" title="Page web">${icon('trace')}Web</button><button class="btn small ghost" data-act="tidy" title="Tidy up the layout">${icon('tidy')}<span class="desk-only">Tidy</span></button>`;
  $('#ovMid').innerHTML=h;
}
function renderAll(){renderTop();renderSidebar();renderMid();renderCanvas();renderEditor();renderPanel()}

