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

