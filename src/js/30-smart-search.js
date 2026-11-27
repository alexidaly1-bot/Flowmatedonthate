// =========================================================
// SMART SEARCH (plain-English questions, filters, saved searches)
// =========================================================
const SR={q:'',kind:'',status:'',role:'',mod:''};
function smartSearch(p,q,f){
  const t=q.trim().toLowerCase();const out=[];const push=(r,why)=>out.push(Object.assign(r,{why}));let intent='';
  const pg=pages(p);
  if(/(don'?t|do not|doesn'?t|does not) do anything|go(es)? nowhere|not (linked|connected)|unconnected|dead/.test(t)){intent='Buttons that don\'t do anything yet';for(const e of pg)for(const el of e.elements)if(EL_TYPES[el.type]&&EL_TYPES[el.type].act&&!outConns(p,e.id,el.id).length)push({t:'element',id:e.id,el:el.id,name:el.label,sub:e.name},'Not linked')}
  else if(/(can|could) .*\b(access|see|open|use)\b|\baccess\b/.test(t)&&p.roles.some(r=>t.includes(normL(r.name).split(' ')[0]))){const r=p.roles.find(r=>t.includes(normL(r.name).split(' ')[0]));intent=`Everything ${r.name} can open`;for(const e of pg)if(!e.roles.length||e.roles.includes(r.id))push({t:'entity',id:e.id,name:e.name,sub:e.pageType},e.roles.length?'Allowed for '+r.name:'Open to everyone')}
  else if(/setting/.test(t)&&byKindP(p,'setting').some(s=>t.includes(normL(s.name))||(s.key&&t.includes(s.key.toLowerCase())))){const s=byKindP(p,'setting').find(s=>t.includes(normL(s.name))||(s.key&&t.includes(s.key.toLowerCase())));intent=`What uses ${s.name}`;const R=impactOf(p,s.id);for(const id of [...R.pages,...R.functions,...R.decisions])push({t:'entity',id,name:entityLabel(p,id),sub:KINDS[p.entities[id].kind].label},'Uses it')}
  else if(/where (does|do|is|are)? ?(the app )?(store|save|keep|stored|saved|kept)/.test(t)){const words=t.split(/\s+/).filter(w=>w.length>3);intent='Where data is kept';for(const d of byKindP(p,'data')){const hit=words.some(w=>normL(d.name+' '+(d.fields||'')).includes(w.replace(/s$/,'')));if(hit||words.length<3){push({t:'entity',id:d.id,name:d.name,sub:d.storage||'Storage not set'},'Data');for(const c of inConns(p,d.id))push({t:'entity',id:c.from.entity,name:entityLabel(p,c.from.entity),sub:'saves to '+d.name},'Writes it')}}}
  else if(/#[0-9a-f]{3,6}\b/.test(t)){const hx=CL.norm(t.match(/#[0-9a-f]{3,6}\b/)[0]);intent='Where '+hx+' is used';for(const[sc,l] of allLookScopes(p))if(lookColours(l).has(hx))push(sc.startsWith('ent:')?{t:'entity',id:sc.slice(4),name:entityLabel(p,sc.slice(4)),sub:'Colours'}:{t:'none',name:scopeLabel(p,sc==='app:'?'app:':sc),sub:'Colours'},'Uses it')}
  else if(/\berror/.test(t)&&!f.kind){intent='Error paths';for(const c of Object.values(p.connections))if(c.type==='error')push({t:'entity',id:c.from.entity,name:connFromLabel(p,c),sub:'→ '+entityLabel(p,c.to)},'Error path');for(const e of pg)if(e.pageType==='Error')push({t:'entity',id:e.id,name:e.name,sub:'Error page'},'Page')}
  if(!intent){const st=allStatuses(p).find(s=>t===s.toLowerCase());if(st){intent='Status: '+st;f=Object.assign({},f,{status:st})}}
  if(!intent){const words=t.split(/\s+/).filter(Boolean);
    for(const e of Object.values(p.entities)){const hay=normL([e.name,e.desc,e.notes,e.steps,e.key,e.why,e.rules,e.decisions].join(' '));if(!words.length||words.every(w=>hay.includes(w)))push({t:'entity',id:e.id,name:e.name,sub:KINDS[e.kind].label+(e.kind==='page'?' · '+e.pageType:'')},'');
      if(e.elements)for(const el of e.elements)if(words.length&&words.every(w=>normL(el.label).includes(w)))push({t:'element',id:e.id,el:el.id,name:el.label,sub:e.name},'Part')}}
  const ent=r=>r.id&&p.entities[r.id];
  const res=out.filter(r=>{const e=ent(r);if(!e)return r.t==='none';if(f.kind&&e.kind!==f.kind)return false;if(f.status&&e.status!==f.status)return false;if(f.mod&&e.moduleId!==f.mod)return false;if(f.role&&e.kind==='page'&&e.roles.length&&!e.roles.includes(f.role))return false;return true});
  const seen=new Set();return {intent,res:res.filter(r=>{const k=r.t+r.id+(r.el||'')+r.name;if(seen.has(k))return false;seen.add(k);return true}).slice(0,200)};
}
function findHTML(p){
  const {intent,res}=SR.q||SR.kind||SR.status||SR.role||SR.mod?smartSearch(p,SR.q,SR):{intent:'',res:[]};
  const sel=(id,v,opts,lab)=>`<label class="sr" for="${id}">${lab}</label><select id="${id}" class="inp small" data-sr="${id.slice(3)}">${opt('',v,lab+': any')}${opts.map(([k,l])=>opt(k,v,l)).join('')}</select>`;
  return `<div class="field"><label for="sr-q">Ask a question or type a word</label><input id="sr-q" class="inp big" type="search" value="${esc(SR.q)}" placeholder="e.g. buttons that don't do anything"></div>
  <div class="ex-q">${['buttons that don\'t do anything','what can '+(p.roles[0]?p.roles[0].name.toLowerCase():'guest')+' access',byKindP(p,'setting')[0]?'which pages use the '+byKindP(p,'setting')[0].name.toLowerCase()+' setting':'','where does the app store photos','error'].filter(Boolean).map(x=>`<button class="chip-btn" data-sr-ex="${esc(x)}">${esc(x)}</button>`).join('')}</div>
  <div class="row-in filters">${sel('sr-kind',SR.kind,Object.entries(KINDS).map(([k,v])=>[k,v.label]),'Kind')}${sel('sr-status',SR.status,allStatuses(p).map(s=>[s,s]),'Status')}${sel('sr-role',SR.role,p.roles.map(r=>[r.id,r.name]),'Role')}${sel('sr-mod',SR.mod,Object.values(p.modules).map(m=>[m.id,m.name]),'Module')}</div>
  ${intent?`<p class="help"><b>${esc(intent)}</b></p>`:''}
  ${SR.q||SR.kind||SR.status||SR.role||SR.mod?`<p class="help">${res.length} result${res.length===1?'':'s'} · <button class="linkish" data-act="sr-save">Save this search</button></p><div class="list">${res.map((r,i)=>`<button class="li" data-act="sr-go" data-i="${i}"><span class="grow">${esc(r.name)}<small>${esc(r.sub||'')}${r.why?' · '+esc(r.why):''}</small></span></button>`).join('')}</div>`:''}
  <div class="mod-h">Saved searches <span class="count">${p.savedSearches.length}</span></div><div class="list">${p.savedSearches.map((s,i)=>`<div class="li"><button class="grow linkish" data-act="sr-load" data-i="${i}">${esc(s.name)}</button><button class="mini" data-act="sr-del" data-i="${i}" aria-label="Remove saved search">${icon('trash')}</button></div>`).join('')||'<p class="help">None yet.</p>'}</div>`;
}
document.addEventListener('input',ev=>{if(ev.target.id==='sr-q'){SR.q=ev.target.value;clearTimeout(SR.t);SR.t=setTimeout(()=>rerenderPanelKeep('#sr-q'),250)}});
document.addEventListener('change',ev=>{const k=ev.target.dataset&&ev.target.dataset.sr;if(k){SR[k]=ev.target.value;rerenderPanelKeep()}});
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-sr-ex]');if(b){SR.q=b.dataset.srEx;rerenderPanelKeep('#sr-q')}});
Object.assign(ACT,{
  'sr-go':d=>{const {res}=smartSearch(S.p,SR.q,SR);const r=res[+d.i];if(!r||r.t==='none')return;select(r.t==='element'?{t:'element',id:r.id,el:r.el,scroll:true}:{t:'entity',id:r.id},{centre:true});if(window.innerWidth<=760){S.panel=null;renderPanel()}},
  'sr-save':()=>openModal({title:'Save search',ic:'search',body:`<div class="field"><label for="ss-n">Name</label><input id="ss-n" class="inp" value="${esc(SR.q||'My search')}"></div>`,actions:[{label:'Cancel',run:closeModal},{label:'Save',primary:true,run:()=>{const n=$('#ss-n').value.trim()||'Search';closeModal();commit('Save search',p=>{p.savedSearches.push({name:n,q:SR.q,kind:SR.kind,status:SR.status,role:SR.role,mod:SR.mod})})}}]}),
  'sr-load':d=>{Object.assign(SR,S.p.savedSearches[+d.i]);rerenderPanelKeep()},
  'sr-del':d=>commit('Remove saved search',p=>{p.savedSearches.splice(+d.i,1)}),
});

