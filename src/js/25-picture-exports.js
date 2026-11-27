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

