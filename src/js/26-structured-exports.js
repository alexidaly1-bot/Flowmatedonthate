// =========================================================
// STRUCTURED EXPORTS + AI HANDOFF PACK (ZIP)
// =========================================================
function crc32(u8){const t=crc32.t||(crc32.t=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})());let c=0xFFFFFFFF;for(let i=0;i<u8.length;i++)c=t[(c^u8[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
function makeZip(files){
  const enc=new TextEncoder();const parts=[],central=[];let off=0;
  for(const f of files){const name=enc.encode(f.name);const d=typeof f.data==='string'?enc.encode(f.data):f.data;const crc=crc32(d);
    const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(12,0x21,true);h.setUint32(14,crc,true);h.setUint32(18,d.length,true);h.setUint32(22,d.length,true);h.setUint16(26,name.length,true);
    parts.push(new Uint8Array(h.buffer),name,d);
    const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(14,0x21,true);c.setUint32(16,crc,true);c.setUint32(20,d.length,true);c.setUint32(24,d.length,true);c.setUint16(28,name.length,true);c.setUint32(42,off,true);
    central.push(new Uint8Array(c.buffer),name);off+=30+name.length+d.length}
  const cs=central.reduce((s,x)=>s+x.length,0);const e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cs,true);e.setUint32(16,off,true);
  return new Blob([...parts,...central,new Uint8Array(e.buffer)],{type:'application/zip'});
}
function toYAML(v,ind=''){
  const q=s=>/^[\w .,\/@()+-]*$/.test(s)&&s.trim()===s&&s!==''&&!/^(true|false|null|yes|no|on|off|\d[\d.]*)$/i.test(s)?s:JSON.stringify(s);
  if(Array.isArray(v))return v.length?v.map(x=>`${ind}- `+(x&&typeof x==='object'?toYAML(x,ind+'  ').replace(/^\s+/,''):scalar(x))).join('\n'):ind+'[]';
  if(v&&typeof v==='object'){const ks=Object.keys(v).filter(k=>v[k]!==undefined);return ks.length?ks.map(k=>{const x=v[k];return x&&typeof x==='object'&&(Array.isArray(x)?x.length:Object.keys(x).length)?`${ind}${q(k)}:\n${toYAML(x,ind+'  ')}`:`${ind}${q(k)}: ${x&&typeof x==='object'?(Array.isArray(x)?'[]':'{}'):scalar(x)}`}).join('\n'):ind+'{}'}
  return ind+scalar(v);
  function scalar(x){return x==null?'null':typeof x==='string'?(x.includes('\n')?'|\n'+x.split('\n').map(l=>ind+'  '+l).join('\n'):q(x)):String(x)}
}
function handoffFiles(p){
  const md=(t,b)=>`# ${t}\n\n${b}\n`;const pg=pages(p);const look=lookFor(p,null);const pal=look.palette;
  const ov=`${p.description||''}\n\n- Platforms: ${(p.platforms||[]).join(', ')}\n- Pages: ${pg.length}\n- Modules: ${Object.values(p.modules).map(m=>m.name).join(', ')}\n- First page: ${entityLabel(p,p.startPageId)}`;
  const nav=toMermaid(p);
  const pageSpec=pg.map(e=>`## ${e.name}\n\n- Type: ${e.pageType}\n- Module: ${(p.modules[e.moduleId]||{}).name||'-'}\n- Who can see it: ${e.roles.length?e.roles.map(r=>roleName(p,r)).join(', '):'Everyone'}\n- Status: ${e.status}${e.priority?' · '+e.priority:''}\n\n${e.desc||''}\n\n| Part | Type | Leads to |\n|---|---|---|\n${e.elements.map(el=>`| ${el.label} | ${(EL_TYPES[el.type]||{}).label||el.type} | ${outConns(p,e.id,el.id).map(c=>entityLabel(p,c.to)).join(', ')||'-'} |`).join('\n')}\n`).join('\n');
  const fns=byKindP(p,'function').map(f=>`## ${f.name}\n\n${logicViews(p,f,true).dev}\n\nSteps:\n${(f.steps||'').split('\n').filter(Boolean).map((s,i)=>`${i+1}. ${s}`).join('\n')||'(not written)'}\n\nOn success: ${f.success||'?'}\nOn error: ${f.error||'?'}\n`).join('\n');
  const comps=byKindP(p,'component').map(c=>`## ${c.name}\n\nUsed on: ${usersOf(p,c.id).pages.map(i=>entityLabel(p,i)).join(', ')||'-'}\n\nParts:\n${(c.parts||'').split('\n').filter(Boolean).map(x=>'- '+x).join('\n')||'- (not listed)'}\n\n${c.desc||''}\n`).join('\n');
  const data=byKindP(p,'data').map(d=>`## ${d.name}\n\n- Kind: ${d.stateKind||'?'}\n- Stored: ${d.storage||'?'}\n- Access: ${d.access||'?'}\n- Retention: ${d.retention||'?'}\n\nFields:\n${(d.fields||'').split('\n').filter(Boolean).map(x=>'- '+x).join('\n')||'- (none)'}\n`).join('\n');
  const sets=byKindP(p,'setting').map(s=>`| ${s.key||'-'} | ${s.name} | ${s.valueType} | ${s.defaultValue} | ${s.scope}${s.scopeTarget?' ('+targetName(p,s.scopeTarget)+')':''} | ${(s.overrides||[]).map(o=>targetName(p,o.target)+'='+o.value).join('; ')||'-'} |`).join('\n');
  const perms='role,page,can_open\n'+p.roles.flatMap(r=>pg.map(e=>`${JSON.stringify(r.name)},${JSON.stringify(e.name)},${!e.roles.length||e.roles.includes(r.id)}`)).join('\n');
  const errs=Object.values(p.connections).filter(c=>c.type==='error').map(c=>`- ${connFromLabel(p,c)} → ${entityLabel(p,c.to)}${c.label?' ('+c.label+')':''}`).concat(byKindP(p,'function').filter(f=>f.error).map(f=>`- ${f.name}: ${f.error}`)).join('\n');
  const tests={format:'flowmate-tests',scenarios:(p.paths||[]).map(x=>({name:x.name,role:x.role?roleName(p,x.role):null,expectEnd:x.expect?entityLabel(p,x.expect):null,steps:x.steps.map(s=>({page:entityLabel(p,s.page),tap:s.el?(findElement(p,s.steps?null:s.page,s.el)||{}).label:null,choice:s.choice||null}))})),cases:(p.tasks||[]).filter(t=>t.kind==='test').map(t=>({test:t.text,expect:t.expect,about:t.ref?entityLabel(p,t.ref):null}))};
  const tok=pal?paletteTokens({name:look.paletteName||'App colours',light:pal.light,dark:pal.dark}):{json:JSON.stringify({name:'App colours',color:{primary:{$type:'color',$value:look.primary}}},null,2),css:`:root{ --color-primary: ${look.primary}; }\n`};
  const prio=Object.values(p.entities).filter(e=>e.priority).sort((a,b)=>PRIORITIES.indexOf(b.priority)-PRIORITIES.indexOf(a.priority)).map(e=>`- **${e.priority}**: ${e.name} (${KINDS[e.kind].label}, ${e.status})`).join('\n');
  const open=analyse(p);const qs=[...open.journeys,...open.contradictions].map(x=>'- '+x.msg).concat(checkProject(p).map(i=>'- '+i.msg)).join('\n');
  return [
    ['README.md',md(`${p.name}: developer handoff`,`Made with FlowMate on ${new Date().toLocaleDateString('en-AU')}. Read the files in number order.\n\nThis is a plan, not finished code. Check open questions (14) before you build.\n\n${ov}`)],
    ['01-overview.md',md('Product overview',ov)],['02-navigation.md',md('Navigation map','```mermaid\n'+nav+'\n```')],['03-pages.md',md('Pages',pageSpec)],
    ['04-components.md',md('Components',comps||'None')],['05-functions.md',md('Functions and logic',fns||'None')],['06-data.md',md('Data and state',data||'None')],
    ['07-settings.md',md('Settings',`| Key | Name | Type | Default | Scope | Overrides |\n|---|---|---|---|---|---|\n${sets}`)],['08-permissions.csv',perms],['09-errors.md',md('Error states',errs||'None defined')],
    ['10-design-tokens.json',tok.json],['10-design-tokens.css',tok.css],['11-tests.json',JSON.stringify(tests,null,2)],['12-acceptance.md',md('Acceptance criteria',Object.values(p.entities).filter(e=>(e.acceptance||[]).length).map(e=>`## ${e.name}\n${e.acceptance.map(a=>`- [${a.done?'x':' '}] ${a.text}`).join('\n')}`).join('\n\n')||'None written')],
    ['13-priorities.md',md('Implementation priorities',prio||'No priorities set')],['14-open-questions.md',md('Open questions and assumptions',qs||'None found')],
    ['project.json',exportJSON(p)],['project.yaml',toYAML(JSON.parse(exportJSON(p)))],['pages.csv',toCSV(p)],['navigation.mmd',nav],
    ...Object.values(p.entities).filter(e=>['page','function','component'].includes(e.kind)).map(e=>[`passports/${e.kind}-${e.name.replace(/[^\w-]+/g,'-').toLowerCase().slice(0,40)}-${e.id.slice(-4)}.md`,passportMD(p,e)])
  ].map(([name,data])=>({name,data}));
}
function viewOnlyHTML(p){
  const sv=exportSVG(p,{scope:'all',arrows:true,status:true,notes:true,bg:true,detail:'detailed'});const list=pages(p).map(e=>`<li><b>${svgEsc(e.name)}</b> · ${svgEsc(e.pageType)}<ul>${e.elements.map(el=>`<li>${svgEsc(el.label)}${outConns(p,e.id,el.id).length?' → '+svgEsc(outConns(p,e.id,el.id).map(c=>entityLabel(p,c.to)).join(', ')):''}</li>`).join('')}</ul></li>`).join('');
  return `<!DOCTYPE html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${svgEsc(p.name)} (view only)</title><style>body{margin:0;font-family:system-ui,sans-serif;background:${cssv('--canvas')};color:${cssv('--ink')}}header{padding:12px 16px;display:flex;gap:12px;align-items:center;border-bottom:1px solid ${cssv('--line')};background:${cssv('--bar')}}h1{font-size:18px;margin:0;flex:1}button{font:inherit;min-height:40px;padding:0 14px;border-radius:10px;border:1px solid ${cssv('--line')};background:${cssv('--card')};color:inherit}#v{overflow:hidden;height:calc(100vh - 66px);touch-action:none;cursor:grab}#v svg{transform-origin:0 0}aside{padding:16px;line-height:1.5}.hide{display:none}</style></head><body><header><h1>${svgEsc(p.name)} <small>· view only</small></h1><button onclick="z(1.2)">Zoom in</button><button onclick="z(1/1.2)">Zoom out</button><button onclick="t()">Page list</button></header><div id="v">${sv.svg}</div><aside id="l" class="hide"><ol>${list}</ol></aside>
<script>let s=Math.min(1,innerWidth/${Math.round(sv.w)}),x=0,y=0,d=null;const v=document.getElementById('v'),g=v.querySelector('svg');function a(){g.style.transform='translate('+x+'px,'+y+'px) scale('+s+')'}function z(f){s=Math.min(3,Math.max(.05,s*f));a()}function t(){document.getElementById('l').classList.toggle('hide');v.classList.toggle('hide')}v.onpointerdown=e=>{d=[e.clientX-x,e.clientY-y];v.setPointerCapture(e.pointerId)};v.onpointermove=e=>{if(d){x=e.clientX-d[0];y=e.clientY-d[1];a()}};v.onpointerup=()=>d=null;v.onwheel=e=>{e.preventDefault();z(e.deltaY<0?1.1:1/1.1)};a()<\/script></body></html>`;
}
function export2Modal(){
  const p=S.p;let tab='pictures';
  const scopes=[['all','Whole project'],...Object.values(p.modules).map(m=>['module:'+m.id,'Module: '+m.name]),...(S.sel&&S.sel.t!=='conn'?[['branch:'+S.sel.id,'Selected branch: '+entityLabel(p,S.sel.id)]]:[]),...pages(p).map(e=>['page:'+e.id,'Page: '+e.name]),...(p.paths||[]).map(x=>['path:'+x.id,'Journey: '+x.name])];
  const body=()=>`<div class="tabs" role="tablist">${[['pictures','Pictures'],['data','Data files'],['handoff','Developer handoff'],['share','View-only copy']].map(([k,l])=>`<button role="tab" aria-selected="${tab===k}" class="${tab===k?'on':''}" data-x2tab="${k}">${l}</button>`).join('')}</div>`+
    (tab==='pictures'?`<div class="field"><label for="x2-s">What to include</label><select id="x2-s" class="inp">${scopes.map(([k,l])=>opt(k,'all',l)).join('')}</select></div>
    <div class="field"><span class="flabel">Format</span><div class="chips" id="x2-f">${['png','jpeg','svg','pdf'].map((f,i)=>`<button class="${i?'':'on'}" data-v="${f}" aria-pressed="${!i}">${f.toUpperCase()}</button>`).join('')}</div></div>
    <div class="field"><span class="flabel">Options</span><label class="opt-line"><input type="checkbox" id="x2-a" checked> Arrows</label><label class="opt-line"><input type="checkbox" id="x2-st" checked> Status tags</label><label class="opt-line"><input type="checkbox" id="x2-n"> Notes</label><label class="opt-line"><input type="checkbox" id="x2-b" checked> Background</label><label class="opt-line"><input type="checkbox" id="x2-h"> Include folded-away branches</label><label class="opt-line"><input type="checkbox" id="x2-pm"> PDF: one page per module</label></div>
    <div class="field"><label for="x2-d">Detail</label><select id="x2-d" class="inp">${opt('detailed','detailed','Every part')}${opt('simple','detailed','Cards only')}</select></div><div class="field"><label for="x2-r">Sharpness</label><select id="x2-r" class="inp">${[1,2,3].map(r=>opt(String(r),'2',r+'×')).join('')}</select></div><div id="x2-pv" class="x2-pv"></div>`
    :tab==='data'?`<p class="help">Project file, diagram, lists and structured data.</p><div class="list">${[['json','Project file (JSON)','Import it back into FlowMate'],['yaml','Project (YAML)','Same data, easier to read'],['mermaid','Navigation diagram (Mermaid, in Markdown)','GitHub and Notion can draw it'],['csv','Pages and buttons (CSV)','Opens in a spreadsheet'],['docs','Developer documentation (Markdown)','Every page, function and journey'],['tokens','Design tokens (JSON)','Colours for developers']].map(([k,l,d])=>`<button class="li" data-x2data="${k}"><span class="grow">${l}<small>${d}</small></span>${icon('download')}</button>`).join('')}</div><button class="btn small" data-x2old="1">More export options…</button>`
    :tab==='handoff'?`<p>One ZIP file a developer or coding AI can build from: overview, navigation, page specs, components, functions, data, settings, permissions, errors, design tokens, tests, acceptance criteria, priorities, open questions and a passport for each feature.</p><p class="help">It includes the open questions FlowMate found, so nothing unclear is hidden.</p>`
    :`<p>A single web page anyone can open in a browser to look at the map. They can't change anything.</p><p class="help">To work on it together instead, use Team → Share this project.</p>`);
  const pv=()=>{const box=$('#x2-pv');if(!box)return;const o=opts();const sv=exportSVG(p,o);box.innerHTML=sv?`<img alt="Preview" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(sv.svg)}">`:'<p class="help">Nothing to show.</p>'};
  const opts=()=>({scope:$('#x2-s').value,arrows:$('#x2-a').checked,status:$('#x2-st').checked,notes:$('#x2-n').checked,bg:$('#x2-b').checked,hidden:$('#x2-h').checked,detail:$('#x2-d').value});
  const fn=s=>p.name.replace(/[^\w-]+/g,'-').toLowerCase()+s;
  const go=async()=>{try{
    if(tab==='pictures'){const o=opts();const f=$('#x2-f .on').dataset.v;const r=+$('#x2-r').value;
      if(f==='svg'){const sv=exportSVG(p,o);return download(fn('.svg'),sv.svg)}
      if(f==='png'||f==='jpeg'){const sv=exportSVG(p,o);const b=await rasterise(sv,r,f==='png'?'image/png':'image/jpeg',o.bg);return download(fn(f==='png'?'.png':'.jpg'),b)}
      const parts=$('#x2-pm').checked&&o.scope==='all'?[o.scope,...Object.keys(p.modules).map(m=>'module:'+m)]:[o.scope];const imgs=[];for(const sc of parts){const sv=exportSVG(p,Object.assign({},o,{scope:sc}));if(sv)imgs.push(await jpegOf(sv,r))}
      return download(fn('.pdf'),makePDF(imgs,p.name))}
    if(tab==='handoff')return download(fn('-handoff.zip'),makeZip(handoffFiles(p)));
    if(tab==='share')return download(fn('-view-only.html'),viewOnlyHTML(p));
  }catch(e){toast(e.message||"Couldn't make that file")}};
  openModal({title:'Export',sub:'Pictures, data and developer handoff',ic:'export',wide:true,body:`<div id="x2">${body()}</div>`,actions:[{label:'Close',run:closeModal},{label:'Download',primary:true,icon:'download',run:go}],
    onOpen:m=>{const draw=()=>{$('#x2').innerHTML=body();if(tab==='pictures')pv()};draw();
      m.firstElementChild.addEventListener('click',ev=>{const t=ev.target.closest('[data-x2tab]');if(t){tab=t.dataset.x2tab;draw();return}const f=ev.target.closest('#x2-f button');if(f){$$('#x2-f button').forEach(b=>{b.classList.toggle('on',b===f);b.setAttribute('aria-pressed',b===f)});return}
        const dd=ev.target.closest('[data-x2data]');if(dd){const k=dd.dataset.x2data;if(k==='json')download(fn('-flowmate.json'),exportJSON(p));else if(k==='yaml')download(fn('-flowmate.txt'),toYAML(JSON.parse(exportJSON(p))));else if(k==='mermaid')download(fn('-navigation.md'),'```mermaid\n'+toMermaid(p)+'\n```\n');else if(k==='csv')download(fn('-pages.csv'),toCSV(p));else if(k==='docs')download(fn('-docs.md'),docsFor(p).map(d=>d.text).join('\n\n---\n\n'));else if(k==='tokens'){const l=lookFor(p,null);download(fn('-tokens.json'),l.palette?paletteTokens({name:l.paletteName,light:l.palette.light,dark:l.palette.dark}).json:JSON.stringify({color:{primary:{$type:'color',$value:l.primary}}},null,2))}return}
        if(ev.target.closest('[data-x2old]')){closeModal();exportModal()}});
      m.firstElementChild.addEventListener('change',()=>{if(tab==='pictures')pv()})}});
}

