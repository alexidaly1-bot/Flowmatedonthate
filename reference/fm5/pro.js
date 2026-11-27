
// =========================================================
// VERSIONS, DESIGN BRANCHES, MERGING
// =========================================================
const Ver={key:id=>'fm.v.'+id};
function versionsOf(pid){try{const v=JSON.parse(Store.get(Ver.key(pid))||'[]');return Array.isArray(v)?v:[]}catch(e){return []}}
function saveVersions(pid,list){
  let l=list.slice(-30);
  for(let t=0;t<12;t++){try{Store.set(Ver.key(pid),JSON.stringify(l));if(Store.get(Ver.key(pid)))return true}catch(e){}const i=l.findIndex(v=>v.auto);if(i<0&&l.length>3)l.shift();else if(i>=0)l.splice(i,1);else break}
  toast("Not enough room on this device to keep more versions");return false;
}
function snapshotVersion(name,auto,note=''){const p=S.p;const v={id:uid('ver'),name,at:Date.now(),auto:!!auto,note,json:JSON.stringify(p)};const l=versionsOf(p.id);l.push(v);saveVersions(p.id,l);pushVersionCloud(p.id,v);return v}
async function pushVersionCloud(pid,v){if(!Cloud.db||v.json.length>240000)return;try{await Cloud.db.collection('data/users/'+Cloud.uid).doc('ver-'+v.id).set({pid,name:v.name,at:v.at,auto:v.auto,note:v.note,json:v.json})}catch(e){}}
function metricsOf(p){
  const pg=pages(p);const conns=Object.values(p.connections);const A=analyse(p);
  const depth=(()=>{if(!p.startPageId)return 0;const d={[p.startPageId]:0};const q=[p.startPageId];const de=derivedEdges(p);while(q.length){const x=q.shift();for(const e of de)if(e.from.entity===x&&d[e.to]==null){d[e.to]=d[x]+1;q.push(e.to)}}return Math.max(0,...Object.values(d))})();
  const links=pg.length?(derivedEdges(p).length/pg.length):0;const cmps=byKindP(p,'component');const uses=cmps.reduce((n,c)=>n+usersOf(p,c.id).pages.length,0);
  return [['Screens',pg.length],['Actions (links)',conns.length],['Taps to reach the deepest page',depth],['Links per page',links.toFixed(1)],['Reusable components',`${cmps.length} (used ${uses}×)`],['Accessibility issues',A.a11y.length],['Logic dependencies',conns.filter(c=>{const a=p.entities[c.from.entity],b=p.entities[c.to];return a&&b&&a.kind!=='page'&&b.kind!=='page'}).length],['Problems',checkProject(p).filter(i=>i.sev==='problem').length]];
}
function diffProjects(a,b){
  const add=[],rem=[],chg=[];
  for(const[id,e] of Object.entries(b.entities))if(!a.entities[id])add.push(e);else{const x=a.entities[id];const ks=['name','desc','status','pageType','steps','trigger','success','error','defaultValue','scope','fields','notes','moduleId','roles','elements','overrides','perms','parts','look'].filter(k=>JSON.stringify(x[k])!==JSON.stringify(e[k]));if(ks.length)chg.push({e,ks})}
  for(const[id,e] of Object.entries(a.entities))if(!b.entities[id])rem.push(e);
  const cAdd=Object.keys(b.connections).filter(k=>!a.connections[k]).length,cRem=Object.keys(a.connections).filter(k=>!b.connections[k]).length;
  return {add,rem,chg,cAdd,cRem};
}
function diffHTML(d){const li=(e,s)=>`<li>${esc(e.name)} <small>(${esc(KINDS[e.kind].label)}${s?': '+esc(s):''})</small></li>`;
  return `<div class="cmp3"><div><b>Added ${d.add.length}</b><ul>${d.add.map(e=>li(e)).join('')||'<li>None</li>'}</ul></div><div><b>Changed ${d.chg.length}</b><ul>${d.chg.map(x=>li(x.e,x.ks.join(', '))).join('')||'<li>None</li>'}</ul></div><div><b>Removed ${d.rem.length}</b><ul>${d.rem.map(e=>li(e)).join('')||'<li>None</li>'}</ul></div></div><p class="help">Links: ${d.cAdd} added, ${d.cRem} removed.</p>`}
function versionsHTML(p){
  const vs=versionsOf(p.id).slice().reverse();const branches=Object.values(S.projects).filter(q=>q.branchOf===p.id);const main=p.branchOf&&S.projects[p.branchOf];
  return `<div class="mod-h">Saved versions <span class="count">${vs.length}</span></div><div class="row-btns"><button class="btn small primary" data-act="ver-save">${icon('save')}Save a version</button></div>
  <div class="list">${vs.map(v=>`<div class="li"><span class="grow"><b>${esc(v.name)}</b><small>${ago(v.at)}${v.auto?' · automatic':''}${v.note?' · '+esc(v.note):''}</small></span><span class="col-btns"><button class="btn small" data-act="ver-cmp" data-id="${v.id}">Compare</button><button class="btn small ghost" data-act="ver-restore" data-id="${v.id}">Restore</button><button class="mini" data-act="ver-del" data-id="${v.id}" aria-label="Delete version">${icon('trash')}</button></span></div>`).join('')||'<p class="help">No versions yet. Save one before a big change.</p>'}</div>
  <div class="mod-h">Design branches</div><p class="help">A branch is a copy you can try ideas in. Compare it with the main version, then merge what you like.</p>
  ${main?`<div class="plain">This is a branch of <b>${esc(main.name)}</b>.</div><div class="row-btns"><button class="btn small" data-act="br-cmp" data-id="${main.id}">Compare with main</button><button class="btn small primary" data-act="br-merge">Merge into main…</button></div>`:`<button class="btn small" data-act="br-new">${icon('flow')}Start a branch</button>`}
  <div class="list">${branches.map(b=>`<div class="li"><span class="grow"><b>${esc(b.branchName||b.name)}</b><small>Changed ${ago(b.updatedAt)}</small></span><span class="col-btns"><button class="btn small" data-act="br-cmp" data-id="${b.id}">Compare</button><button class="btn small ghost" data-act="br-open" data-id="${b.id}">Open</button></span></div>`).join('')}</div>`;
}
Object.assign(ACT,{
  'ver-save':()=>openModal({title:'Save a version',ic:'save',body:`<div class="field"><label for="vn">Name</label><input id="vn" class="inp" value="${esc('Version '+new Date().toLocaleString('en-AU',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}))}"></div><div class="field"><label for="vnote">Note (optional)</label><input id="vnote" class="inp" placeholder="What changed"></div>`,actions:[{label:'Cancel',run:closeModal},{label:'Save',primary:true,run:()=>{const n=$('#vn').value.trim()||'Version';const no=$('#vnote').value.trim();closeModal();snapshotVersion(n,false,no);rerenderPanelKeep();toast('Version saved')}}]}),
  'ver-cmp':d=>{const v=versionsOf(S.p.id).find(x=>x.id===d.id);const a=JSON.parse(v.json);openModal({title:'Compare with now',sub:v.name,ic:'history',wide:true,body:diffHTML(diffProjects(a,S.p))+metricsTable(a,S.p,v.name,'Now'),actions:[{label:'Close',primary:true,run:closeModal}]})},
  'ver-restore':d=>{const v=versionsOf(S.p.id).find(x=>x.id===d.id);confirmModal('Restore this version?',`The map goes back to “${esc(v.name)}”. Your current map is saved as a version first, so nothing is lost.`,'Restore',()=>{snapshotVersion('Before restoring “'+v.name+'”',true);const old=JSON.parse(v.json);commit('Restore version “'+v.name+'”',p=>{for(const k of Object.keys(p))if(!['id','name','createdAt','branchOf','branchName'].includes(k))delete p[k];for(const[k,val] of Object.entries(old))if(!['id','name','createdAt','branchOf','branchName'].includes(k))p[k]=val});normalizeProject(S.p);S.sel=null;renderAll();toast('Restored')})},
  'ver-del':d=>confirmModal('Delete this version?','This can\'t be undone.','Delete',()=>{saveVersions(S.p.id,versionsOf(S.p.id).filter(x=>x.id!==d.id));rerenderPanelKeep()}),
  'br-new':()=>openModal({title:'Start a design branch',ic:'flow',body:`<div class="field"><label for="bn">Branch name</label><input id="bn" class="inp" value="Option B"></div><p class="help">FlowMate copies the whole map. The main version stays as it is.</p>`,actions:[{label:'Cancel',run:closeModal},{label:'Start branch',primary:true,run:()=>{const n=$('#bn').value.trim()||'Option B';closeModal();const b=clone(S.p);b.id=uid('prj');b.branchOf=S.p.id;b.branchName=n;b.name=S.p.name+' · '+n;b.createdAt=b.updatedAt=Date.now();b.rev=0;S.projects[b.id]=b;saveLocal(b);queueCloud(b);openProject(b.id);toast('You are now in the branch “'+n+'”')}}]}),
  'br-open':d=>openProject(d.id),
  'br-cmp':d=>{const o=S.projects[d.id];const main=S.p.branchOf===o.id?o:S.p,br=main===o?S.p:o;openModal({title:'Compare designs',ic:'flow',wide:true,body:metricsTable(main,br,'Main',br.branchName||br.name)+'<div class="mod-h">What the branch changes</div>'+diffHTML(diffProjects(main,br)),actions:[{label:'Close',primary:true,run:closeModal}]})},
  'br-merge':()=>mergeModal(),
});
function metricsTable(a,b,la,lb){const A=metricsOf(a),B=metricsOf(b);return `<table class="mt"><thead><tr><th>Measure</th><th>${esc(la)}</th><th>${esc(lb)}</th></tr></thead><tbody>${A.map((r,i)=>`<tr><td>${esc(r[0])}</td><td>${esc(String(r[1]))}</td><td>${esc(String(B[i][1]))}</td></tr>`).join('')}</tbody></table>`}
function mergeModal(){
  const br=S.p,main=S.projects[br.branchOf];if(!main)return toast('The main version is missing');const d=diffProjects(main,br);
  const row=(e,kind,on)=>`<label class="opt-line"><input type="checkbox" data-mg="${kind}" value="${e.id}"${on?' checked':''}> ${esc(e.name)} <small>(${esc(KINDS[e.kind].label)})</small></label>`;
  openModal({title:'Merge into main',sub:`${br.branchName||br.name} → ${main.name}`,ic:'flow',wide:true,body:`<p class="help">Pick what to bring across. The main version is saved as a version first.</p><div class="cmp3"><div><b>Add (${d.add.length})</b>${d.add.map(e=>row(e,'add',true)).join('')||'<p class="help">None</p>'}</div><div><b>Update (${d.chg.length})</b>${d.chg.map(x=>row(x.e,'chg',true)).join('')||'<p class="help">None</p>'}</div><div><b>Remove from main (${d.rem.length})</b>${d.rem.map(e=>row(e,'rem',false)).join('')||'<p class="help">None</p>'}</div></div>`,
    actions:[{label:'Cancel',run:closeModal},{label:'Merge',primary:true,run:()=>{const pick=k=>$$(`[data-mg="${k}"]:checked`).map(i=>i.value);const add=pick('add'),chg=pick('chg'),rem=pick('rem');closeModal();
      const cur=S.p.id;openProject(main.id);snapshotVersion('Before merging “'+(br.branchName||br.name)+'”',true);
      commit(`Merge ${add.length+chg.length+rem.length} changes from “${br.branchName||br.name}”`,p=>{for(const id of add.concat(chg))p.entities[id]=clone(br.entities[id]);for(const id of rem)removeEntity(p,id);
        for(const m of Object.values(br.modules))if(!p.modules[m.id]&&add.some(id=>br.entities[id].moduleId===m.id))p.modules[m.id]=clone(m);
        for(const r of br.roles)if(!p.roles.some(x=>x.id===r.id))p.roles.push(clone(r));
        const touched=new Set(add.concat(chg));for(const[k,c] of Object.entries(br.connections))if((touched.has(c.from.entity)||touched.has(c.to))&&p.entities[c.from.entity]&&p.entities[c.to])p.connections[k]=clone(c)});
      renderAll();toast('Merged into '+main.name)}}]});
}

// =========================================================
// PICTURE EXPORTS: SVG, PNG, JPEG, PDF
// =========================================================
function cssv(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
function exportIds(p,scope,hidden){
  let ids;const [k,id]=scope.split(':');
  if(k==='module')ids=Object.values(p.entities).filter(e=>e.moduleId===id).map(e=>e.id);
  else if(k==='page'){ids=[id];for(const c of Object.values(p.connections)){if(c.from.entity===id)ids.push(c.to);if(c.to===id)ids.push(c.from.entity)}}
  else if(k==='path'){const x=p.paths.find(q=>q.id===id);ids=x?x.steps.map(s=>s.page).concat(x.steps.map(s=>s.via).filter(Boolean)):[]}
  else if(k==='branch'){ids=[id,...descendants(p,id)]}
  else ids=Object.keys(p.entities);
  ids=[...new Set(ids)].filter(i=>p.entities[i]);
  if(!hidden){const hid=new Set();for(const e of Object.values(p.entities))if(e.collapsed)descendants(p,e.id).forEach(x=>hid.add(x));ids=ids.filter(i=>!hid.has(i))}
  return ids;
}
const svgEsc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const trunc=(s,n)=>{s=String(s||'');return s.length>n?s.slice(0,n-1)+'…':s};
function exportSVG(p,o){
  const ids=exportIds(p,o.scope||'all',o.hidden);const set=new Set(ids);const W=268,R=12,ROW=34,HEAD=62;
  const box={};for(const id of ids){const e=p.entities[id];const g=(S.prefs.view||'blocks')==='blocks'&&S.geo[id];const rows=o.detail==='simple'?0:(e.elements||[]).length;
    const h=g&&o.detail!=='simple'?g.h:HEAD+(rows?rows*ROW+10:0)+(o.notes&&e.notes?34:0);box[id]={x:e.x,y:e.y,w:W,h:Math.max(h,HEAD)}}
  if(!ids.length)return null;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const b of Object.values(box)){x0=Math.min(x0,b.x);y0=Math.min(y0,b.y);x1=Math.max(x1,b.x+b.w);y1=Math.max(y1,b.y+b.h)}
  const M=70;x0-=M;y0-=M+30;x1+=M;y1+=M;const C=k=>cssv(k)||'#888';const font=cssv('--fm-font-body')||'sans-serif';
  let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(x1-x0)}" height="${Math.round(y1-y0)}" viewBox="${x0} ${y0} ${x1-x0} ${y1-y0}" font-family='${svgEsc(font)}'>`;
  s+=`<defs>${Object.entries(FAMS).map(([f,v])=>`<marker id="m-${f}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${C(v.col)}"/></marker>`).join('')}</defs>`;
  if(o.bg)s+=`<rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="${C('--canvas')}"/>`;
  s+=`<text x="${x0+M/2}" y="${y0+40}" font-size="22" font-weight="800" fill="${C('--ink')}">${svgEsc(p.name)}</text>`;
  // module areas
  for(const m of Object.values(p.modules)){const bs=ids.filter(i=>p.entities[i].moduleId===m.id).map(i=>box[i]);if(!bs.length)continue;const a=Math.min(...bs.map(b=>b.x))-28,b2=Math.min(...bs.map(b=>b.y))-28,c=Math.max(...bs.map(b=>b.x+b.w))+28,d=Math.max(...bs.map(b=>b.y+b.h))+28;
    s+=`<rect x="${a}" y="${b2}" width="${c-a}" height="${d-b2}" rx="20" fill="${C('--m-'+m.colour)}" stroke="${C('--line')}" stroke-opacity=".5"/><text x="${a+14}" y="${b2-10}" font-size="17" font-weight="700" fill="${C('--ink')}">${svgEsc(m.name)}</text>`}
  // links
  const rowY=(id,el)=>{const e=p.entities[id];const i=(e.elements||[]).findIndex(x=>x.id===el);return i<0||o.detail==='simple'?box[id].y+31:box[id].y+HEAD+i*ROW+ROW/2+4};
  let labels='';
  if(o.arrows)for(const c of Object.values(p.connections)){if(!set.has(c.from.entity)||!set.has(c.to))continue;const fam=famOf(c.type),f=FAMS[fam];const a=box[c.from.entity],b=box[c.to];
    const xa=a.x+a.w,ya=c.from.element?rowY(c.from.entity,c.from.element):a.y+31,xb=b.x-4,yb=b.y+31;const back=xb<xa+30;const mx=back?Math.max(xa,b.x+b.w)+40:(xa+xb)/2;
    const d=back?`M${xa} ${ya} H${mx} V${yb-b.h/2-20<b.y?b.y-24:yb} H${b.x-30} V${yb} H${xb}`:`M${xa} ${ya} H${mx} V${yb} H${xb}`;
    s+=`<path d="${d}" fill="none" stroke="${C(f.col)}" stroke-width="3" ${f.dash?`stroke-dasharray="${f.dash}"`:''} ${fam==='reference'?'stroke-linecap="round"':''} marker-end="url(#m-${fam})"/>`;
    if(c.label){const lx=back?mx:mx+8,ly=yb-8;const tw=Math.min(160,c.label.length*7+18);labels+=`<g><rect x="${lx-tw/2}" y="${ly-12}" width="${tw}" height="22" rx="11" fill="${C('--card')}" stroke="${C('--line')}"/><text x="${lx}" y="${ly+3}" font-size="12" font-weight="600" text-anchor="middle" fill="${C('--ink')}">${svgEsc(trunc(c.label,22))}</text></g>`}}
  // cards
  for(const id of ids){const e=p.entities[id],b=box[id];
    s+=`<g><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${R}" fill="${C('--card')}" stroke="${C('--line')}" stroke-width="1.5"/>`;
    s+=`<text x="${b.x+16}" y="${b.y+26}" font-size="15" font-weight="700" fill="${C('--ink')}">${svgEsc(trunc(e.name,28))}</text><text x="${b.x+16}" y="${b.y+46}" font-size="12" fill="${C('--ink-2')}">${svgEsc(trunc(e.kind==='page'?e.pageType:KINDS[e.kind].label,30))}</text>`;
    if(o.status){const tw=e.status.length*7+16;s+=`<rect x="${b.x+b.w-tw-10}" y="${b.y+12}" width="${tw}" height="20" rx="10" fill="${C('--grey-bg')}" stroke="${C('--line')}" stroke-opacity=".6"/><text x="${b.x+b.w-tw/2-10}" y="${b.y+26}" font-size="11" font-weight="700" text-anchor="middle" fill="${C('--grey-ink')}">${svgEsc(e.status)}</text>`}
    if(o.detail!=='simple')(e.elements||[]).forEach((el,i)=>{const y=b.y+HEAD+i*ROW;s+=`<rect x="${b.x+10}" y="${y}" width="${b.w-20}" height="${ROW-6}" rx="8" fill="${C('--row')}" stroke="${C('--line')}" stroke-opacity=".45"/><text x="${b.x+20}" y="${y+19}" font-size="12.5" fill="${C('--ink')}">${svgEsc(trunc(el.label,32))}</text>`});
    if(o.notes&&e.notes)s+=`<text x="${b.x+16}" y="${b.y+b.h-14}" font-size="11.5" font-style="italic" fill="${C('--ink-2')}">${svgEsc(trunc(e.notes.replace(/\n/g,' '),40))}</text>`;
    s+='</g>'}
  s+=labels+'</svg>';
  return {svg:s,w:x1-x0,h:y1-y0};
}
async function rasterise(svgObj,scale,type,bg){
  const max=8000;const sc=Math.min(scale,max/svgObj.w,max/svgObj.h);const cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(svgObj.w*sc));cv.height=Math.max(1,Math.round(svgObj.h*sc));
  const ctx=cv.getContext('2d');if(type==='image/jpeg'||bg){ctx.fillStyle=cssv('--canvas')||'#fff';ctx.fillRect(0,0,cv.width,cv.height)}
  const img=new Image();await new Promise((r,j)=>{img.onload=r;img.onerror=()=>j(new Error("Couldn't draw the picture"));img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgObj.svg)});
  ctx.drawImage(img,0,0,cv.width,cv.height);return await new Promise(r=>cv.toBlob(r,type,.92));
}
function makePDF(imgs,title){
  const enc=new TextEncoder();const chunks=[];let len=0;const offs=[];const push=x=>{const b=typeof x==='string'?enc.encode(x):x;chunks.push(b);len+=b.length};
  const n=imgs.length;push('%PDF-1.4\n%âã\n');
  const obj=(i,body)=>{offs[i]=len;push(`${i} 0 obj\n`);if(typeof body==='string')push(body);else body();push('\nendobj\n')};
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,`<< /Type /Pages /Kids [${imgs.map((_,k)=>`${3+k*3} 0 R`).join(' ')}] /Count ${n} >>`);
  imgs.forEach((im,k)=>{const land=im.w>=im.h;const PW=land?842:595,PH=land?595:842,m=24;const sc=Math.min((PW-2*m)/im.w,(PH-2*m)/im.h);const dw=im.w*sc,dh=im.h*sc,dx=(PW-dw)/2,dy=(PH-dh)/2;const pi=3+k*3;
    obj(pi,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im${k} ${pi+2} 0 R >> >> /Contents ${pi+1} 0 R >>`);
    const cs=`q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${dx.toFixed(2)} ${dy.toFixed(2)} cm /Im${k} Do Q`;obj(pi+1,`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);
    obj(pi+2,()=>{push(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.jpeg.length} >>\nstream\n`);push(im.jpeg);push('\nendstream')})});
  const info=3+n*3;obj(info,`<< /Title (${String(title).replace(/[^\x20-\x7E]/g,'').replace(/[()\\]/g,'')}) /Producer (FlowMate) >>`);
  const xref=len;push(`xref\n0 ${info+1}\n0000000000 65535 f \n`+offs.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join(''));
  push(`trailer\n<< /Size ${info+1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks,{type:'application/pdf'});
}
async function jpegOf(svgObj,scale){const b=await rasterise(svgObj,scale,'image/jpeg',true);const sc=Math.min(scale,8000/svgObj.w,8000/svgObj.h);return {jpeg:new Uint8Array(await b.arrayBuffer()),w:Math.max(1,Math.round(svgObj.w*sc)),h:Math.max(1,Math.round(svgObj.h*sc))}}

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

// =========================================================
// TEAM: sharing, presence, comments, mentions, reviews
// =========================================================
const Team={db:null,user:null,room:null,me:null,peers:[],shared:[],unsub:null,lastLocal:0};
async function initTeam(){
  if(!window.claude||!window.claude.use)return;
  try{const [db,user]=await Promise.all([window.claude.use('db'),window.claude.use('user')]);Team.db=db;Team.user=user;if(user)Team.me=await user.me();
    try{Team.room=await window.claude.use('room')}catch(e){}
    if(Team.room)Team.room.onPeers(ps=>{Team.peers=ps||[];renderPeers()});
  }catch(e){}
}
function sharedDocId(p){return 'p-'+(p.sharedId||p.id)}
async function loadShared(){if(!Team.db)return [];try{const s=await Promise.race([Team.db.collection('shared').get(),new Promise((_,r)=>setTimeout(()=>r({code:'timeout'}),10000))]);Team.shared=s.docs.map(d=>Object.assign({docId:d.id},d.data())).filter(x=>x&&x.json);return Team.shared}catch(e){return []}}
async function pushShared(p){if(!Team.db||!p.shareMode)return;const json=JSON.stringify(p);if(json.length>240000)return toast('This project is too big to share live');Team.lastLocal=Date.now();
  try{await Team.db.collection('shared').doc(sharedDocId(p)).set({name:p.name,owner:p.sharedOwner||(Team.me&&Team.me.id)||null,mode:p.shareMode,updatedAt:p.updatedAt,json})}catch(e){toast(e&&e.code==='permission_denied'?'You can look at this project but not change it':'Couldn\'t save the shared copy')}}
const _touch=touch;
touch=function(){_touch();if(S.p&&S.p.shareMode){clearTimeout(Team.t);Team.t=setTimeout(()=>pushShared(S.p),1200)}};
function watchShared(p){if(Team.unsub){try{Team.unsub()}catch(e){}Team.unsub=null}if(!Team.db||!p.shareMode)return;
  try{Team.unsub=Team.db.collection('shared').doc(sharedDocId(p)).onSnapshot(d=>{const b=d&&d.data&&d.data();if(!b||!b.json)return;if(Date.now()-Team.lastLocal<2500)return;let q;try{q=JSON.parse(b.json)}catch(e){return}
    if(S.p&&S.p.id===p.id&&(q.updatedAt||0)>(S.p.updatedAt||0)){const keep={id:S.p.id,shareMode:S.p.shareMode,sharedId:S.p.sharedId,sharedOwner:S.p.sharedOwner,sharedRO:S.p.sharedRO};S.p=Object.assign(q,keep);normalizeProject(S.p);S.projects[S.p.id]=S.p;saveLocal(S.p);renderAll();toast('Updated by someone else')}})}catch(e){}}
const _op2=openProject;
openProject=function(id,fit){const r=_op2(id,fit);const p=S.projects[id];if(p){watchShared(p);if(Team.room){try{Team.room.presence({project:p.sharedId||p.id})}catch(e){}}renderPeers()}return r};
async function renderPeers(){let box=$('#peers');if(!box){const tb=$('#projName');if(!tb||!tb.parentElement)return;box=document.createElement('div');box.id='peers';box.className='peers';tb.parentElement.insertBefore(box,tb.nextSibling)}
  const pid=S.p&&(S.p.sharedId||S.p.id);const here=(Team.peers||[]).filter(x=>x&&x.presence&&x.presence.project===pid&&!x.isMe&&!(Team.me&&x.id===Team.me.id));
  if(!here.length){box.innerHTML='';return}const ids=here.map(x=>x.id).filter(Boolean);let prof={};try{prof=Team.user?await Team.user.profiles(ids):{}}catch(e){}
  box.innerHTML=here.slice(0,4).map(x=>{const pr=prof[x.id]||{};const im=document.createElement('img');return `<img src="${pr.avatarUrl&&/^(data:|\/|https:)/.test(pr.avatarUrl)?pr.avatarUrl:''}" alt="" title="${esc(pr.name||'Someone')} is here">`}).join('')+`<span class="sr">${here.length} other ${here.length===1?'person':'people'} here</span>`;
}
function commentsFor(p,ref){return (p.comments||[]).filter(c=>c.ref&&c.ref.id===ref.id&&(ref.t!=='element'||c.ref.el===ref.el))}
function commentHTML(p,c,names){return `<div class="cmt${c.resolved?' done':''}"><div class="cm-h"><b>${esc(names[c.author]||(c.author?'Someone':'You'))}</b><small>${ago(c.at)}${c.review?' · review requested':''}${c.resolved?' · resolved':''}</small></div><p>${esc(c.text)}</p><div class="row-btns">${!c.resolved?`<button class="btn small" data-act="cm-resolve" data-id="${c.id}">${c.review?'Approve and resolve':'Resolve'}</button>`:`<button class="btn small ghost" data-act="cm-reopen" data-id="${c.id}">Reopen</button>`}<button class="mini" data-act="cm-del" data-id="${c.id}" aria-label="Delete comment">${icon('trash')}</button></div></div>`}
async function resolveNames(ids){const out={};if(Team.me&&Team.me.id)out[Team.me.id]='You';const need=[...new Set(ids.filter(i=>i&&!out[i]))];if(need.length&&Team.user){try{const pr=await Team.user.profiles(need);for(const[k,v] of Object.entries(pr))out[k]=v.name||'Someone'}catch(e){}}return out}
function editorCommentsHTML(p,ref){const list=commentsFor(p,ref);return `<details class="plan"${list.some(c=>!c.resolved)?' open':''}><summary class="sec-h">Comments <span class="count">${list.filter(c=>!c.resolved).length||''}</span></summary><div id="cm-list" data-ref='${esc(JSON.stringify(ref))}'>${list.map(c=>commentHTML(p,c,{})).join('')}</div>
  <div class="field"><label for="cm-new">Add a comment</label><textarea id="cm-new" class="inp" rows="2" placeholder="Type @ to mention someone"></textarea><div id="cm-at" class="at-list" hidden></div><label class="opt-line"><input type="checkbox" id="cm-rev"> Ask for a review</label><button class="btn small" data-act="cm-add">${icon('plus')}Comment</button></div></details>`}
async function fillCommentNames(){const box=$('#cm-list');if(!box||!S.p)return;const ref=JSON.parse(box.dataset.ref);const list=commentsFor(S.p,ref);const names=await resolveNames(list.map(c=>c.author));if($('#cm-list')===box)box.innerHTML=list.map(c=>commentHTML(S.p,c,names)).join('')}
Object.assign(ACT,{
  'cm-add':()=>{const t=$('#cm-new').value.trim();if(!t)return;const ref=JSON.parse($('#cm-list').dataset.ref);const rev=$('#cm-rev').checked;const ment=(S._mentions||[]).filter(m=>t.includes('@'+m.name)).map(m=>m.id);S._mentions=[];
    commit(rev?'Ask for review':'Add comment',p=>{p.comments.push({id:uid('cm'),ref,text:t.slice(0,2000),author:(Team.me&&Team.me.id)||null,at:Date.now(),review:rev,resolved:false,mentions:ment})})},
  'cm-resolve':d=>commit('Resolve comment',p=>{const c=p.comments.find(x=>x.id===d.id);if(c){c.resolved=true;c.resolvedAt=Date.now()}}),
  'cm-reopen':d=>commit('Reopen comment',p=>{const c=p.comments.find(x=>x.id===d.id);if(c)c.resolved=false}),
  'cm-del':d=>confirmModal('Delete this comment?','You can undo this.','Delete',()=>commit('Delete comment',p=>{p.comments=p.comments.filter(x=>x.id!==d.id)})),
  'cm-go':d=>{const c=S.p.comments.find(x=>x.id===d.id);if(!c)return;select(c.ref.t==='element'?{t:'element',id:c.ref.id,el:c.ref.el,scroll:true}:{t:'entity',id:c.ref.id},{centre:true})},
  'share-on':async()=>{if(!Team.db)return toast('Sharing needs FlowMate opened inside Claude');const mode=$('#sh-mode').value;const p=S.p;commit('Share project',p=>{p.shareMode=mode;p.sharedOwner=(Team.me&&Team.me.id)||null});await pushShared(S.p);watchShared(S.p);rerenderPanelKeep();toast('Shared. People you share FlowMate with can open it.')},
  'share-mode':async d=>{commit('Change sharing',p=>{p.shareMode=d.v});await pushShared(S.p);rerenderPanelKeep()},
  'share-off':()=>confirmModal('Stop sharing?','Other people won\'t be able to open this project any more. Your own copy stays.','Stop sharing',async()=>{try{await Team.db.collection('shared').doc(sharedDocId(S.p)).delete()}catch(e){}commit('Stop sharing',p=>{delete p.shareMode;delete p.sharedOwner});watchShared(S.p);rerenderPanelKeep()}),
  'shared-refresh':async()=>{await loadShared();rerenderPanelKeep()},
  'shared-open':async d=>{const x=Team.shared.find(s=>s.docId===d.id);if(!x)return;let q;try{q=JSON.parse(x.json)}catch(e){return toast("Couldn't open that project")}
    const canW=Team.user?await Team.user.can('data.write'):null;const ro=x.mode==='view'||canW===false;const lid='sh_'+(q.sharedId||q.id);q.sharedId=q.sharedId||q.id;q.id=lid;q.shareMode=x.mode;q.sharedOwner=x.owner;q.sharedRO=ro;S.projects[lid]=q;saveLocal(q);openProject(lid);toast(ro?'Opened view only':'Opened. Your changes are shared.')},
});
document.addEventListener('input',async ev=>{const t=ev.target;if(t.id!=='cm-new'||!Team.user)return;const m=/@([\w ]{0,20})$/.exec(t.value.slice(0,t.selectionStart));const box=$('#cm-at');if(!m){box.hidden=true;return}
  const hits=await Team.user.search(m[1]);if(!hits.length){box.hidden=true;return}box.hidden=false;box.innerHTML=hits.map(h=>`<button type="button" class="li" data-at="${esc(h.id)}" data-nm="${esc(h.name)}">${esc(h.name)}</button>`).join('')});
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-at]');if(!b)return;const t=$('#cm-new');const pos=t.selectionStart;const before=t.value.slice(0,pos).replace(/@[\w ]{0,20}$/,'@'+b.dataset.nm+' ');t.value=before+t.value.slice(pos);S._mentions=(S._mentions||[]).concat([{id:b.dataset.at,name:b.dataset.nm}]);$('#cm-at').hidden=true;t.focus()});
function teamHTML(p){
  const all=p.comments||[];const open=all.filter(c=>!c.resolved);const rev=open.filter(c=>c.review);const me=Team.me&&Team.me.id;const mine=me?open.filter(c=>(c.mentions||[]).includes(me)):[];
  const refName=c=>c.ref.t==='element'?(()=>{const el=findElement(p,c.ref.id,c.ref.el);return entityLabel(p,c.ref.id)+' › '+(el?el.label:'?')})():entityLabel(p,c.ref.id);
  const cl=l=>`<div class="list">${l.map(c=>`<button class="li" data-act="cm-go" data-id="${c.id}"><span class="grow">${esc(c.text.slice(0,90))}<small>${esc(refName(c))} · ${ago(c.at)}</small></span></button>`).join('')||'<p class="help">None.</p>'}</div>`;
  let h=`<div class="mod-h">Share this project</div>`;
  if(p.sharedRO)h+=`<div class="plain">You're looking at someone else's project. You can view it but not change it.</div>`;
  else if(!Team.db)h+=`<p class="help">Sharing works when FlowMate is open inside Claude. Here you can still export a view-only copy.</p><button class="btn small" data-act="export">${icon('export')}View-only copy</button>`;
  else if(p.shareMode)h+=`<div class="plain">Shared. Others can <b>${p.shareMode==='edit'?'view and edit':'only view'}</b>. Changes sync live.</div><div class="chips" style="margin-top:8px">${[['view','View only'],['edit','Can edit']].map(([k,l])=>`<button class="${p.shareMode===k?'on':''}" aria-pressed="${p.shareMode===k}" data-act="share-mode" data-v="${k}">${l}</button>`).join('')}</div><button class="btn small" style="margin-top:8px" data-act="share-off">Stop sharing</button>`;
  else h+=`<p class="help">Put this project where people you've shared FlowMate with can open it. FlowMate can't send invites itself: use Claude's Share button to choose who gets FlowMate, and what they can do there.</p><div class="field"><label for="sh-mode">Others can</label><select id="sh-mode" class="inp">${opt('view','view','Only view')}${opt('edit','view','View and edit')}</select></div><button class="btn small primary" data-act="share-on">${icon('users')}Share this project</button>`;
  if(Team.db){const others=Team.shared.filter(x=>!(me&&x.owner===me));h+=`<div class="mod-h">Shared with you <span class="count">${others.length}</span></div><button class="btn small" data-act="shared-refresh">${icon('cloud')}Check for shared projects</button><div class="list">${others.map(x=>`<button class="li" data-act="shared-open" data-id="${esc(x.docId)}"><span class="grow">${esc(x.name||'Project')}<small>${x.mode==='edit'?'You can edit':'View only'} · ${ago(x.updatedAt)}</small></span></button>`).join('')}</div>`}
  h+=`<div class="mod-h">Review requests <span class="count">${rev.length}</span></div>${cl(rev)}${me?`<div class="mod-h">Mentions of you <span class="count">${mine.length}</span></div>${cl(mine)}`:''}<div class="mod-h">Open comments <span class="count">${open.length}</span></div>${cl(open)}<p class="help">Add comments from any card's panel. They're saved with the project and travel with it.</p>`;
  h+=`<div class="mod-h">Recent activity</div><ul class="roadmap help">${(p.activity||[]).slice(-15).reverse().map(a=>`<li>${esc(a.label)} · ${ago(a.at)}</li>`).join('')||'<li>Nothing yet</li>'}</ul>`;
  return h;
}

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
