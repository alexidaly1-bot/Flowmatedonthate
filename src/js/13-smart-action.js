// =========================================================
// SMART ACTION (Phase 2) — read the saved map, propose, preview, confirm
// The AI only ever returns a list of small structured steps (ops).
// runOps() checks every step against the real map; nothing is applied
// until the person confirms, and the whole thing is one undo step.
// =========================================================
var AI={sample:null,dict:null,ready:false,ctl:null,turns:[],state:'ask',text:'',scope:'app',res:null,chosen:-1,err:'',progress:0,listening:false,partial:''};

async function initAI(){
  if(!window.claude||typeof window.claude.use!=='function'){AI.ready=true;return}
  try{
    const [s,d]=await Promise.all([window.claude.use('sample'),window.claude.use('dictation')]);
    AI.sample=s;AI.dict=d;
    if(d){
      d.onFinal(({text})=>{AI.text=AI.text?AI.text+text:text.replace(/^\s+/,'');const t=$('#sa-in');if(t)t.value=AI.text;AI.partial='';const pv=$('#sa-partial');if(pv)pv.textContent=''});
      d.onPartial(({text})=>{AI.partial=text;const pv=$('#sa-partial');if(pv)pv.textContent=text});
      d.onState(({state,reason})=>{AI.listening=state!=='idle';const m=$('#sa-mic');if(m){m.classList.toggle('on',AI.listening);m.setAttribute('aria-pressed',AI.listening);m.setAttribute('aria-label',AI.listening?'Stop listening':'Talk instead of typing')}
        if(state==='idle'&&reason){if(reason==='unavailable'||reason==='not_granted'){AI.dict=null;if(m)m.remove()}else if(['rate_limited','upstream_error','time_limit'].includes(reason))toast(reason==='time_limit'?'Stopped listening after an hour':'The microphone stopped. Tap it to try again.')}});
    }
  }catch(e){}
  AI.ready=true;
}

const AI_ERR={not_granted:'FlowMate isn\'t allowed to use Claude. You can still edit everything by hand.',sampling_disabled:'Claude isn\'t available on this account right now. You can still edit by hand.',not_declared:'Smart Action is switched off for this page.',capability_disabled:'Smart Action isn\'t available here.',capability_removed:'Smart Action needs a newer Claude app.',rate_limited:'Too many requests just now. Wait a minute and try again.',session_expired:'You\'ve been signed out of Claude. Sign in again, then retry.',refused:'Claude couldn\'t help with that request. Try wording it differently.',empty_completion:'Claude didn\'t send anything back. Try asking for less at once.',invalid_json:'The answer came back in the wrong shape. Tap Try again.',prompt_too_large:'This project is too big to send in one go. Pick "This card" or "Its module" as the scope.',upstream_error:'Couldn\'t reach Claude. Check your connection and try again.'};

// ---------- What the AI sees ----------
function projectSnapshot(p,scope,selId){
  const q=s=>'"'+String(s??'').replace(/"/g,"'").replace(/\s*\n\s*/g,' | ')+'"';
  let ents=Object.values(p.entities);
  if(scope!=='app'&&selId&&p.entities[selId]){
    const keep=new Set([selId]);const sel=p.entities[selId];
    if(scope==='module'&&sel.moduleId)for(const e of ents)if(e.moduleId===sel.moduleId)keep.add(e.id);
    for(const c of Object.values(p.connections)){if(keep.has(c.from.entity))keep.add(c.to);if(keep.has(c.to))keep.add(c.from.entity)}
    ents=ents.filter(e=>keep.has(e.id));
  }
  const L=[`APP NAME: ${p.name}`];
  if(p.description)L.push('WHAT THE APP IS FOR: '+p.description);
  if(p.platforms&&p.platforms.length)L.push('PLATFORMS: '+p.platforms.join(', '));
  L.push('ROLES: '+(p.roles.map(r=>`${r.id}=${q(r.name)}`).join(', ')||'none'));
  L.push('MODULES: '+(Object.values(p.modules).sort((a,b)=>a.order-b.order).map(m=>`${m.id}=${q(m.name)}`).join(', ')||'none'));
  L.push('START PAGE: '+(p.startPageId||'none'));
  if(ents.length<Object.keys(p.entities).length)L.push(`(Showing ${ents.length} of ${Object.keys(p.entities).length} cards: the chosen scope and anything linked to it.)`);
  L.push('CARDS:');
  for(const e of ents){
    let s=`[${e.kind} ${e.id}] ${q(e.name)} module=${e.moduleId||'none'} status=${q(e.status)}`;
    if(e.kind==='page')s+=` pageType=${q(e.pageType)}`+(e.roles.length?` roles=${e.roles.join(',')}`:'');
    if(e.kind==='function')s+=` trigger=${q(e.trigger)} steps=${q(e.steps)}`+(e.success?` success=${q(e.success)}`:'')+(e.error?` error=${q(e.error)}`:'');
    if(e.kind==='setting')s+=` key=${e.key||'none'} valueType=${q(e.valueType)} default=${q(e.defaultValue)} scope=${q(e.scope)}`;
    if(e.kind==='data')s+=` fields=${q(e.fields)}`;
    if(e.desc)s+=` desc=${q(e.desc)}`;
    if(e.notes)s+=` notes=${q(e.notes)}`;
    L.push(s);
    if(e.kind==='page')for(const el of e.elements){const cs=outConns(p,e.id,el.id);L.push(`   element ${el.id} ${el.type} ${q(el.label)} -> `+(cs.length?cs.map(c=>`${c.to} (${c.type}${c.label?' '+q(c.label):''}, link ${c.id})`).join('; '):'nothing yet'))}
  }
  const ids=new Set(ents.map(e=>e.id));
  const cl=Object.values(p.connections).filter(c=>!c.from.element&&(ids.has(c.from.entity)||ids.has(c.to)));
  if(cl.length){L.push('CARD-TO-CARD LINKS:');for(const c of cl)L.push(`   ${c.from.entity} -> ${c.to} (${c.type}${c.label?' '+q(c.label):''}, link ${c.id})`)}
  return L.join('\n');
}
function buildPrompt(p,request,scope,sel,turns){
  const selTxt=!sel?'Nothing is selected.':sel.t==='conn'?`A link (${sel.id}) is selected.`:(()=>{const e=p.entities[sel.id];if(!e)return 'Nothing is selected.';let t=`The ${e.kind} card ${e.id} "${e.name}" is selected.`;if(sel.t==='element'){const el=findElement(p,e.id,sel.el);if(el)t+=` Inside it, the ${el.type} ${el.id} "${el.label}" is selected.`}return t})();
  const scopeTxt={app:'The whole app.',module:'The selected card\'s module, plus anything linked to it.',card:'Only the selected card (and what it links to).'}[scope];
  const earlier=turns.length?'EARLIER IN THIS SESSION (the user may refer back to these):\n'+turns.slice(-3).map(t=>`- They asked: "${t.request}". You offered: ${t.options.map(o=>'"'+o+'"').join(', ')}.${t.chosen?` They applied "${t.chosen}".`:' They did not apply any yet.'}`).join('\n')+'\n\n':'';
  return `You are the planning assistant inside FlowMate, a visual tool for designing apps. A map is made of cards (pages, functions, decisions, settings, data, components), the buttons and parts on each page, and typed links between them. You only PROPOSE changes. The user reviews every change and confirms before anything happens.

THE SAVED MAP RIGHT NOW. This is the only source of truth. Never assume something exists unless it is listed here.
<map>
${projectSnapshot(p,scope,sel&&sel.id)}
</map>

SELECTION: ${selTxt}
SCOPE THE USER CHOSE: ${scopeTxt}

${earlier}THE USER'S REQUEST (they often use speech-to-text, so expect typos and wrong words and work out what they meant):
"""${request}"""

Before proposing anything, check what already exists so you reuse pages, functions, settings and data instead of making duplicates. If the request's scope is unclear and it changes the outcome (for example one page vs the whole app), make the options cover the different scopes.

Reply with ONLY one JSON object, no other text:
{"understood":"one short plain-English sentence saying what you think they want",
 "answer":"if they asked a question, a short plain-English answer; otherwise an empty string",
 "options":[{"title":"short, e.g. Create a new page","why":"one sentence: what this option does and its trade-off","ops":[ ... ]}]}

Give 1 to 3 genuinely different options (for example: a new page, or extend an existing page, or a reusable function). If they only asked a question, "options" may be an empty list.

"ops" are steps that run in order. Allowed steps:
{"op":"addModule","ref":"m1","name":"..."}
{"op":"addRole","ref":"r1","name":"..."}
{"op":"addCard","ref":"c1","kind":"page|function|decision|setting|data|component","name":"...","module":"<module id or ref>","desc":"...","pageType":"${PAGE_TYPES.join('|')}","roles":["<role id or ref>"],"trigger":"...","steps":["..."],"success":"...","error":"...","key":"camelCaseKey","valueType":"On / off|Text|Number|Choice","defaultValue":"...","scope":"Whole app|One module|One page|One component","fields":["name: type"]}
{"op":"addElement","ref":"e1","card":"<page id or ref>","label":"...","type":"${Object.keys(EL_TYPES).join('|')}"}
{"op":"link","from":"<card id or ref>","element":"<element id or ref, only when the link starts from a button or part>","to":"<card id or ref>","type":"${Object.keys(CONN).join('|')}","label":"optional short label such as Yes, No, Success, Failed"}
{"op":"update","target":"<existing card id>","set":{"name":"...","desc":"...","status":"${STATUSES.join('|')}","pageType":"...","notes":"...","roles":["..."],"trigger":"...","steps":["..."],"success":"...","error":"...","key":"...","valueType":"...","defaultValue":"...","scope":"...","fields":["..."]}}
{"op":"updateElement","card":"<existing page id>","element":"<existing element id>","set":{"label":"...","type":"..."}}
{"op":"removeLink","id":"<existing link id>"}
{"op":"removeCard","target":"<existing card id>"}

Rules:
- "ref" values are your own short names for new things (c1, e1, m1, r1). Use the real ids shown in the map for existing things.
- Only include the fields that matter for each card kind.
- Every button that should do something needs a link. A decision needs at least two links of type "condition" with labels such as Yes and No.
- Things only one person should see: give them a role, or put "Only visible to me" in desc.
- Only remove things if the user asked for that.
- Keep names short, in plain English, with Australian spelling. New things get no status (they default to New).
- Don't add extras they didn't ask for, beyond what is needed to make the request actually work.
- When asked to plan a whole app from its description, give ONE thorough option with modules, pages, their buttons, functions, decisions, settings, data and all the links (up to about 45 cards).`;
}

// ---------- Check + apply steps ----------
function runOps(p,ops){
  const R={},lines=[],created=[];
  const str=(v,d='')=>{v=v==null?'':String(v).trim();return v||d};
  const arr=v=>Array.isArray(v)?v.map(x=>String(x)).join('\n'):str(v);
  const rid=x=>x==null?null:(R[x]!==undefined?R[x]:x);
  const ent=x=>{const i=rid(x);return i&&p.entities[i]?i:null};
  const nm=i=>`“${p.entities[i].name}”`;
  const line=(t,text)=>lines.push({t,text});
  const FIELDS={all:['name','desc','status','notes'],page:['pageType','roles'],function:['trigger','steps','success','error'],setting:['key','valueType','defaultValue','scope'],data:['fields'],decision:[],component:[]};
  const setField=(e,k,v)=>{
    if(!FIELDS.all.includes(k)&&!(FIELDS[e.kind]||[]).includes(k))throw new Error(`${KINDS[e.kind].label}s don't have “${k}”`);
    if(k==='status'){if(!STATUSES.includes(v))throw new Error(`“${v}” isn't a status`)}
    if(k==='pageType'&&!PAGE_TYPES.includes(v))v='Custom';
    if(k==='roles'){v=(Array.isArray(v)?v:[v]).map(rid).filter(r=>p.roles.some(x=>x.id===r));e.roles=v;return}
    if(k==='steps'||k==='fields'){e[k]=arr(v);return}
    if(k==='name'){v=str(v);if(!v)throw new Error('A name can\'t be blank')}
    e[k]=k==='defaultValue'?String(v??''):str(v);
  };
  for(const o of Array.isArray(ops)?ops:[]){
    try{
      if(!o||typeof o!=='object')throw new Error('A step was unreadable');
      switch(o.op){
        case 'addModule':{const n=str(o.name,'New module');const ex=Object.values(p.modules).find(m=>m.name.toLowerCase()===n.toLowerCase());if(ex){R[o.ref]=ex.id;line('same',`Uses the existing module “${ex.name}”`);break}const m=addModule(p,n);R[o.ref]=m.id;line('add',`New module “${n}”`);break}
        case 'addRole':{const n=str(o.name,'New role');const ex=p.roles.find(r=>r.name.toLowerCase()===n.toLowerCase());if(ex){R[o.ref]=ex.id;line('same',`Uses the existing role “${ex.name}”`);break}const r={id:uid('role'),name:n};p.roles.push(r);R[o.ref]=r.id;line('add',`New user role “${n}”`);break}
        case 'addCard':{
          if(!KINDS[o.kind])throw new Error(`“${o.kind}” isn't a kind of card`);
          const n=str(o.name);if(!n)throw new Error('A new card had no name');
          const dup=Object.values(p.entities).find(e=>e.kind===o.kind&&e.name.toLowerCase()===n.toLowerCase());
          if(dup){R[o.ref]=dup.id;line('same',`Reuses the existing ${KINDS[o.kind].label.toLowerCase()} ${nm(dup.id)}`);break}
          const mod=o.module&&p.modules[rid(o.module)]?rid(o.module):null;
          const e=addEntity(p,o.kind,{name:n,moduleId:mod,status:'New',desc:str(o.desc)});
          for(const k of [...FIELDS[o.kind]].filter(k=>o[k]!=null))try{setField(e,k,o[k])}catch(err){}
          if(o.kind==='page'&&!p.startPageId)p.startPageId=e.id;
          R[o.ref]=e.id;created.push(e.id);
          line('add',`New ${KINDS[o.kind].label.toLowerCase()} “${n}”${mod?' in '+p.modules[mod].name:''}`);break}
        case 'addElement':{
          const pg=ent(o.card);if(!pg||p.entities[pg].kind!=='page')throw new Error(`couldn't find the page for “${str(o.label,'a button')}”`);
          const lab=str(o.label,'New button');const ex=p.entities[pg].elements.find(x=>x.label.toLowerCase()===lab.toLowerCase());
          if(ex){R[o.ref]=ex.id;line('same',`“${lab}” is already on ${nm(pg)}`);break}
          const type=EL_TYPES[o.type]?o.type:'button';const el=addElement(p,pg,{label:lab,type});R[o.ref]=el.id;
          line('add',`New ${EL_TYPES[type].label.toLowerCase()} “${lab}” on ${nm(pg)}`);break}
        case 'link':{
          const f=ent(o.from),t=ent(o.to);if(!f||!t)throw new Error('a link pointed to something that doesn\'t exist');
          if(f===t)throw new Error('a card can\'t link to itself');
          let el=null;if(o.element){el=rid(o.element);if(!findElement(p,f,el))throw new Error(`couldn't find that button on ${nm(f)}`)}
          const type=CONN[o.type]?o.type:defaultType(p,f,t);
          if(Object.values(p.connections).some(c=>c.from.entity===f&&(c.from.element||null)===el&&c.to===t)){line('same',`${el?nm(f)+' › “'+findElement(p,f,el).label+'”':nm(f)} already links to ${nm(t)}`);break}
          addConn(p,{entity:f,element:el},t,type,str(o.label));
          line('link',`${el?`“${findElement(p,f,el).label}” on ${nm(f)}`:nm(f)} → ${nm(t)} · ${CONN[type].label}${o.label?` (“${str(o.label)}”)`:''}`);break}
        case 'update':{
          const t=ent(o.target);if(!t)throw new Error('the card to change doesn\'t exist');
          const e=p.entities[t];const before=e.name;const done=[];
          for(const[k,v] of Object.entries(o.set||{})){try{setField(e,k,v);done.push(k==='name'?`name → “${e.name}”`:k==='status'?`status → ${e.status}`:k)}catch(err){line('skip',`Skipped changing ${k} on “${before}”: ${err.message}`)}}
          if(done.length)line('edit',`Change “${before}”: ${done.join(', ')}`);break}
        case 'updateElement':{
          const pg=ent(o.card);const el=pg&&findElement(p,pg,rid(o.element));if(!el)throw new Error('the button to change doesn\'t exist');
          const before=el.label;const set=o.set||{};const done=[];
          if(set.label!=null&&str(set.label)){el.label=str(set.label);done.push(`label → “${el.label}”`)}
          if(set.type&&EL_TYPES[set.type]){el.type=set.type;done.push(`type → ${EL_TYPES[set.type].label}`)}
          if(done.length)line('edit',`Change “${before}” on ${nm(pg)}: ${done.join(', ')}`);break}
        case 'removeLink':{const c=p.connections[o.id];if(!c)throw new Error('that link doesn\'t exist');line('del',`Remove link ${p.entities[c.from.entity]?nm(c.from.entity):'?'} → ${p.entities[c.to]?nm(c.to):'?'}`);delete p.connections[c.id];break}
        case 'removeCard':{const t=ent(o.target);if(!t)throw new Error('the card to delete doesn\'t exist');const n=inConns(p,t).length+outConns(p,t).length;line('del',`Delete ${nm(t)}${n?` and its ${n} link${n===1?'':'s'}`:''}`);removeEntity(p,t);break}
        default:throw new Error(`unknown step “${o.op}”`);
      }
    }catch(err){line('skip','Skipped: '+err.message)}
  }
  return {lines,created};
}
/* Put new cards somewhere sensible: next to what links to them, or tidy the lot for a big draft. */
function placeNew(p,created,countBefore){
  if(!created.length)return;
  if(created.length>=8||countBefore<=2){autoLayout(p);return}
  const placed=new Set(Object.keys(p.entities).filter(id=>!created.includes(id)));
  const c=viewCentre();
  for(const id of created){
    const e=p.entities[id];if(!e)continue;
    const src=Object.values(p.connections).find(k=>k.to===id&&placed.has(k.from.entity))||Object.values(p.connections).find(k=>k.from.entity===id&&placed.has(k.to));
    if(src){const o=p.entities[src.to===id?src.from.entity:src.to];e.x=o.x+(src.to===id?400:-400);e.y=o.y;if(src.to===id&&src.from.element){const i=o.elements.findIndex(x=>x.id===src.from.element);if(i>0)e.y+=i*46}}
    else{e.x=c.x-134;e.y=c.y-60}
    nudgeFree(p,e);placed.add(id);
  }
}

// ---------- Panel ----------
function saSuggestions(){
  const p=S.p,s=S.sel,out=[];
  const e=s&&s.t!=='conn'?p.entities[s.id]:null;
  if(Object.keys(p.entities).length<=3&&p.description)out.push(['Draft the whole map from my app description','sparkle']);
  if(e&&e.kind==='page'){out.push([`Add what's missing to “${e.name}”`,'plus']);out.push([`Add an error path and a confirmation for “${e.name}”`,'alert'])}
  if(e&&e.kind!=='page')out.push([`Explain what “${e.name}” does in plain English`,'book']);
  if(s&&s.t==='element'){const el=findElement(p,s.id,s.el);if(el)out.push([`Make “${el.label}” work properly`,'link'])}
  if(checkProject(p).some(i=>i.sev==='problem'))out.push(["Fix the buttons that don't do anything yet",'check2']);
  out.push(["What's missing from this app?",'search']);
  return out.slice(0,5);
}
function openSmartAction(prefill){
  closeSidebar();hideDropMenu();
  const s=S.sel;AI.scope=s&&s.t!=='conn'?'card':'app';
  AI.state='ask';AI.res=null;AI.chosen=-1;AI.err='';
  if(prefill!=null)AI.text=prefill;
  $('#modal').classList.remove('hide');$('#modal').setAttribute('aria-labelledby','sa-title');
  MODAL={actions:[]};renderSA();
  setTimeout(()=>{const t=$('#sa-in');if(t&&AI.state==='ask'){t.focus();t.setSelectionRange(t.value.length,t.value.length)}},20);
}
function renderSA(){
  const m=$('#modal');if(m.classList.contains('hide'))return;
  const p=S.p,s=S.sel;const e=s&&s.t!=='conn'?p.entities[s.id]:null;
  const scopes=[['app','Whole app']];if(e){if(e.moduleId&&p.modules[e.moduleId])scopes.push(['module',`Module: ${p.modules[e.moduleId].name}`]);scopes.push(['card',`This ${KINDS[e.kind].label.toLowerCase()}: ${e.name}`])}
  if(!scopes.some(x=>x[0]===AI.scope))AI.scope='app';
  const avail=!!AI.sample;
  let b=`<div class="sa-scope" role="group" aria-label="What should this change?"><span class="flabel" style="width:100%;margin:0">Work on</span>${scopes.map(([k,l])=>`<div class="chips"><button class="${AI.scope===k?'on':''}" data-act="sa-scope" data-v="${k}" aria-pressed="${AI.scope===k}">${esc(l)}</button></div>`).join('')}</div>`;
  b+=`<div class="sa-in-wrap"><label for="sa-in" class="sr">What do you want to do?</label><textarea id="sa-in" class="inp sa-in" placeholder="e.g. Add a Running late button to the ready page" ${AI.state==='thinking'?'disabled':''}>${esc(AI.text)}</textarea>${AI.dict?`<button class="mic${AI.listening?' on':''}" id="sa-mic" data-act="sa-mic" aria-pressed="${AI.listening}" aria-label="${AI.listening?'Stop listening':'Talk instead of typing'}">${icon('mic')}</button>`:''}</div><p class="sa-partial" id="sa-partial" aria-live="polite">${esc(AI.partial)}</p>`;
  if(AI.state==='ask')b+=`<div class="sugs">${saSuggestions().map(([t,i],n)=>`<button data-act="sa-sug" data-t="${esc(t)}">${icon(i)}${esc(t)}</button>`).join('')}</div>`;
  if(!avail&&AI.ready)b+=(window.claude&&window.claude.isShim)?`<div class="sa-err">Smart Action needs an AI connection. Open FlowMate inside Claude, or add your own Anthropic key. Everything else works without it.</div><button class="btn small" data-act="ai-key">${icon('lock')}Add your Anthropic key</button>`:`<div class="sa-err">Smart Action needs FlowMate to be open inside Claude (the app or claude.ai), so it can ask Claude for you. Everything else works here.</div>`;
  if(avail&&AI.ready&&window.claude&&window.claude.isShim)b+=`<p class="help">Using your Anthropic key. <button class="btn small ghost" data-act="ai-key">AI key</button></p>`;
  if(AI.state==='thinking')b+=`<div class="sa-think" role="status"><span class="spinner" aria-hidden="true"></span><span style="flex:1">${AI.progress?`Writing the plan… <small class="help">${Math.round(AI.progress/100)/10}k characters</small>`:'Reading your map and thinking… this can take up to a minute.'}</span><button class="btn small" data-act="sa-stop">Stop</button></div>`;
  if(AI.err)b+=`<div class="sa-err">${esc(AI.err)}</div>`;
  if(AI.state==='result'&&AI.res){
    const r=AI.res;
    if(r.understood)b+=`<div class="plain" style="margin-top:14px"><b>I think you want:</b> ${esc(r.understood)}</div>`;
    if(r.answer)b+=`<div class="plain" style="margin-top:10px;background:var(--card);border:1.5px solid var(--line)">${esc(r.answer).replace(/\n/g,'<br>')}</div>`;
    if(r.options.length){
      b+=`<div class="sec-h" style="margin-top:18px">Pick one <span class="count">${r.options.length} option${r.options.length===1?'':'s'}</span></div>`;
      b+=r.options.map((o,i)=>{const pv=o.preview;const real=pv.lines.filter(l=>l.t!=='same'&&l.t!=='skip').length;const shown=pv.lines.slice(0,i===AI.chosen?400:6);
        return `<label class="saopt${i===AI.chosen?' on':''}"><span class="top"><input type="radio" name="sa-opt" value="${i}" ${i===AI.chosen?'checked':''}><span><b>${esc(o.title)}</b><span class="why">${esc(o.why)}</span><span class="why">${real} change${real===1?'':'s'}${pv.lines.some(l=>l.t==='skip')?` · <span style="color:var(--bad)">${pv.lines.filter(l=>l.t==='skip').length} skipped</span>`:''}</span></span></span>
        <ul class="oplines">${shown.map(l=>`<li class="t-${l.t}">${icon({add:'plus',link:'link',edit:'pen',del:'trash',skip:'alert',same:'check'}[l.t])}<span>${esc(l.text)}</span></li>`).join('')}${pv.lines.length>shown.length?`<li class="t-same">${icon('list')}<span>…and ${pv.lines.length-shown.length} more. Pick this option to see them all.</span></li>`:''}</ul></label>`}).join('');
      b+=`<p class="sa-note">${icon('info')} Nothing has changed yet. Confirm applies the option you pick as one step you can undo.</p>`;
      if(AI.stale)b+=`<div class="sa-err">The map changed since these options were made. I re-checked them against the current map. Look over the list, then confirm again.</div>`;
    }else if(!r.answer)b+=`<div class="sa-err">No options came back. Try saying it a different way.</div>`;
  }
  const foot=AI.state==='result'?`<button class="btn" data-act="modal-close">Cancel</button><button class="btn" data-act="sa-go" data-again="1">${icon('undo')}Try again</button><button class="btn primary" data-act="sa-apply" ${AI.chosen<0?'disabled':''}>${icon('check')}Confirm &amp; create</button>`
    :`<button class="btn" data-act="modal-close">Cancel</button><button class="btn primary" data-act="sa-go" ${AI.state==='thinking'||!avail?'disabled':''}>${icon('sparkle')}Get options</button>`;
  m.innerHTML=`<div class="mbox wide"><div class="mhead"><span class="tile" style="background:color-mix(in srgb,var(--gold) 30%,var(--card));color:var(--on-gold)">${icon('sparkle')}</span><div><h2 id="sa-title">Smart Action</h2><p>Create, connect or change your map. Type it or say it.</p></div><button class="btn icon ghost x" data-act="modal-close" aria-label="Close">${icon('x')}</button></div><div class="mbody" id="sa-body">${b}</div><div class="mfoot">${foot}</div></div>`;
  const ta=$('#sa-in');if(ta){ta.addEventListener('input',()=>{AI.text=ta.value});ta.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&(ev.ctrlKey||ev.metaKey)){ev.preventDefault();ACT['sa-go']({})}})}
  m.querySelectorAll('input[name=sa-opt]').forEach(r=>r.addEventListener('change',()=>{AI.chosen=+r.value;const sc=$('#sa-body').scrollTop;renderSA();$('#sa-body').scrollTop=sc}));
}
function normaliseResult(raw){
  const r={understood:'',answer:'',options:[]};
  if(!raw||typeof raw!=='object')return r;
  r.understood=typeof raw.understood==='string'?raw.understood:'';
  r.answer=typeof raw.answer==='string'?raw.answer:'';
  r.options=(Array.isArray(raw.options)?raw.options:[]).slice(0,3).filter(o=>o&&typeof o==='object').map(o=>({title:String(o.title||'Option'),why:String(o.why||''),ops:Array.isArray(o.ops)?o.ops:[]}));
  return r;
}
function previewAll(){for(const o of AI.res.options)o.preview=runOps(clone(S.p),o.ops);AI.rev=S.p.rev}
function saAsk(){}
function saApply(){
  const o=AI.res&&AI.res.options[AI.chosen];if(!o)return;
  if(S.p.rev!==AI.rev){const before=o.preview.lines.filter(l=>l.t==='skip').length;previewAll();if(o.preview.lines.filter(l=>l.t==='skip').length>before){AI.stale=true;renderSA();return}}
  const countBefore=Object.keys(S.p.entities).length;const req=(AI.text||'').trim();
  const r=commit('Smart Action: '+o.title,p=>{
    const r=runOps(p,o.ops);placeNew(p,r.created,countBefore);
    const changes=r.lines.filter(l=>l.t!=='same'&&l.t!=='skip').length;
    p.aiLog=(p.aiLog||[]).concat([{id:uid('ai'),at:Date.now(),request:req,scope:AI.scope,options:AI.res.options.map(x=>x.title),chosen:o.title,changes,state:'applied'}]).slice(-50);
    return Object.assign(r,{changes});
  });
  if(!r)return;
  const t=AI.turns[AI.turns.length-1];if(t)t.chosen=o.title;
  AI.text='';AI.res=null;AI.chosen=-1;closeModal();
  toast(`Done: ${r.changes} change${r.changes===1?'':'s'}`,{label:'Undo',run:undo});
  if(r.created.length){requestAnimationFrame(()=>{rememberView();fitTo(bounds(r.created.filter(id=>S.geo[id]).concat(r.created.length>=8?Object.keys(S.geo):[])),1);if(r.created.length===1)select({t:'entity',id:r.created[0]})})}
}
Object.assign(ACT,{
  'sa-open':()=>openSmartAction(),
  'sa-scope':d=>{AI.scope=d.v;renderSA()},
  'sa-sug':d=>{AI.text=d.t;renderSA();saAsk()},
  'sa-go':()=>saAsk(),
  'sa-stop':()=>{AI.ctl&&AI.ctl.abort()},
  'sa-apply':()=>saApply(),
  'sa-mic':()=>{const d=AI.dict;if(!d)return;
    if(AI.listening){d.stop().catch(()=>{});return}
    d.start().catch(e=>{if(!e)return;if(e.code==='not_granted'||e.code==='unavailable'){AI.dict=null;$('#sa-mic')?.remove();toast(e.code==='not_granted'?'Microphone not allowed. You can still type.':'Talking isn\'t available here. You can still type.')}else if(e.code==='rate_limited')toast('The microphone is busy. Try again in a moment.');else if(e.code!=='stopped'&&e.code!=='dismissed')toast('The microphone didn\'t start. Try again.')})},
});

