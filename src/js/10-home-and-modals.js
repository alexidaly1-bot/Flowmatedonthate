// =========================================================
// HOME (projects dashboard) + MODALS
// =========================================================
function renderHome(){
  const list=Object.values(S.projects).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  $('#home').innerHTML=`<div class="home-in"><div class="home-top"><span class="logo" style="pointer-events:none"><svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><rect x="14" y="3" width="12" height="10" rx="3.5" fill="#EDB54F"/><rect x="3" y="27" width="12" height="10" rx="3.5" fill="#E2805F"/><rect x="25" y="27" width="12" height="10" rx="3.5" fill="#E2805F"/><path d="M20 13v6M9 27v-5h22v5" stroke="#E2805F" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span><h1>Your app maps</h1><button class="btn" data-act="import">${icon('upload')}Import JSON</button><button class="btn primary" data-act="new-project">${icon('plus')}New project</button>${S.p?`<button class="btn icon ghost" data-act="close-home" aria-label="Back to the canvas">${icon('x')}</button>`:''}</div>
  <div class="pgrid">${list.map(p=>{const pages=Object.values(p.entities).filter(e=>e.kind==='page').length;const done=Object.values(p.entities).filter(e=>e.kind==='page'&&e.status==='Done').length;const iss=checkProject(p).filter(i=>i.sev==='problem').length;return `<div class="pcard"><h3>${esc(p.name)}</h3><p>${esc((p.description||'No description yet.').slice(0,140))}</p><div class="stats"><span class="chip st-planned">${pages} pages</span><span class="chip st-done">${done} done</span>${iss?`<span class="chip st-blocked">${iss} problems</span>`:''}</div><p>Edited ${ago(p.updatedAt)}</p><div class="row-btns"><button class="btn primary small" data-act="open-project" data-id="${p.id}">Open</button><button class="btn small" data-act="dup-project" data-id="${p.id}">${icon('copy')}Copy</button><button class="btn small ghost" data-act="del-project" data-id="${p.id}" aria-label="Delete ${esc(p.name)}">${icon('trash')}</button></div></div>`}).join('')||'<p>No projects yet.</p>'}</div>
  <p class="help" style="margin-top:28px"><span id="syncHome"></span></p>${roadmapHTML()}</div>`;
  const[,txt]=SYNC_TEXT[Cloud.state]||SYNC_TEXT.device;$('#syncHome').textContent=txt+'.';
}
function showHome(){renderHome();$('#home').classList.remove('hide')}
function hideHome(){$('#home').classList.add('hide')}
let MODAL=null;
function openModal({title,sub='',ic='info',body,actions=[],wide=false,onOpen}){
  MODAL={actions};const m=$('#modal');
  m.innerHTML=`<div class="mbox${wide?' wide':''}"><div class="mhead"><span class="tile">${icon(ic)}</span><div><h2 id="mtitle">${esc(title)}</h2>${sub?`<p>${esc(sub)}</p>`:''}</div><button class="btn icon ghost x" data-act="modal-close" aria-label="Close">${icon('x')}</button></div><div class="mbody">${body}</div><div class="mfoot">${actions.map((a,i)=>`<button class="btn ${a.primary?'primary':a.danger?'danger':''}" data-act="modal-btn" data-i="${i}">${a.icon?icon(a.icon):''}${esc(a.label)}</button>`).join('')}</div></div>`;
  m.setAttribute('aria-labelledby','mtitle');m.classList.remove('hide');
  const f=m.querySelector('input:not([type=radio]):not([type=checkbox]),select,textarea')||m.querySelector('.mfoot .btn');f&&f.focus();
  onOpen&&onOpen(m);
}
function closeModal(){if(window.AI&&AI.ctl){try{AI.ctl.abort()}catch(e){}}if(window.AI&&AI.dict&&AI.listening)AI.dict.stop().catch(()=>{});$('#modal').classList.add('hide');$('#modal').innerHTML='';MODAL=null}
function confirmModal(title,body,label,run){openModal({title,ic:'alert',body:`<p>${body}</p>`,actions:[{label:'Cancel',run:closeModal},{label,danger:true,run:()=>{closeModal();run()}}]})}
function toast(msg,action){const t=$('#toast');t.innerHTML=esc(msg)+(action?`<button class="btn" data-act="toast-act">${esc(action.label)}</button>`:'');t._act=action;t.hidden=false;clearTimeout(t._tm);t._tm=setTimeout(()=>t.hidden=true,action?6000:2600)}

function wizard(){
  openModal({title:'New project',sub:'Start small. You can change everything later.',ic:'plus',body:`
   <div class="field"><label for="w-name">App name</label><input id="w-name" class="inp big" placeholder="e.g. LandlordMate"></div>
   <div class="field"><label for="w-desc">What's it for? (one line)</label><input id="w-desc" class="inp" placeholder="e.g. Helps small landlords track rent and repairs"></div>
   <div class="field"><span class="flabel">Where will it run?</span><div class="chips" id="w-plat">${['Android','iPhone','Web','Desktop'].map((x,i)=>`<button class="${i===0?'on':''}" data-act="w-plat">${x}</button>`).join('')}</div></div>
   <div class="field"><span class="flabel">Start from</span>
   <label class="opt on"><input type="radio" name="w-start" value="blank" checked><span><b>A Home page</b><small>An empty map with one starting page.</small></span></label>
   <label class="opt"><input type="radio" name="w-start" value="example"><span><b>The LandlordMate example</b><small>A full worked example you can change and learn from.</small></span></label>
   <label class="opt"><input type="radio" name="w-start" value="tpl-booking"><span><b>Booking app template</b><small>Browse, pick a time, pay, confirmation, my bookings.</small></span></label>
   <label class="opt"><input type="radio" name="w-start" value="tpl-shop"><span><b>Shop template</b><small>Products, cart, checkout, orders.</small></span></label>
   <label class="opt"><input type="radio" name="w-start" value="tpl-social"><span><b>Community app template</b><small>Feed, posts, messages, profile.</small></span></label>
   <label class="opt"><input type="radio" name="w-start" value="ai"><span><b>Describe it and let Claude draft it</b><small>Starts with Home, then Smart Action proposes the first pages for you to check.</small></span></label></div>`,
   actions:[{label:'Cancel',run:closeModal},{label:'Create project',primary:true,icon:'check',run:()=>{
     const name=$('#w-name').value.trim();const startV=$('input[name=w-start]:checked').value;const ex=startV==='example'||startV.startsWith('tpl-');
     if(!name&&!ex){$('#w-name').focus();$('#w-name').style.borderColor='var(--bad)';toast('Give your app a name first');return}
     const platforms=$$('#w-plat button.on').map(b=>b.textContent);
     const desc=$('#w-desc').value.trim();
     const p=startV.startsWith('tpl-')?buildTemplate(startV.slice(4),name,desc,platforms):ex?seedLandlord():blankProject({name,description:desc,platforms});
     if(ex&&name)p.name=name;if(startV==='ai')setTimeout(()=>openSmartAction(`Draft the first version of this app: ${name}${desc?'. '+desc:''}. Add the main pages, the buttons on each, and how they link.`),400);
     S.projects[p.id]=p;saveLocal(p);queueCloud(p);closeModal();openProject(p.id,true);
   }}]});
}
function addPageModal(from){
  const p=S.p;
  openModal({title:'Add a page',ic:'plus',body:`<div class="field"><label for="ap-name">Page name</label><input id="ap-name" class="inp big" placeholder="e.g. Rent history"></div><div class="field"><label for="ap-type">Page type</label><select id="ap-type" class="inp">${PAGE_TYPES.map(t=>opt(t,'Custom')).join('')}</select></div><div class="field"><label for="ap-mod">Module</label><select id="ap-mod" class="inp">${opt('',(p.entities[S.sel?.id]?.moduleId)||'','No module')}${Object.values(p.modules).map(m=>opt(m.id,p.entities[S.sel?.id]?.moduleId,m.name)).join('')}</select></div>`,
    actions:[{label:'Cancel',run:closeModal},{label:'Add page',primary:true,icon:'check',run:()=>{
      const name=$('#ap-name').value.trim();if(!name){$('#ap-name').style.borderColor='var(--bad)';$('#ap-name').focus();toast('Type a page name');return}
      const type=$('#ap-type').value,mod=$('#ap-mod').value||null;closeModal();
      const e=commit('Add page “'+name+'”',p=>{const c=viewCentre();const e=addEntity(p,'page',{name,pageType:type,moduleId:mod,x:c.x-134,y:c.y-60});nudgeFree(p,e);if(S.prefs.view==='screens'){e.sx=Math.round(c.x-190);e.sy=Math.round(c.y-320)}if(!p.startPageId)p.startPageId=e.id;return e});
      if(e){select({t:'entity',id:e.id});}
    }}]});
  setTimeout(()=>{const i=$('#ap-name');i&&i.addEventListener('keydown',ev=>{if(ev.key==='Enter')MODAL.actions[1].run()})},0);
}
function viewCentre(){const r=vp.getBoundingClientRect();return{x:(r.width/2-S.view.x)/S.view.z,y:(r.height/2-S.view.y)/S.view.z}}
function addKind(kind,at){
  const e=commit('Add '+KINDS[kind].label.toLowerCase(),p=>{const c=at||viewCentre();const e=addEntity(p,kind,{name:'New '+KINDS[kind].label.toLowerCase(),moduleId:p.entities[S.sel?.id]?.moduleId||null,x:c.x-(kind==='decision'?95:134),y:c.y-50});nudgeFree(p,e);return e});
  if(e){select({t:'entity',id:e.id});setTimeout(()=>{const f=$('#f-name');f&&(f.focus(),f.select())},30)}
}
function detailsModal(){
  const p=S.p;
  openModal({title:'App details',ic:'info',body:`<div class="field"><label for="d-name">App name</label><input id="d-name" class="inp big" value="${esc(p.name)}"></div><div class="field"><label for="d-desc">What it's for</label><textarea id="d-desc" class="inp">${esc(p.description)}</textarea></div><div class="field"><label for="d-start">First page people see</label><select id="d-start" class="inp">${opt('',p.startPageId||'','Not set')}${Object.values(p.entities).filter(e=>e.kind==='page').map(e=>opt(e.id,p.startPageId,e.name)).join('')}</select></div><div class="field"><span class="flabel">Modules</span>${Object.values(p.modules).sort((a,b)=>a.order-b.order).map(m=>`<div style="display:flex;gap:8px;margin-bottom:6px;align-items:center"><span class="mod-dot" style="--mc:var(--m-${m.colour})"></span><input class="inp" data-mod="${m.id}" value="${esc(m.name)}" aria-label="Module name"><select class="inp" style="width:120px" data-modc="${m.id}" aria-label="Module colour">${MOD_COLOURS.map(c=>opt(c,m.colour,c[0].toUpperCase()+c.slice(1))).join('')}</select></div>`).join('')||'<p class="help">No modules yet. Add one from any card\'s editor.</p>'}</div><div class="field"><span class="flabel">App look <small class="help">used in Screens and Play</small></span><div class="kv"><label for="lk-c">Main colour</label><input type="color" id="lk-c" value="${esc((p.look||{}).primary||'#E2805F')}" style="width:64px;height:40px;border:0;background:none"><label for="lk-m">Light or dark</label><select id="lk-m" class="inp">${opt('light',(p.look||{}).mode||'light','Light')}${opt('dark',(p.look||{}).mode,'Dark')}</select><label for="lk-r">Corners</label><select id="lk-r" class="inp">${opt('round',(p.look||{}).corners||'round','Round')}${opt('soft',(p.look||{}).corners,'Soft')}${opt('square',(p.look||{}).corners,'Square')}</select><label for="lk-t">Text size</label><select id="lk-t" class="inp">${['100','115','130'].map(v=>opt(v,String((p.look||{}).text||100),v+'%')).join('')}</select></div></div><div class="kv help"><span>Platforms</span><span>${esc((p.platforms||[]).join(', ')||'—')}</span><span>Project ID</span><span>${esc(p.id)}</span><span>Created</span><span>${new Date(p.createdAt).toLocaleString('en-AU')}</span></div>`,
   actions:[{label:'Cancel',run:closeModal},{label:'Save',primary:true,icon:'check',run:()=>{
     const name=$('#d-name').value.trim()||p.name,desc=$('#d-desc').value,start=$('#d-start').value||null;
     const look={primary:$('#lk-c').value,mode:$('#lk-m').value,corners:$('#lk-r').value,text:+$('#lk-t').value};const mods=$$('[data-mod]').map(i=>[i.dataset.mod,i.value.trim()]),cols=$$('[data-modc]').map(s=>[s.dataset.modc,s.value]);
     closeModal();commit('Update app details',p=>{p.name=name;p.description=desc;p.startPageId=start;p.look=look;for(const[id,n] of mods)if(p.modules[id]&&n)p.modules[id].name=n;for(const[id,c] of cols)if(p.modules[id])p.modules[id].colour=c});
   }}]});
}
function exportModal(){
  const p=S.p;let fmt='json';
  const out=()=>fmt==='json'?exportJSON(p):fmt==='mermaid'?toMermaid(p):toCSV(p);
  const fname=()=>`${p.name.replace(/[^\w-]+/g,'-').toLowerCase()}-flowmate.${fmt==='json'?'json':fmt==='mermaid'?'md':'csv'}`;
  const opts=[['json','Developer pack (JSON)','The whole project. Import it back here, or hand it to a coding AI.'],['mermaid','Mermaid diagram','A text diagram that GitHub, Notion and many docs tools can draw.'],['csv','Page & button list (CSV)','Every page, button and where it goes. Opens in Sheets or Excel.']];
  openModal({title:'Export',sub:'Save or share your app map.',ic:'export',wide:true,body:`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px"><div>${opts.map(([k,l,d])=>`<label class="opt${k===fmt?' on':''}"><input type="radio" name="ex" value="${k}" ${k===fmt?'checked':''}><span><b>${l}</b><small>${d}</small></span></label>`).join('')}<p class="help">PNG, SVG and PDF picture exports come in Phase 4.</p></div><div><span class="flabel">Preview <span class="chip st-planned" id="ex-size"></span></span><pre class="out" id="ex-out"></pre></div></div>`,
    actions:[{label:'Cancel',run:closeModal},{label:'Copy',icon:'copy',run:async()=>{try{await navigator.clipboard.writeText(out());toast('Copied')}catch(e){const r=document.createRange();r.selectNodeContents($('#ex-out'));getSelection().removeAllRanges();getSelection().addRange(r);toast('Text selected. Press Ctrl+C to copy.')}}},{label:'Download',primary:true,icon:'download',run:()=>download(fname(),out())}],
    onOpen:m=>{const upd=()=>{const o=out();$('#ex-out').textContent=o.length>20000?o.slice(0,20000)+'\n…':o;$('#ex-size').textContent=Math.ceil(o.length/1024)+' KB'};upd();m.firstElementChild.addEventListener('change',ev=>{if(ev.target.name==='ex'){fmt=ev.target.value;$$('.opt',m).forEach(o=>o.classList.toggle('on',o.querySelector('input').checked));upd()}})}});
}
async function download(filename,data){
  if(!/\.(gif|png|jpe?g|webp|mp4|webm|txt|json|md|docx|pptx|epub|csv|ttf|html|svg|pdf|xlsx|zip)$/i.test(filename))filename+='.txt';
  try{if(window.claude&&window.claude.use){const dl=await window.claude.use('downloads');if(dl){await dl.save({filename,data});toast('Saved '+filename);return}}}catch(e){if(e&&/declin|cancel|reject/i.test(e.code||e.message||'')){toast('Download cancelled');return}}
  try{const a=document.createElement('a');a.href=URL.createObjectURL(data instanceof Blob?data:new Blob([data],{type:'text/plain'}));a.download=filename;document.body.appendChild(a);a.click();a.remove();toast('Downloading '+filename)}catch(e){toast("Downloads aren't allowed here. Use Copy instead.")}
}

