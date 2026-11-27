// =========================================================
// EDITOR
// =========================================================
const opt=(v,cur,l)=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(l??v)}</option>`;
function targetOptions(p,cur,excludeId){
  let h=`<option value="">— Nothing yet —</option><optgroup label="Make something new">`+['page','function','decision','setting','data'].map(k=>`<option value="new:${k}">＋ New ${KINDS[k].label.toLowerCase()}…</option>`).join('')+'</optgroup>';
  for(const k of ['page','function','decision','setting','data','component']){const list=Object.values(p.entities).filter(e=>e.kind===k&&e.id!==excludeId).sort((a,b)=>a.name.localeCompare(b.name));if(list.length)h+=`<optgroup label="${KINDS[k].label}s">`+list.map(e=>opt(e.id,cur,e.name)).join('')+'</optgroup>'}
  return h;
}
const typeOptions=cur=>Object.entries(CONN).map(([k,v])=>opt(k,cur,v.label)).join('');
function connRow(p,c,dir){
  const other=dir==='out'?c.to:c.from.entity;
  const fromLbl=c.from.element?(findElement(p,c.from.entity,c.from.element)?.label||'(removed)'):'Whole card';
  return `<div class="connrow" data-cid="${c.id}"><div class="top"><span class="swatch" style="background:var(${CONN[c.type]?.col||'--e-nav'})"></span><b>${dir==='out'?esc(fromLbl)+' → '+esc(entityLabel(p,other)):esc(connFromLabel(p,c))+' → here'}</b><button class="mini" data-act="sel-conn" data-id="${c.id}" aria-label="Open this link">${icon('pen')}</button>${dir==='out'?`<button class="mini" data-act="conn-del" data-id="${c.id}" aria-label="Remove this link">${icon('trash')}</button>`:''}</div>
  ${dir==='out'?`<div class="r"><label class="sr" for="ct-${c.id}">Link type</label><select class="inp" id="ct-${c.id}" data-act-change="conn-type" data-id="${c.id}">${typeOptions(c.type)}</select><label class="sr" for="cl-${c.id}">Label</label><input class="inp" id="cl-${c.id}" placeholder="Label (e.g. Yes)" value="${esc(c.label)}" data-f="label" data-scope="conn" data-id="${c.id}"></div>`:''}</div>`;
}
function renderEditor(){
  const ed=$('#editor');const p=S.p;const s=S.sel;
  if(!p||!s){ed.classList.add('hide');ed.innerHTML='';return}
  ed.classList.remove('hide');ed.classList.toggle('tall',S.sheetTall);
  const selKey=s.t+':'+s.id;const scrollTop=ed._key===selKey?($('.ed-body',ed)?.scrollTop||0):0;ed._key=selKey;
  if(s.t==='conn')return renderConnEditor(ed,p,p.connections[s.id]);
  const e=p.entities[s.id];if(!e){S.sel=null;return renderEditor()}
  const K=KINDS[e.kind];const F=(f,scope='entity',extra='')=>`data-f="${f}" data-scope="${scope}" data-id="${e.id}" ${extra}`;
  let b='';
  b+=`<div class="field"><label for="f-name">${K.label} name</label><input id="f-name" class="inp big" value="${esc(e.name)}" ${F('name')}></div>`;
  b+=`<div class="field"><span class="flabel" id="st-l">Status</span><div class="chips" role="group" aria-labelledby="st-l">${allStatuses(p).map(st=>`<button class="${e.status===st?'on':''}" data-act="status" data-v="${st}" aria-pressed="${e.status===st}">${st}</button>`).join('')}</div></div>`;
  if(e.kind==='page'){
    b+=`<div class="sec-h">Buttons and parts <span class="count">${e.elements.length}</span></div><p class="help" style="margin-top:-4px">Each button can lead to a page, run a function, or change a setting.</p>`;
    b+=e.elements.map((el,i)=>{const cs=outConns(p,e.id,el.id);const first=cs[0];return `<div class="elrow${s.t==='element'&&s.el===el.id?' sel':''}" data-elid="${el.id}">
      <div class="r1">${icon(autoIcon(el.label,EL_TYPES[el.type]?.icon))}<label class="sr" for="el-l-${el.id}">Label</label><input class="inp" id="el-l-${el.id}" value="${esc(el.label)}" data-f="label" data-scope="element" data-id="${e.id}" data-el="${el.id}">
      <button class="mini" data-act="el-up" data-el="${el.id}" aria-label="Move up" ${i===0?'disabled':''}>${icon('chevup')}</button><button class="mini" data-act="el-down" data-el="${el.id}" aria-label="Move down" ${i===e.elements.length-1?'disabled':''}>${icon('chevdown')}</button><button class="mini" data-act="el-del" data-el="${el.id}" aria-label="Remove ${esc(el.label)}">${icon('trash')}</button></div>
      <div class="r2"><label class="sr" for="el-t-${el.id}">Kind of part</label><select class="inp" id="el-t-${el.id}" data-act-change="el-type" data-el="${el.id}">${Object.entries(EL_TYPES).map(([k,v])=>opt(k,el.type,v.label)).join('')}</select>
      <label class="sr" for="el-g-${el.id}">Goes to</label><select class="inp" id="el-g-${el.id}" data-act-change="el-target" data-el="${el.id}" ${first?`data-cid="${first.id}"`:''}>${targetOptions(p,first?first.to:'',e.id)}</select></div>
      ${cs.length>1?`<p class="help">Also links to: ${cs.slice(1).map(c=>esc(entityLabel(p,c.to))).join(', ')}</p>`:''}
      ${EL_TYPES[el.type]?.act&&!cs.length?`<p class="help" style="color:var(--bad)">Doesn't do anything yet. Pick where it goes.</p>`:''}</div>`}).join('');
    b+=`<button class="btn" style="width:100%" data-act="add-el">${icon('plus')}Add button or part</button>`;
    b+=`<div class="field"><label for="f-pt">Page type</label><select id="f-pt" class="inp" ${F('pageType')}>${PAGE_TYPES.map(t=>opt(t,e.pageType)).join('')}</select></div>`;
    b+=`<div class="field"><span class="flabel">Card view</span><div class="chips"><button class="${e.view!=='screen'?'on':''}" data-act="card-view" data-v="structure">Structure</button><button class="${e.view==='screen'?'on':''}" data-act="card-view" data-v="screen">Screen</button></div><p class="help">Structure lists every button. Screen shows a small sketch of the layout. Both use the same saved page.</p></div>`;
    b+=`<div class="field"><span class="flabel">Who can see this page</span><div class="chips">${p.roles.map(r=>`<button class="${e.roles.includes(r.id)?'on':''}" data-act="role" data-v="${r.id}">${esc(r.name)}</button>`).join('')}</div><p class="help">None picked means everyone.</p></div>`;
    b+=`<div class="field"><label><input type="checkbox" data-act-change="start" ${p.startPageId===e.id?'checked':''}> This is the first page people see</label></div>`;
  }
  if(e.kind==='function'){
    b+=`<div class="field"><label for="f-tr">What starts it</label><input id="f-tr" class="inp" value="${esc(e.trigger)}" placeholder="e.g. Tapping Save" ${F('trigger')}></div>`;
    b+=`<div class="field"><label for="f-steps">Steps (one per line)</label><textarea id="f-steps" class="inp" ${F('steps')}>${esc(e.steps)}</textarea></div>`;
    b+=`<div class="field"><label for="f-ok">When it works</label><input id="f-ok" class="inp" value="${esc(e.success)}" ${F('success')}></div>`;
    b+=`<div class="field"><label for="f-err">When it fails</label><input id="f-err" class="inp" value="${esc(e.error)}" ${F('error')}></div>`;
  }
  if(e.kind==='decision')b+=`<div class="plain">Add an answer for each outcome, like <b>Yes</b> and <b>No</b>. Each answer is a link with a label.</div><div class="row-btns" style="margin-top:10px"><button class="btn small" data-act="dec-answer" data-v="Yes">${icon('plus')}Yes path</button><button class="btn small" data-act="dec-answer" data-v="No">${icon('plus')}No path</button></div>`;
  if(e.kind==='setting'){
    b+=`<div class="field"><label for="f-key">Key (name in code)</label><input id="f-key" class="inp" value="${esc(e.key)}" placeholder="e.g. allowTenantMessaging" ${F('key')}></div>`;
    b+=`<div class="field"><label for="f-vt">Kind of value</label><select id="f-vt" class="inp" ${F('valueType')}>${['On / off','Text','Number','Choice'].map(t=>opt(t,e.valueType)).join('')}</select></div>`;
  }
  if(e.kind==='data')b+=`<div class="field"><label for="f-fields">Fields (one per line, e.g. <i>rent: money</i>)</label><textarea id="f-fields" class="inp" ${F('fields')}>${esc(e.fields)}</textarea></div>`;
  b+=editorExtraHTML(p,e);
  b+=`<div class="field"><label for="f-mod">Module</label><select id="f-mod" class="inp" data-act-change="module">${opt('',e.moduleId||'','No module')}${Object.values(p.modules).sort((a,b)=>a.order-b.order).map(m=>opt(m.id,e.moduleId,m.name)).join('')}<option value="__new">＋ New module…</option></select></div>`;
  b+=`<div class="field"><label for="f-desc">Description</label><textarea id="f-desc" class="inp" placeholder="What is this for?" ${F('desc')}>${esc(e.desc)}</textarea></div>`;
  b+=`<div class="field"><label for="f-notes">Notes for the builder</label><textarea id="f-notes" class="inp" placeholder="Design ideas, rules, things to remember" ${F('notes')}>${esc(e.notes)}</textarea></div>`;
  const outs=outConns(p,e.id).filter(c=>!c.from.element||e.kind!=='page'),ins=inConns(p,e.id);
  b+=`<div class="sec-h">${e.kind==='page'?'Card links':'Links out'} <span class="count">${outs.length}</span></div>`+(outs.map(c=>connRow(p,c,'out')).join('')||'<p class="help">Drag the dot on the right of the card onto another card to link it.</p>');
  if(e.kind!=='page')b+=`<button class="btn small" data-act="link-new">${icon('plus')}Link to something new</button>`;
  b+=`<div class="sec-h">Links in <span class="count">${ins.length}</span></div>`+(ins.map(c=>connRow(p,c,'in')).join('')||'<p class="help">Nothing links here yet.</p>');
  b+=`<div class="sec-h">Tools</div><div class="row-btns"><button class="btn small gold" data-act="sa-open">${icon('sparkle')}Smart Action on this</button><button class="btn small" data-act="trace" data-v="fwd">${icon('trace')}What happens next</button><button class="btn small" data-act="trace" data-v="back">${icon('back')}What leads here</button><button class="btn small" data-act="passport">${icon('file')}Feature Passport</button>${e.kind==='setting'?`<button class="btn small" data-act="rule-sim">${icon('sliders')}Simulate a change</button>`:''}<button class="btn small" data-act="dup-entity">${icon('copy')}Duplicate</button><button class="btn small danger" data-act="del-entity">${icon('trash')}Delete</button></div>`;
  {const refs=(p.assets||[]).filter(a=>a.refs.includes(e.id));if(refs.length)b+=`<div class="sec-h">Reference files <span class="count">${refs.length}</span></div><div class="as-mini">${refs.map(a=>/^image\//.test(a.type)&&assetSrc(a)?`<img src="${esc(assetSrc(a))}" alt="${esc(a.name)}">`:`<span class="chip">${esc(a.name)}</span>`).join('')}</div>`}
  b+=editorCommentsHTML(p,s.t==='element'?{t:'element',id:e.id,el:s.el}:{t:'entity',id:e.id});
  if(e.unverified)b=`<div class="plain uvb"><b>Unverified.</b> Made from a screenshot by suggestion. Check the parts and links, then <button class="btn small" data-act="unverify">Mark as checked</button></div>`+b;
  b+=`<div class="plain" style="margin-top:16px"><b>${K.label}:</b> ${esc(K.plain)}</div>`;
  ed.innerHTML=`<button class="ed-grip" data-act="sheet-size" aria-label="Make editor taller or shorter"></button><div class="ed-head"><span class="tile">${icon(e.kind==='page'?'pen':K.icon)}</span><h2>Edit ${K.label.toLowerCase()}</h2><button class="btn icon ghost" data-act="close-editor" aria-label="Close editor">${icon('x')}</button></div><div class="ed-body">${b}</div><div class="ed-foot"><span class="sync" style="flex:1">${icon('check')} Changes save as you go</span><button class="btn gold" data-act="close-editor">${icon('check')}Done</button></div>`;
  $('.ed-body',ed).scrollTop=scrollTop;fillCommentNames();
  if(s.t==='element'){const r=$(`.elrow[data-elid="${s.el}"]`,ed);if(r&&s.scroll){const body=$('.ed-body',ed);body.scrollTop=Math.max(0,r.offsetTop-body.offsetTop-body.clientHeight/3);s.scroll=false}}
}
function renderConnEditor(ed,p,c){
  if(!c){S.sel=null;return renderEditor()}
  const def=CONN[c.type]||CONN.navigate;
  let b=`<div class="field"><span class="flabel">From</span><button class="li" data-act="centre" data-id="${c.from.entity}">${icon('link')}<span class="grow">${esc(connFromLabel(p,c))}</span></button></div>
  <div class="field"><label for="c-to">Goes to</label><select id="c-to" class="inp" data-act-change="conn-to" data-id="${c.id}">${targetOptions(p,c.to,c.from.entity)}</select></div>
  <div class="field"><label for="c-type">What kind of link</label><select id="c-type" class="inp" data-act-change="conn-type" data-id="${c.id}">${typeOptions(c.type)}</select><p class="help">${esc(def.plain)}</p></div>
  <div class="field"><label for="c-lab">Label on the line</label><input id="c-lab" class="inp" value="${esc(c.label)}" placeholder="e.g. Yes, Success, Requires login" data-f="label" data-scope="conn" data-id="${c.id}"></div>
  <div class="field"><label for="c-cond">Only when… (condition)</label><input id="c-cond" class="inp" value="${esc(c.condition)}" placeholder="e.g. user is a landlord" data-f="condition" data-scope="conn" data-id="${c.id}"></div>
  <div class="row-btns"><button class="btn small" data-act="trace-conn">${icon('trace')}Trace from here</button><button class="btn small danger" data-act="conn-del" data-id="${c.id}">${icon('trash')}Remove link</button></div>`;
  ed.innerHTML=`<button class="ed-grip" data-act="sheet-size" aria-label="Make editor taller or shorter"></button><div class="ed-head"><span class="tile">${icon('link')}</span><h2>Edit link</h2><button class="btn icon ghost" data-act="close-editor" aria-label="Close editor">${icon('x')}</button></div><div class="ed-body">${b}</div><div class="ed-foot"><span class="sync" style="flex:1">${icon('check')} Changes save as you go</span><button class="btn gold" data-act="close-editor">${icon('check')}Done</button></div>`;
}

