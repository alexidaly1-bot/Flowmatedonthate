// =========================================================
// ASSETS + SCREENSHOT-TO-FLOW
// =========================================================
const AS={cap:undefined};
async function assetsCap(){if(AS.cap!==undefined)return AS.cap;try{AS.cap=window.claude&&window.claude.use?await window.claude.use('assets'):null}catch(e){AS.cap=null}return AS.cap}
async function thumbOf(file,max=360){if(!/^image\//.test(file.type))return null;const url=URL.createObjectURL(file);const img=new Image();await new Promise(r=>{img.onload=r;img.onerror=r;img.src=url});if(!img.naturalWidth)return null;const s=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*s);c.height=Math.round(img.naturalHeight*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);return c.toDataURL('image/jpeg',.7)}
const OK_TYPES=['image/png','image/jpeg','image/gif','image/webp','image/svg+xml','application/pdf','text/csv','text/markdown','application/json','text/plain','video/mp4'];
async function storeFiles(files){
  const cap=await assetsCap();const out=[];
  for(const f of files){const type=OK_TYPES.includes(f.type)?f.type:(/\.md$/i.test(f.name)?'text/markdown':/\.csv$/i.test(f.name)?'text/csv':/\.txt$/i.test(f.name)?'text/plain':f.type);
    const th=await thumbOf(f);let id=null,url=null;
    if(cap){try{const r=await cap.upload(f,{type});id=r.id;url=r.url}catch(e){toast(e&&e.code==='too_large'?`${f.name} is too big (20 MB max)`:e&&e.code==='unsupported_type'?`${f.name}: that kind of file can't be stored`:`Couldn't upload ${f.name}`);if(!th)continue}}
    out.push({id:uid('as'),blob:id,name:f.name.slice(0,120),type,size:f.size,thumb:th&&th.length<90000?th:null,at:Date.now(),tags:'',refs:[],local:!id})}
  return out;
}
function assetSrc(a){return a.blob?'/_blob/'+a.blob:a.thumb||''}
function assetsHTML(p){
  const sel=S.sel&&S.sel.t!=='conn'?p.entities[S.sel.id]:null;
  return `<p class="help">Keep screenshots, sketches, logos and reference files with the project. Attach them to cards so developers see them.</p>
  <div class="row-btns"><label class="btn small primary" for="as-up">${icon('upload')}Add files</label><input id="as-up" type="file" multiple hidden data-act-change="as-up"><label class="btn small" for="as-shot">${icon('image')}Screenshots → pages</label><input id="as-shot" type="file" accept="image/*" multiple hidden data-act-change="as-shot"></div>
  ${AS.cap===null?'<p class="help">Files are stored as small previews on this device. Open FlowMate inside Claude to keep the full files.</p>':''}
  <div class="as-grid">${p.assets.map(a=>`<div class="as-item">${assetSrc(a)&&/^image\//.test(a.type)?`<img src="${esc(assetSrc(a))}" alt="${esc(a.name)}" loading="lazy">`:`<div class="as-file">${icon('file')}<span>${esc((a.type.split('/')[1]||'file').toUpperCase())}</span></div>`}<b>${esc(a.name)}</b><small>${Math.ceil(a.size/1024)} KB${a.refs.length?' · on '+a.refs.map(r=>entityLabel(p,r)).join(', '):''}</small><div class="row-btns">${sel?`<button class="btn small" data-act="as-attach" data-id="${a.id}">${a.refs.includes(sel.id)?'Detach from':'Attach to'} ${esc(trunc(sel.name,16))}</button>`:''}${a.blob?`<a class="btn small ghost" href="${esc('/_blob/'+a.blob)}" target="_blank" rel="noopener">Open</a>`:''}<button class="mini" data-act="as-del" data-id="${a.id}" aria-label="Delete ${esc(a.name)}">${icon('trash')}</button></div></div>`).join('')||'<p class="help">No files yet.</p>'}</div>`;
}
Object.assign(ACT,{
  'as-attach':d=>commit('Attach file',p=>{const a=p.assets.find(x=>x.id===d.id);const id=S.sel.id;a.refs=a.refs.includes(id)?a.refs.filter(r=>r!==id):a.refs.concat(id)}),
  'as-del':d=>{const a=S.p.assets.find(x=>x.id===d.id);confirmModal(`Delete “${esc(a.name)}”?`,a.blob?'The file is removed for good, for everyone who opens FlowMate. This can\'t be undone.':'It is removed from this project.','Delete',async()=>{if(a.blob){const cap=await assetsCap();try{cap&&await cap.delete(a.blob)}catch(e){if(e&&e.code==='not_uploader')return toast('Only the person who uploaded it can delete it')}}commit('Delete file',p=>{p.assets=p.assets.filter(x=>x.id!==d.id)})})},
});
document.addEventListener('change',async ev=>{const t=ev.target;const a=t.dataset&&t.dataset.actChange;if(a!=='as-up'&&a!=='as-shot')return;const files=[...t.files].slice(0,12);t.value='';if(!files.length)return;
  toast('Adding '+files.length+' file'+(files.length>1?'s':'')+'…');const list=await storeFiles(files);if(!list.length)return;
  commit('Add files',p=>{p.assets.push(...list)});if(a==='as-shot')screenshotFlow(list,files)});
async function screenshotFlow(assets,files){
  let props=assets.map((a,i)=>({name:a.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ').replace(/\b(screenshot|img|image|\d{4,})\b/gi,'').trim()||'Screen '+(i+1),pageType:'Detail',parts:[],asset:a.id,on:true}));let links=[];let note='';
  let aiOK=false;try{if(AI.sample&&AI.sample.limits){const lim=await AI.sample.limits();aiOK=!!(lim&&lim.images)}}catch(e){}
  if(aiOK){toast('Claude is looking at your screenshots…');
    try{const r=await AI.sample.json(`These are ${files.length} app screenshots, in order. For each one, describe the screen as a page of an app plan. Reply JSON only: {"pages":[{"name":"short page name","pageType":"one of: ${PAGE_TYPES.join(', ')}","parts":[{"label":"visible button or field text","type":"button|input|text|image|list|toggle|link|tab"}]}],"links":[{"from":page index,"part":"part label","to":page index}]}. Only list links you can see evidence for, like a button whose label matches another screen's title.`,{images:files.slice(0,6)});
      if(r&&Array.isArray(r.pages))r.pages.forEach((q,i)=>{if(!props[i])return;props[i].name=String(q.name||props[i].name).slice(0,60);props[i].pageType=PAGE_TYPES.includes(q.pageType)?q.pageType:'Detail';props[i].parts=(q.parts||[]).slice(0,14).map(x=>({label:String(x.label||'').slice(0,50),type:EL_TYPES[x.type]?x.type:'button'})).filter(x=>x.label)});
      if(r&&Array.isArray(r.links))links=r.links.filter(l=>props[l.from]&&props[l.to]&&l.from!==l.to).map(l=>({from:+l.from,part:String(l.part||''),to:+l.to,on:false}));note='Claude suggested these. Nothing is added until you confirm. Links are unverified, so tick only the ones you know are right.'}catch(e){note="Claude couldn't read the screenshots, so name them yourself."}}
  else note='Name each screen and list its buttons. Image reading is not available here.';
  const body=()=>`<p class="help">${esc(note)}</p>${props.map((q,i)=>`<div class="ss-row"><img src="${esc(assetSrc(S.p.assets.find(a=>a.id===q.asset)||{}))}" alt="Screenshot ${i+1}"><div class="grow"><label class="opt-line"><input type="checkbox" data-ss-on="${i}"${q.on?' checked':''}> Add as a page</label><label class="sr" for="ss-n${i}">Name</label><input id="ss-n${i}" class="inp" data-ss-n="${i}" value="${esc(q.name)}"><label class="sr" for="ss-t${i}">Page type</label><select id="ss-t${i}" class="inp" data-ss-t="${i}">${PAGE_TYPES.map(t=>opt(t,q.pageType)).join('')}</select><label for="ss-p${i}" class="flabel">Parts (one per line)</label><textarea id="ss-p${i}" class="inp" rows="3" data-ss-p="${i}">${esc(q.parts.map(x=>x.label).join('\n'))}</textarea></div></div>`).join('')}
    ${links.length?`<div class="mod-h">Suggested links (unverified)</div>${links.map((l,i)=>`<label class="opt-line"><input type="checkbox" data-ss-l="${i}"${l.on?' checked':''}> ${esc(props[l.from].name)} › “${esc(l.part)}” → ${esc(props[l.to].name)}</label>`).join('')}`:''}`;
  openModal({title:'Screenshots → pages',sub:'Check before adding',ic:'image',wide:true,body:`<div id="ss-b">${body()}</div>`,actions:[{label:'Cancel',run:closeModal},{label:'Add to map',primary:true,run:()=>{
    $$('[data-ss-n]').forEach(i=>props[+i.dataset.ssN].name=i.value.trim()||props[+i.dataset.ssN].name);$$('[data-ss-t]').forEach(i=>props[+i.dataset.ssT].pageType=i.value);$$('[data-ss-on]').forEach(i=>props[+i.dataset.ssOn].on=i.checked);
    $$('[data-ss-p]').forEach(i=>{const q=props[+i.dataset.ssP];const old=Object.fromEntries(q.parts.map(x=>[x.label,x.type]));q.parts=i.value.split('\n').map(s=>s.trim()).filter(Boolean).map(l=>({label:l,type:old[l]||'button'}))});
    $$('[data-ss-l]').forEach(i=>links[+i.dataset.ssL].on=i.checked);closeModal();
    const made=commit(`Add ${props.filter(q=>q.on).length} pages from screenshots`,p=>{const m=addModule(p,'From screenshots');const ys=Math.max(0,...Object.values(p.entities).map(e=>e.y+400));const ids=[];
      props.forEach((q,i)=>{if(!q.on){ids.push(null);return}const e=addEntity(p,'page',{name:q.name,pageType:q.pageType,moduleId:m.id,x:i*360,y:ys,unverified:true,desc:'Made from a screenshot. Check it, then clear “Unverified”.'});e.elements=q.parts.map(x=>({id:uid('el'),label:x.label,type:x.type}));const a=p.assets.find(z=>z.id===q.asset);if(a)a.refs.push(e.id);ids.push(e.id)});
      for(const l of links){if(!l.on||!ids[l.from]||!ids[l.to])continue;const src=p.entities[ids[l.from]];const el=src.elements.find(x=>normL(x.label)===normL(l.part));addConn(p,{entity:src.id,element:el?el.id:null},ids[l.to],'navigate')}
      return ids.filter(Boolean)});
    if(made&&made[0]){renderAll();setTimeout(()=>select({t:'entity',id:made[0]},{centre:true}),60);toast('Added. Each page is marked “Unverified” until you check it.')}}}]});
}

