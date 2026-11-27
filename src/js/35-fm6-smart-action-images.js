// =========================================================
// FM6 · SMART ACTION — images (labelled), image-only requests, compact context,
// no duplicate requests
// =========================================================
AI.imgs=[];AI.cache=new Map();
const IMG_MAX=6,IMG_SIDE=1280;
const imgLetter=i=>'Image '+String.fromCharCode(65+i);
function saImagesOn(){return S.prefs.saImages!==false}
async function saImgLimits(){
  if(AI.imgLim!==undefined)return AI.imgLim;
  try{const l=AI.sample&&AI.sample.limits?await AI.sample.limits():null;AI.imgLim=l&&l.images?l.images:false}catch(e){AI.imgLim=false}
  return AI.imgLim;
}
// Shrink big photos before sending: faster, cheaper, same meaning
async function shrinkImage(file){
  let bmp;try{bmp=await createImageBitmap(file)}catch(e){throw new Error('That file is not an image FlowMate can read.')}
  const k=Math.min(1,IMG_SIDE/Math.max(bmp.width,bmp.height));const w=Math.max(1,Math.round(bmp.width*k)),h=Math.max(1,Math.round(bmp.height*k));
  if(k===1&&file.size<900000&&/jpe?g|png|webp/.test(file.type)){bmp.close&&bmp.close();return{blob:file,w,h}}
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,w,h);cx.drawImage(bmp,0,0,w,h);bmp.close&&bmp.close();
  const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.82));cv.width=cv.height=0;return{blob:blob||file,w,h};
}
async function saAddFiles(files){
  const list=[...files].filter(f=>f&&/^image\//.test(f.type));if(!list.length)return toast('Only pictures can be added here');
  const room=IMG_MAX-AI.imgs.length;if(room<=0)return toast(`Up to ${IMG_MAX} images at a time`);
  for(const f of list.slice(0,room)){
    try{const r=await shrinkImage(f);const i=AI.imgs.length;AI.imgs.push({id:uid('img'),label:imgLetter(i),name:f.name||'',blob:r.blob,w:r.w,h:r.h,url:URL.createObjectURL(r.blob)})}
    catch(e){toast(e.message||'That image could not be added')}
  }
  if(list.length>room)toast(`Added ${room}. Up to ${IMG_MAX} images at a time.`);
  renderSA();
}
function saRemoveImg(id){const i=AI.imgs.findIndex(x=>x.id===id);if(i<0)return;URL.revokeObjectURL(AI.imgs[i].url);AI.imgs.splice(i,1);
  // keep default names in order (A, B, C…); renamed ones keep their name
  AI.imgs.forEach((x,k)=>{if(/^Image [A-Z]$/.test(x.label))x.label=imgLetter(k)});renderSA()}
function saClearImgs(){for(const x of AI.imgs)URL.revokeObjectURL(x.url);AI.imgs=[]}
function saAttHTML(){
  if(!saImagesOn())return '';
  const lim=AI.imgLim;const off=lim===false;const busy=AI.state==='thinking';
  let h=`<div class="sa-att" aria-label="Images">`;
  h+=`<div class="sa-att-h"><button class="btn small" data-act="sa-img-add" ${off||busy||AI.imgs.length>=IMG_MAX?'disabled':''}>${icon('image')}Add image${AI.imgs.length?'':'s'}</button><span class="help">${off?'Images can\'t be sent from here. Text still works.':AI.imgs.length?`Refer to them by name, e.g. “like ${esc(AI.imgs[0].label)}”.`:'Optional. Add screenshots, sketches or references. You can send images with no text.'}</span></div>`;
  if(AI.imgs.length)h+=`<ul class="sa-imgs">${AI.imgs.map((x,i)=>`<li class="sa-img"><button class="sa-thumb" data-act="sa-img-view" data-id="${x.id}" aria-label="Preview ${esc(x.label)}"><img src="${x.url}" alt=""></button><label class="sr" for="sa-il-${x.id}">Name for image ${i+1}</label><input id="sa-il-${x.id}" class="inp sa-il" data-img="${x.id}" value="${esc(x.label)}" maxlength="40" ${busy?'disabled':''}><button class="btn icon ghost small" data-act="sa-img-del" data-id="${x.id}" aria-label="Remove ${esc(x.label)}" ${busy?'disabled':''}>${icon('x')}</button></li>`).join('')}</ul>`;
  return h+`</div>`;
}
const _renderSA6=renderSA;
renderSA=function(){
  _renderSA6.apply(this,arguments);
  const m=$('#modal');if(m.classList.contains('hide')||!$('#sa-body'))return;
  if(saImagesOn()&&AI.sample&&AI.imgLim===undefined)saImgLimits().then(()=>renderSA());
  const wrap=$('.sa-in-wrap',m);if(wrap){const part=wrap.nextElementSibling&&wrap.nextElementSibling.classList.contains('sa-partial')?wrap.nextElementSibling:wrap;part.insertAdjacentHTML('afterend',saAttHTML())}
  const ta=$('#sa-in');if(ta){ta.placeholder=saImagesOn()?'e.g. Add a Running late button to the ready page. Or add an image and leave this empty.':ta.placeholder;
    ta.addEventListener('paste',ev=>{if(!saImagesOn()||AI.imgLim===false)return;const fs=[...(ev.clipboardData&&ev.clipboardData.files||[])].filter(f=>/^image\//.test(f.type));if(fs.length){ev.preventDefault();saAddFiles(fs)}})}
  m.querySelectorAll('.sa-il').forEach(inp=>inp.addEventListener('input',()=>{const x=AI.imgs.find(y=>y.id===inp.dataset.img);if(x)x.label=inp.value.replace(/\s+/g,' ').slice(0,40)}));
  m.querySelectorAll('.sa-il').forEach(inp=>inp.addEventListener('blur',()=>{const x=AI.imgs.find(y=>y.id===inp.dataset.img);if(x&&!x.label.trim()){x.label=imgLetter(AI.imgs.indexOf(x));inp.value=x.label}}));
  const go=m.querySelector('[data-act=sa-go]:not([data-again])');if(go&&AI.state!=='thinking'&&AI.sample)go.disabled=false;
};
function saImgView(id){
  const x=AI.imgs.find(y=>y.id===id);if(!x)return;
  let v=$('#sa-view');if(!v){v=document.createElement('div');v.id='sa-view';v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');document.body.appendChild(v);v.addEventListener('click',ev=>{if(ev.target===v||ev.target.closest('[data-close]'))v.hidden=true});v.addEventListener('keydown',ev=>{if(ev.key==='Escape'){ev.stopPropagation();v.hidden=true}})}
  v.setAttribute('aria-label',x.label);v.innerHTML=`<figure><img src="${x.url}" alt="${esc(x.label)}"><figcaption><b>${esc(x.label)}</b>${x.name?` · ${esc(x.name)}`:''} · ${x.w}×${x.h}<button class="btn small" data-close="1">Close</button></figcaption></figure>`;v.hidden=false;v.querySelector('button').focus();
}
Object.assign(ACT,{
  'sa-img-add':()=>{let f=$('#sa-file');if(!f){f=document.createElement('input');f.type='file';f.id='sa-file';f.accept='image/*';f.multiple=true;f.hidden=true;document.body.appendChild(f);f.addEventListener('change',()=>{saAddFiles(f.files);f.value=''})}f.click()},
  'sa-img-del':d=>saRemoveImg(d.id),
  'sa-img-view':d=>saImgView(d.id),
  'sa-go':d=>saAsk(!!(d&&d.again)),
});
// Smaller map for big projects: long notes are cut down, structure is kept whole
const _snap6=projectSnapshot;
projectSnapshot=function(p,scope,selId){
  let t;if(IX.p===p)t=_snap6(p,scope,selId);else{const keep=IX.p;ixBuild(p);try{t=_snap6(p,scope,selId)}finally{IX.p=null;if(keep)ixBuild(keep)}}
  if(t.length>24000){const cut=n=>t.replace(/\b(desc|notes|steps|fields|success|error|trigger)="([^"]*)"/g,(m,k,v)=>v.length>n?`${k}="${v.slice(0,n)}…"`:m);t=cut(90);if(t.length>24000)t=cut(30);if(t.length>24000)t=t.replace(/ status="New"/g,'')}
  return t;
};
// Ask: text, images, or both; reuse an identical answer; never two requests at once
saAsk=async function(force){
  if(AI.state==='thinking')return;
  const text=(AI.text||'').trim();const imgs=saImagesOn()?AI.imgs.slice():[];
  if(!text&&!imgs.length){toast(saImagesOn()?'Type, say or add an image first':'Type or say what you want first');$('#sa-in')?.focus();return}
  if(!AI.sample){AI.err=AI_ERR.capability_disabled;renderSA();return}
  if(imgs.length&&(await saImgLimits())===false){AI.err='Images can\'t be sent from here. Remove them, or describe what they show in words.';renderSA();return}
  if(AI.dict&&AI.listening){try{await AI.dict.stop()}catch(e){}}
  const request=text||'(No words given, only images.) Look at the attached images, work out what they show, and suggest what to add or change in this map to match. Say briefly what you saw in "understood".';
  let prompt=buildPrompt(S.p,request,AI.scope,S.sel,AI.turns);
  if(imgs.length)prompt+=`\n\nATTACHED IMAGES, in this order (the user may refer to them by these names):\n${imgs.map((x,i)=>`${i+1}. "${x.label.replace(/"/g,"'")}"${x.name?` (file ${x.name.replace(/"/g,"'")})`:''}`).join('\n')}\nUse what the images show (screens, sketches, flows, colours, labels). If an image is unclear, say so in "understood" rather than guessing.`;
  const key=[hashStr(request),AI.scope,S.sel?JSON.stringify(S.sel):'',imgs.map(x=>x.id+':'+x.label).join(',')].join('|');
  if(!force&&AI.cache.has(key)&&AI.cache.get(key).rev===S.p.rev){AI.res=JSON.parse(JSON.stringify(AI.cache.get(key).res));previewAll();AI.chosen=AI.res.options.length===1?0:-1;AI.state='result';AI.err='';renderSA();toast('Same request as before, so here are those options again. Tap Try again for new ones.');return}
  AI.ctl=new AbortController();AI.state='thinking';AI.err='';AI.res=null;AI.chosen=-1;AI.stale=false;AI.progress=0;renderSA();
  let last=0;
  try{
    const opts={signal:AI.ctl.signal,cache:false,modelTier:'default',onText:({text})=>{AI.progress=text.length;if(text.length-last>400){last=text.length;const t=$('.sa-think span:nth-child(2)');if(t)t.innerHTML=`Writing the plan… <small class="help">${Math.round(text.length/100)/10}k characters</small>`}}};
    if(imgs.length)opts.images=imgs.map(x=>x.blob);
    const raw=await AI.sample.json(prompt,opts);
    AI.res=normaliseResult(raw);
    AI.cache.set(key,{rev:S.p.rev,res:JSON.parse(JSON.stringify(AI.res))});if(AI.cache.size>8)AI.cache.delete(AI.cache.keys().next().value);
    previewAll();
    if(AI.res.options.length===1)AI.chosen=0;
    AI.turns.push({request:(text||'(images only)')+(imgs.length?` [with ${imgs.map(x=>x.label).join(', ')}]`:''),options:AI.res.options.map(o=>o.title),chosen:null});if(AI.turns.length>6)AI.turns.shift();
    AI.state='result';
  }catch(e){
    AI.state='ask';
    if(e&&e.code==='cancelled'){AI.err=''}
    else{AI.err=AI_ERR[e&&e.code]||AI_ERR.upstream_error;if(e&&['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'].includes(e.code))AI.sample=null}
  }finally{AI.ctl=null}
  renderSA();
};
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
const _saApply6=saApply;
saApply=function(){const had=AI.res&&AI.res.options[AI.chosen];const r=_saApply6.apply(this,arguments);if(had&&!AI.res)saClearImgs();return r};

