// =========================================================
// PERSISTENCE — this device first, then the account (if available)
// =========================================================
function saveLocal(p){Store.set('fm.p.'+p.id,JSON.stringify(p));const idx=Object.keys(S.projects);Store.set('fm.index',JSON.stringify(idx))}
function loadLocal(){
  let idx=[];try{idx=JSON.parse(Store.get('fm.index')||'[]')}catch(e){}
  for(const id of idx){try{const p=JSON.parse(Store.get('fm.p.'+id));if(p&&p.entities)S.projects[id]=p}catch(e){}}
}
function deleteLocal(id){Store.del('fm.p.'+id);Store.del('fm.view.'+id);Store.set('fm.index',JSON.stringify(Object.keys(S.projects)))}

const Cloud={db:null,uid:null,state:'device',timers:{},writing:{},pending:{}};
function setSync(st){Cloud.state=st;renderSync()}
async function initCloud(){
  if(!window.claude||typeof window.claude.use!=='function'){setSync(Store.ok?'device':'memory');return}
  try{
    const [db,user]=await Promise.all([window.claude.use('db'),window.claude.use('user')]);
    if(!db||!user){setSync(Store.ok?'device':'memory');return}
    const id=await user.id();if(!id){setSync('device');return}
    Cloud.db=db;Cloud.uid=id;setSync('busy');
    const col=db.collection('data/users/'+id);
    const snap=await Promise.race([col.get(),new Promise((_,r)=>setTimeout(()=>r({code:'timeout'}),10000))]);
    const cloudAt={};let changed=false;
    for(const d of snap.docs){
      if(!d.id.startsWith('proj-'))continue;const b=d.data();if(!b||!b.json)continue;
      let p;try{p=JSON.parse(b.json)}catch(e){continue}
      cloudAt[p.id]=p.updatedAt||0;
      const local=S.projects[p.id];
      if(!local||(p.updatedAt||0)>(local.updatedAt||0)){S.projects[p.id]=p;saveLocal(p);changed=true;if(S.p&&S.p.id===p.id){S.p=p;S.undo=[];S.redo=[]}}
    }
    for(const p of Object.values(S.projects))if((p.updatedAt||0)>(cloudAt[p.id]||0))queueCloud(p);
    setSync('ok');
    if(changed){if(S.p)renderAll();if(!$('#home').classList.contains('hide'))renderHome()}
  }catch(e){setSync('err')}
}
function queueCloud(p){if(!Cloud.db)return;clearTimeout(Cloud.timers[p.id]);Cloud.timers[p.id]=setTimeout(()=>pushCloud(p.id),1500)}
async function pushCloud(id,retry){
  if(Cloud.writing[id]){Cloud.pending[id]=true;return}
  const p=S.projects[id];if(!p||!Cloud.db)return;
  const json=JSON.stringify(p);if(json.length>240000){setSync('big');return}
  Cloud.writing[id]=true;setSync('busy');
  try{await Cloud.db.collection('data/users/'+Cloud.uid).doc('proj-'+id).set({name:p.name,updatedAt:p.updatedAt,json});setSync('ok')}
  catch(e){if(e&&e.code==='unavailable'&&!retry){Cloud.writing[id]=false;setTimeout(()=>pushCloud(id,true),800+Math.random()*800);return}setSync(e&&e.code==='quota_exceeded'?'full':'err')}
  finally{Cloud.writing[id]=false;if(Cloud.pending[id]){Cloud.pending[id]=false;pushCloud(id)}}
}
async function deleteCloud(id){if(!Cloud.db)return;try{await Cloud.db.collection('data/users/'+Cloud.uid).doc('proj-'+id).delete()}catch(e){}}
const SYNC_TEXT={device:['','Saved on this device'],memory:['err',"Can't save on this device. Export to keep your work."],busy:['busy','Saving…'],ok:['ok','Saved to your account'],err:['err','Account sync failed. Saved on this device.'],big:['err','Too big to sync. Saved on this device.'],full:['err','Account storage full. Saved on this device.']};

