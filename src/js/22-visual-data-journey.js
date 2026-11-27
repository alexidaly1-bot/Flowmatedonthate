// =========================================================
// VISUAL DATA JOURNEY
// =========================================================
function dataJourneyModal(id){
  const p=S.p,d=p.entities[id];const writers=[],readers=[];
  for(const c of Object.values(p.connections)){if(c.to===id){const f=p.entities[c.from.entity];if(f)(c.type==='read'?readers:writers).push(f)}if(c.from.entity===id){const t=p.entities[c.to];if(t)readers.push(t)}}
  const origin=[...new Set(writers.flatMap(f=>f.kind==='page'?[f.name]:inConns(p,f.id).map(c=>connFromLabel(p,c))))];
  const shown=[...new Set(readers.flatMap(f=>f.kind==='page'?[f.name]:inConns(p,f.id).map(c=>p.entities[c.from.entity]).filter(x=>x&&x.kind==='page').map(x=>x.name).concat(outConns(p,f.id).map(c=>p.entities[c.to]).filter(x=>x&&x.kind==='page').map(x=>x.name))))];
  const exports=readers.filter(f=>/export|report|pdf|share|download/i.test(f.name+' '+(f.steps||''))).map(f=>f.name);
  const fails=writers.filter(f=>f.kind==='function').map(f=>f.error?`${f.name}: ${f.error}`:`${f.name}: not defined`);
  const box=(t,items,cls='')=>`<div class="dj-step ${cls}"><b>${t}</b>${items.length?items.map(x=>`<span>${esc(x)}</span>`).join(''):'<span class="muted">Nothing yet</span>'}</div>`;
  openModal({title:'Data journey',sub:d.name,ic:'flow',wide:true,body:`<div class="dj">${box('Starts at',origin)}${box('Saved by',[...new Set(writers.map(f=>f.name))])}${box('Stored',[`${d.name}${d.storage?' · '+d.storage:''}`,...(d.fields||'').split('\n').filter(Boolean).slice(0,6)],'store')}${box('Read by',[...new Set(readers.map(f=>f.name))])}${box('Shown on',shown)}${box('Exported in',exports)}</div>
  <dl class="pp"><dt>Kind of data</dt><dd>${esc(d.stateKind||'Not set')}</dd><dt>Where it's kept</dt><dd>${esc(d.storage||'Not set')}</dd><dt>Who can see it</dt><dd>${esc(d.access||'Not set')}</dd><dt>How long it's kept</dt><dd>${esc(d.retention||'Not set')}</dd><dt>If saving fails</dt><dd>${esc(fails.join('; ')||'Nothing saves it yet')}</dd></dl>`,actions:[{label:'Show on map',icon:'trace',run:()=>{closeModal();showRadius(id)}},{label:'Close',primary:true,run:closeModal}]});
}
ACT['data-journey']=()=>{if(S.sel)dataJourneyModal(S.sel.id)};

