// =========================================================
// LIVING DOCUMENTATION
// =========================================================
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function docsFor(p){
  const docs=[];const pg=pages(p);
  docs.push({id:'overview',title:'App overview',text:`# ${p.name}\n\n${p.description||'No description yet.'}\n\nPlatforms: ${(p.platforms||[]).join(', ')}\nRoles: ${p.roles.map(r=>r.name).join(', ')}\nModules: ${Object.values(p.modules).map(m=>m.name).join(', ')}\nPages: ${pg.length} · Functions: ${byKindP(p,'function').length} · Settings: ${byKindP(p,'setting').length} · Data: ${byKindP(p,'data').length}\nFirst page: ${entityLabel(p,p.startPageId)}`});
  for(const e of pg)docs.push({id:e.id,title:'Page: '+e.name,ref:e.id,text:`# ${e.name}\n\nType: ${e.pageType}\nModule: ${(p.modules[e.moduleId]||{}).name||'none'}\nWho can see it: ${e.roles.length?e.roles.map(r=>roleName(p,r)).join(', '):'Everyone'}\nStatus: ${e.status}\n\n${e.desc||''}\n\n## Parts\n${e.elements.map(el=>{const cs=outConns(p,e.id,el.id);return `- ${el.label} (${(EL_TYPES[el.type]||{}).label||el.type})${cs.length?' → '+cs.map(c=>entityLabel(p,c.to)).join(', '):' → nothing yet'}`}).join('\n')||'- none'}\n\n## Reached from\n${inConns(p,e.id).map(c=>'- '+connFromLabel(p,c)).join('\n')||'- nothing'}`});
  for(const f of byKindP(p,'function'))docs.push({id:f.id,title:'Function: '+f.name,ref:f.id,text:`# ${f.name}\n\nTrigger: ${f.trigger||'?'}\nKind: ${f.actionType||'?'}\nWho can run it: ${(f.perms||[]).map(r=>roleName(p,r)).join(', ')||'anyone who can reach it'}\n\n## Steps\n${(f.steps||'').split('\n').filter(Boolean).map((s,i)=>`${i+1}. ${s}`).join('\n')||'Not written'}\n\nWhen it works: ${f.success||'?'}\nWhen it fails: ${f.error||'?'}\n\n## Links\n${outConns(p,f.id).map(c=>`- ${CONN[c.type]?CONN[c.type].label:c.type} → ${entityLabel(p,c.to)}`).join('\n')||'- none'}`});
  for(const x of p.paths||[])docs.push({id:x.id,title:'Journey: '+x.name,text:`# ${x.name}\n\n${x.steps.map((s,i)=>`${i+1}. ${entityLabel(p,s.page)}${s.choice?' (answer: '+s.choice+')':''}`).join('\n')}`});
  for(const d of docs){d.hash=hashStr(d.text);const r=p.docReviews[d.id];d.state=!r?'new':r.hash===d.hash?'ok':'review';d.old=r&&r.text}
  return docs;
}
function lineDiff(a,b){const A=String(a||'').split('\n'),B=b.split('\n');const add=B.filter(x=>!A.includes(x)),rem=A.filter(x=>!B.includes(x));return {add,rem}}
function docsHTML(p){const docs=docsFor(p);const n=docs.filter(d=>d.state!=='ok').length;
  return `<p class="help">These documents write themselves from your map and update as it changes. Mark one reviewed once you've checked it. If the map changes later, it shows “Needs review” with what changed.</p>
  <div class="row-btns"><button class="btn small" data-act="docs-review-all">${icon('check')}Mark all reviewed</button><button class="btn small" data-act="docs-export">${icon('download')}Download all (Markdown)</button></div>
  <div class="plain" style="margin-top:10px">${n?`<b>${n}</b> need${n===1?'s':''} a look.`:'Everything is reviewed and up to date.'}</div>
  <div class="list">${docs.map((d,i)=>`<button class="li" data-act="doc-open" data-i="${i}"><span class="grow">${esc(d.title)}<small>${d.state==='ok'?'Up to date':d.state==='new'?'Not reviewed yet':'Needs review: map changed'}</small></span><span class="chip ${d.state==='ok'?'st-done':d.state==='new'?'st-planned':'st-in-progress'}">${d.state==='ok'?'Reviewed':d.state==='new'?'New':'Review'}</span></button>`).join('')}</div>`}
Object.assign(ACT,{
  'doc-open':d=>{const p=S.p;const doc=docsFor(p)[+d.i];const df=doc.state==='review'?lineDiff(doc.old,doc.text):null;const hist=(p.activity||[]).filter(a=>doc.ref&&a.label.includes(entityLabel(p,doc.ref))).slice(-8).reverse();
    openModal({title:doc.title,sub:doc.state==='ok'?'Up to date':'Needs review',ic:'book',wide:true,body:`${df?`<div class="plain"><b>Changed since you last reviewed it</b>${df.add.map(x=>`<div class="d-add">+ ${esc(x)}</div>`).join('')}${df.rem.map(x=>`<div class="d-rem">− ${esc(x)}</div>`).join('')}</div>`:''}<pre class="out doc">${esc(doc.text)}</pre>${hist.length?`<div class="mod-h">Change history</div><ul class="roadmap help">${hist.map(a=>`<li>${esc(a.label)} · ${ago(a.at)}</li>`).join('')}</ul>`:''}`,
      actions:[{label:'Close',run:closeModal},{label:'Download',icon:'download',run:()=>download(doc.title.replace(/\W+/g,'-').toLowerCase()+'.md',doc.text)},{label:'Mark reviewed',primary:true,icon:'check',run:()=>{closeModal();commit('Review document “'+doc.title+'”',p=>{p.docReviews[doc.id]={hash:doc.hash,at:Date.now(),text:doc.text.slice(0,20000)}})}}]})},
  'docs-review-all':()=>{const docs=docsFor(S.p);commit('Mark all documents reviewed',p=>{for(const d of docs)p.docReviews[d.id]={hash:d.hash,at:Date.now(),text:d.text.slice(0,20000)}})},
  'docs-export':()=>{const p=S.p;download(`${p.name.replace(/\W+/g,'-').toLowerCase()}-docs.md`,docsFor(p).map(d=>d.text).join('\n\n---\n\n'))},
});

