
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
