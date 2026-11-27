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

