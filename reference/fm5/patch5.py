import re
P='/home/claude/flowmate/index.html'
s=open('/home/claude/flowmate/index.v4.html').read()
def rep(old,new,count=1):
    global s
    n=s.count(old)
    assert n==count,(n,old[:100])
    s=s.replace(old,new)
mods=''.join(open('/home/claude/fm5/'+f).read() for f in ['core.js','colours.js','insights.js','pro.js','prod.js'])
extra_core='''
function cardBadges(p,e){const n=(p.comments||[]).filter(c=>!c.resolved&&c.ref&&c.ref.id===e.id).length;return (e.unverified?'<span class="cbadge uv" title="Made from a screenshot. Check it.">Unverified</span>':'')+(n?`<span class="cbadge cm" title="${n} open comment${n===1?'':'s'}">💬 ${n}</span>`:'')}
Object.assign(ACT,{unverify:()=>commit('Mark as checked',p=>{p.entities[S.sel.id].unverified=false}),
  walkthrough:()=>walkthroughModal(),'export2':()=>export2Modal()});
'''
mods+=extra_core
anchor="\n// ---------- Theme ----------\nfunction applyPrefs(){\n  const r=FMT.apply"
assert s.count(anchor)==1
s=s.replace(anchor,'\n'+mods+anchor)

# --- Navigation: real panels instead of "Soon" ---
rep("const NAV=[['canvas','Canvas','flow'],['pages','Pages','grid'],['functions','Functions','bolt'],['components','Components','layers'],['data','Data & settings','database'],['roles','User roles','users'],['ai','AI Assistant','sparkle'],['check','Check','check2'],['history','History','history'],['settings','Settings','gear'],['words','Plain English','book']];",
    "const NAV=[['canvas','Canvas','flow'],['find','Find','search'],['pages','Pages','grid'],['functions','Functions','bolt'],['components','Components','layers'],['data','Data & settings','database'],['roles','User roles','users'],['colours','Colours','palette'],['assets','Assets','image'],['ai','AI Assistant','sparkle'],['check','Check','check2'],['testing','Testing','flask'],['progress','Progress','star'],['docs','Docs','file'],['team','Team','chat'],['history','History & versions','history'],['settings','Settings','gear'],['words','Plain English','book']];")
rep("const SOON=[['colours','Colours','palette'],['testing','Testing','flask'],['assets','Assets','folder']];","const SOON=[];")
rep("""  h+=`<div class="nav-sep"></div><div class="nav-label">Coming next</div>`;
  for(const[k,l,i] of SOON)h+=`<button class="nav soon" data-act="panel" data-p="soon-${k}">${icon(i)}<span>${l}</span><span class="tag">Soon</span></button>`;""",
    """  h+=`<button class="nav mob-only" data-act="walkthrough">${icon('play')}<span>Walk me through it</span></button><button class="nav mob-only" data-act="present">${icon('eye')}<span>Present</span></button>`;""")
# --- Panels ---
rep("""  else if(k.startsWith('soon-'))h=""","""  else if(k==='find')h=head('Find','search','Ask in plain English, or filter')+findHTML(p);
  else if(k==='colours')h=head('Colours','palette','Colour schemes for the app you are planning')+coloursHTML(p);
  else if(k==='assets')h=head('Assets','image','Files that belong to this project')+assetsHTML(p);
  else if(k==='testing')h=head('Testing','flask','Saved journeys you can run again')+testsHTML(p);
  else if(k==='progress')h=head('Progress','star','How far along the plan is')+progressHTML(p);
  else if(k==='docs')h=head('Docs','file','Documentation that keeps itself up to date')+docsHTML(p);
  else if(k==='team')h=head('Team','chat','Share, comment and review')+teamHTML(p);
  else if(k.startsWith('soon-'))h=""")
s=re.sub(r"  else if\(k==='check'\)\{const iss=checkProject\(p\);.*?\n(?=  else if)",lambda m:"  else if(k==='check')h=head('Check','check2','Problems, gaps and things to look at')+healthHTML(p);\n",s,count=1,flags=re.S)
rep("""<p class="help">History covers this visit. Saved versions and snapshots come in Phase 4.</p>`+pathsHTML();""","""<p class="help">Undo history covers this visit. Saved versions below are kept.</p>`+versionsHTML(p)+pathsHTML();""")
# Settings: canvas tools and project statuses
rep("""<div class="mod-h">Canvas</div><div class="field"><span class="flabel">Link lines</span>""","""<div class="mod-h">How FlowMate helps</div><div class="field"><span class="flabel">Mode</span>${seg('guide',[['guided','Guided: tips and hints'],['direct','Direct: no hints']])}</div><div class="mod-h">Canvas</div><div class="field"><span class="flabel">Snap cards to a grid</span>${seg('snap',[[false,'Off'],[true,'On']])}</div><div class="field"><label for="cst">This project's extra statuses (comma between)</label><input id="cst" class="inp" data-pscope="customStatusText" value="${esc((p.customStatuses||[]).join(', '))}" placeholder="e.g. Needs copy, Waiting on client"></div><div class="field"><span class="flabel">Link lines</span>""")
rep("""<b>Delete</b><span>Delete selected</span><b>Esc</b><span>Close / clear</span>""","""<b>Delete</b><span>Delete selected</span><b>Shift+click</b><span>Select several cards</span><b>Shift+drag</b><span>Box select</span><b>Ctrl+C / Ctrl+V</b><span>Copy / paste cards</span><b>Ctrl+A</b><span>Select all</span><b>Esc</b><span>Close / clear</span>""")
rep("pref:d=>{let v=d.v;if(d.k==='textSize')v=+v;if(d.k==='contrast')v=v==='true';","pref:d=>{let v=d.v;if(d.k==='textSize')v=+v;if(d.k==='contrast'||d.k==='snap')v=v==='true';")
# --- Editor ---
rep("""${STATUSES.map(st=>`<button class="${e.status===st?'on':''}" data-act="status\"""","""${allStatuses(p).map(st=>`<button class="${e.status===st?'on':''}" data-act="status\"""")
old_set=s[s.index("""    b+=`<div class="field"><label for="f-dv">Default value</label>"""):s.index("""  if(e.kind==='data')b+=`<div class="field"><label for="f-fields">""")]
s=s.replace(old_set,"  }\n")
rep("""  b+=`<div class="field"><label for="f-mod">Module</label>""","""  b+=editorExtraHTML(p,e);
  b+=`<div class="field"><label for="f-mod">Module</label>""")
rep("""<button class="btn small" data-act="dup-entity">${icon('copy')}Duplicate</button>""","""<button class="btn small" data-act="passport">${icon('file')}Feature Passport</button>${e.kind==='setting'?`<button class="btn small" data-act="rule-sim">${icon('sliders')}Simulate a change</button>`:''}<button class="btn small" data-act="dup-entity">${icon('copy')}Duplicate</button>""")
rep("""  b+=`<div class="plain" style="margin-top:16px"><b>${K.label}:</b> ${esc(K.plain)}</div>`;""","""  {const refs=(p.assets||[]).filter(a=>a.refs.includes(e.id));if(refs.length)b+=`<div class="sec-h">Reference files <span class="count">${refs.length}</span></div><div class="as-mini">${refs.map(a=>/^image\\//.test(a.type)&&assetSrc(a)?`<img src="${esc(assetSrc(a))}" alt="${esc(a.name)}">`:`<span class="chip">${esc(a.name)}</span>`).join('')}</div>`}
  b+=editorCommentsHTML(p,s.t==='element'?{t:'element',id:e.id,el:s.el}:{t:'entity',id:e.id});
  if(e.unverified)b=`<div class="plain uvb"><b>Unverified.</b> Made from a screenshot by suggestion. Check the parts and links, then <button class="btn small" data-act="unverify">Mark as checked</button></div>`+b;
  b+=`<div class="plain" style="margin-top:16px"><b>${K.label}:</b> ${esc(K.plain)}</div>`;""")
rep("""  $('.ed-body',ed).scrollTop=scrollTop;""","""  $('.ed-body',ed).scrollTop=scrollTop;fillCommentNames();""")
# --- Cards: badges, custom statuses ---
rep("""<span class="chip ${stClass(e.status)}">${esc(e.status)}</span><span class="po""","""${cardBadges(p,e)}<span class="chip ${stClass(e.status)}">${esc(e.status)}</span><span class="po""")
rep("const stClass=s=>'st-'+(s||'Idea').toLowerCase().replace(/\\s+/g,'-');","const stClass=s=>(STATUSES.includes(s||'Idea')?'':'st-custom ')+'st-'+(s||'Idea').toLowerCase().replace(/\\s+/g,'-');")
# --- Settings inheritance in Play and Screens ---
rep("if(c){const set=p.entities[c.to];return isOnVal(sim&&sim.settings[set.id]!=null?sim.settings[set.id]:set.defaultValue)}","if(c){const set=p.entities[c.to];return isOnVal(sim&&sim.settings[set.id]!=null?sim.settings[set.id]:(effectiveSetting(p,set,e.id,typeof PL!=='undefined'&&PL.open?PL.role:null)??set.defaultValue))}")
rep("function flipSetting(set){const st=plCur();const v=st.sim.settings[set.id]!=null?st.sim.settings[set.id]:set.defaultValue;","function flipSetting(set){const st=plCur();const v=st.sim.settings[set.id]!=null?st.sim.settings[set.id]:(effectiveSetting(S.p,set,st.page,PL.role)??set.defaultValue);")
rep("if(set){const v=plCur().sim.settings[set.id]!=null?plCur().sim.settings[set.id]:set.defaultValue;","if(set){const v=plCur().sim.settings[set.id]!=null?plCur().sim.settings[set.id]:(effectiveSetting(p,set,plCur().page,PL.role)??set.defaultValue);")
rep("""  return `<div class="scr${sheet?' sheet':''}" style="${lookStyle(p.look,o.modeOverride)};${size}">""","""  return `<div class="scr${sheet?' sheet':''}" style="${lookStyle(lookFor(p,e.id,o.mode==='play'&&typeof PL!=='undefined'?PL.role:null),o.modeOverride)};${size}">""")
rep("""  const L=Object.assign({},LOOK_DEF,look||{});const m=mode||L.mode;const key=JSON.stringify(L)+m;
  if(lookCache.has(key))return lookCache.get(key);""","""  const L=Object.assign({},LOOK_DEF,look||{});const m=mode||L.mode;const key=JSON.stringify(L)+m;
  if(lookCache.has(key))return lookCache.get(key);
  if(L.palette&&L.palette[m]){const P=L.palette[m];const rr={round:22,soft:12,square:4}[L.corners]??22;const st=`--ap:${P.primary};--ap-ink:${P.onPrimary};--ap-link:${P.link};--ap-bg:${P.background};--ap-surface:${P.surface};--ap-text:${P.text};--ap-line:${P.border};--ap-r:${rr}px;--ap-fs:${(+L.text||100)/100}`;lookCache.set(key,st);return st}""")
# --- Play: remember the role on saved paths ---
rep("steps:PL.steps.map(s=>({page:s.page,kind:s.kind,via:s.via,el:s.el,choice:s.choice,modal:s.modal,sim:s.sim}))}])","role:PL.role||null,expect:'',steps:PL.steps.map(s=>({page:s.page,kind:s.kind,via:s.via,el:s.el,choice:s.choice,modal:s.modal,sim:s.sim}))}])")
# --- Downloads: binary files, allowed extensions ---
rep("""  try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'text/plain'}));""","""  try{const a=document.createElement('a');a.href=URL.createObjectURL(data instanceof Blob?data:new Blob([data],{type:'text/plain'}));""")
rep("""async function download(filename,data){
  try{""","""async function download(filename,data){
  if(!/\\.(gif|png|jpe?g|webp|mp4|webm|txt|json|md|docx|pptx|epub|csv|ttf|html|svg|pdf|xlsx|zip)$/i.test(filename))filename+='.txt';
  try{""")
rep("const fname=()=>`${p.name.replace(/[^\\w-]+/g,'-').toLowerCase()}-flowmate.${fmt==='json'?'json':fmt==='mermaid'?'mmd':'csv'}`;","const fname=()=>`${p.name.replace(/[^\\w-]+/g,'-').toLowerCase()}-flowmate.${fmt==='json'?'json':fmt==='mermaid'?'md':'csv'}`;")
rep("details:()=>{closeSidebar();detailsModal()},export:()=>exportModal(),","details:()=>{closeSidebar();detailsModal()},export:()=>export2Modal(),")
rep("upd();m.addEventListener('change',ev=>{if(ev.target.name==='ex')","upd();m.firstElementChild.addEventListener('change',ev=>{if(ev.target.name==='ex')")
# --- Toolbar: walkthrough + present ---
rep("""h+=`<button class="btn small ghost desk-only" data-act="web" title="Page web">${icon('trace')}Web</button>""","""h+=`<button class="btn small ghost desk-only" data-act="walkthrough" title="Walk me through a journey">${icon('mic')}Walk through</button><button class="btn small ghost desk-only" data-act="present" title="Present the map">${icon('eye')}Present</button><button class="btn small ghost desk-only" data-act="web" title="Page web">${icon('trace')}Web</button>""")
# --- New project templates ---
rep("""   <label class="opt"><input type="radio" name="w-start" value="example"><span><b>The LandlordMate example</b><small>A full worked example you can change and learn from.</small></span></label></div>`,""","""   <label class="opt"><input type="radio" name="w-start" value="example"><span><b>The LandlordMate example</b><small>A full worked example you can change and learn from.</small></span></label>
   <label class="opt"><input type="radio" name="w-start" value="tpl-booking"><span><b>Booking app template</b><small>Browse, pick a time, pay, confirmation, my bookings.</small></span></label>
   <label class="opt"><input type="radio" name="w-start" value="tpl-shop"><span><b>Shop template</b><small>Products, cart, checkout, orders.</small></span></label>
   <label class="opt"><input type="radio" name="w-start" value="tpl-social"><span><b>Community app template</b><small>Feed, posts, messages, profile.</small></span></label>
   <label class="opt"><input type="radio" name="w-start" value="ai"><span><b>Describe it and let Claude draft it</b><small>Starts with Home, then Smart Action proposes the first pages for you to check.</small></span></label></div>`,""")
rep("""     const name=$('#w-name').value.trim();const ex=$('input[name=w-start]:checked').value==='example';
     if(!name&&!ex){""","""     const name=$('#w-name').value.trim();const startV=$('input[name=w-start]:checked').value;const ex=startV==='example'||startV.startsWith('tpl-');
     if(!name&&!ex){""")
rep("""     const p=ex?seedLandlord():blankProject({name,description:$('#w-desc').value.trim(),platforms});
     if(ex&&name)p.name=name;""","""     const desc=$('#w-desc').value.trim();
     const p=startV.startsWith('tpl-')?buildTemplate(startV.slice(4),name,desc,platforms):ex?seedLandlord():blankProject({name,description:desc,platforms});
     if(ex&&name)p.name=name;if(startV==='ai')setTimeout(()=>openSmartAction(`Draft the first version of this app: ${name}${desc?'. '+desc:''}. Add the main pages, the buttons on each, and how they link.`),400);""")

a=s.index('function roadmapHTML(){return `');b=s.index('`}',a)+2
s=s[:a]+"""function roadmapHTML(){return `<div class="mod-h">What FlowMate does (all five phases)</div><ul class="roadmap help"><li><b>Map:</b> pages, buttons, functions, decisions, settings, data and components, with typed links, modules, branches and zoom levels</li><li><b>Smart Action:</b> type or talk; it previews every change and waits for you</li><li><b>Settings:</b> app, module, page and component scope, overrides, and Play uses the right value</li><li><b>Change Radius:</b> see what a change reaches before you make it</li><li><b>Colours:</b> palettes from photos, HEX or words, contrast and colour-blind checks, apply to the app, a module, a page or a role</li><li><b>Live Preview:</b> Blocks, Screens and Play, role preview, page web</li><li><b>Testing:</b> saved journeys you can run again, rule-change simulation</li><li><b>Check:</b> problems, missing journeys, consistency, contradictions, design debt, forgotten features, accessibility</li><li><b>Progress:</b> acceptance checks, dashboard and a checklist made from the map</li><li><b>Feature Passports, living docs, data journeys, voice walkthrough</b></li><li><b>Versions and design branches:</b> save, compare, restore, merge</li><li><b>Export:</b> PNG, JPEG, SVG, PDF, JSON, YAML, Mermaid, CSV, developer handoff ZIP, view-only web page</li><li><b>Team:</b> share live, see who's here, comments, @mentions and review requests</li><li><b>Assets:</b> files with the project; screenshots turn into pages for you to check</li><li><b>Canvas tools:</b> multi-select, align, copy/paste, snap to grid, presentation mode, smart search, templates</li><li><b>Appearance:</b> 5 themes, light and dark, text size, contrast, guided or direct mode</li></ul><div class="mod-h">Limits</div><ul class="roadmap help"><li>Live sharing and file storage work when FlowMate is open inside Claude. Who can open it is set with Claude's Share button.</li><li>FlowMate plans apps. It doesn't publish them or write the final code.</li></ul>`}"""+s[b:]

# --- Boot: team features ---
rep("  initCloud();initAI();\n}","  initCloud();initAI();initTeam().then(()=>{if(S.panel==='team')loadShared().then(()=>rerenderPanelKeep())});assetsCap();\n}")
rep("window.FM={applyPrefs,","window.FM={suggestedAnswer,decisionsFrom,condAnswers,paletteToLook,setScopeLook,openProject,openSmartAction,healthHTML,teamHTML,PAGE_TYPES,STATUSES,radiusShow:showRadius,normalizeProject,effectiveSetting,impactOf,impactSummary,settingRefs,radiusConfirm,makePalette,paletteChecks,extractColours,CL,COL,lookFor,runScenario,runAllScenarios,analyse,progressOf,genTasks,passportData,logicViews,docsFor,dataJourneyModal,findStart,walkSteps,WT,versionsOf,snapshotVersion,diffProjects,metricsOf,exportSVG,makeZip,makePDF,handoffFiles,toYAML,viewOnlyHTML,rasterise,Team,commentsFor,smartSearch,buildTemplate,copyCards,pasteCards,alignMulti,toggleMulti,startPresent,endPresent,storeFiles,screenshotFlow,applyPrefs,")
en=s.index('</style>',s.index('<style>'))
s=s[:en]+open('/home/claude/fm5/fm5.css').read()+s[en:]
open(P,'w').write(s)
print('ok',len(s))
