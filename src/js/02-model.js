// =========================================================
// MODEL — pure functions on a project object
// =========================================================
const SCHEMA=1;
function blankProject({name='My app',description='',platforms=['Android'],withHome=true}={}){
  const p={schema:SCHEMA,format:'flowmate-project',id:uid('prj'),name,description,platforms,createdAt:Date.now(),updatedAt:Date.now(),rev:0,
    roles:[{id:'role_guest',name:'Guest'},{id:'role_user',name:'Signed-in user'}],modules:{},entities:{},connections:{},startPageId:null};
  if(withHome){const m=addModule(p,'Main');const h=addEntity(p,'page',{name:'Home',pageType:'Home / dashboard',moduleId:m.id,x:0,y:0});p.startPageId=h.id;}
  return p;
}
function addModule(p,name,colour){const id=uid('mod');const n=Object.keys(p.modules).length;const m={id,name,colour:colour||MOD_COLOURS[n%MOD_COLOURS.length],order:n};p.modules[id]=m;return m}
function addEntity(p,kind,props={}){
  const id=props.id||uid(kind.slice(0,3));
  const e=Object.assign({id,kind,name:KINDS[kind].label,desc:'',status:'New',moduleId:null,parentId:null,x:0,y:0,collapsed:false,view:'structure',roles:[],notes:''},
    kind==='page'?{pageType:'Custom',elements:[]}:{},
    kind==='function'?{trigger:'',steps:'',success:'',error:''}:{},
    kind==='setting'?{key:'',valueType:'On / off',defaultValue:'On',scope:'Whole app'}:{},
    kind==='data'?{fields:''}:{},
    props,{id,kind});
  p.entities[id]=e;return e;
}
function addElement(p,pageId,props={}){const pg=p.entities[pageId];if(!pg||pg.kind!=='page')throw new Error('Not a page');const el=Object.assign({id:uid('el'),label:'New button',type:'button'},props);pg.elements.push(el);return el}
function addConn(p,from,to,type,label=''){
  if(!p.entities[from.entity]||!p.entities[to])throw new Error('Missing end');
  const c={id:uid('con'),from:{entity:from.entity,element:from.element||null},to,type:type||defaultType(p,from.entity,to),label,condition:''};
  p.connections[c.id]=c;return c;
}
function defaultType(p,fromId,toId){
  const a=p.entities[fromId],b=p.entities[toId];if(!b)return 'navigate';
  if(b.kind==='page')return a&&a.kind!=='page'?'navigate':(/modal|sheet/i.test(b.pageType)?'modal':'navigate');
  if(b.kind==='function')return 'trigger';
  if(b.kind==='decision')return a&&a.kind==='decision'?'condition':'trigger';
  if(b.kind==='setting')return a&&a.kind==='page'?'setting':'reference';
  if(b.kind==='data')return a&&a.kind==='function'?'write':'read';
  return 'reference';
}
function outConns(p,id,elId){return Object.values(p.connections).filter(c=>c.from.entity===id&&(elId===undefined||(c.from.element||null)===(elId||null)))}
function inConns(p,id){return Object.values(p.connections).filter(c=>c.to===id)}
function removeConnsWhere(p,fn){for(const c of Object.values(p.connections))if(fn(c))delete p.connections[c.id]}
function removeEntity(p,id){
  const e=p.entities[id];if(!e)return;
  removeConnsWhere(p,c=>c.from.entity===id||c.to===id);
  for(const o of Object.values(p.entities))if(o.parentId===id)o.parentId=e.parentId||null;
  if(p.startPageId===id)p.startPageId=null;
  delete p.entities[id];
}
function removeElement(p,pageId,elId){const pg=p.entities[pageId];pg.elements=pg.elements.filter(x=>x.id!==elId);removeConnsWhere(p,c=>c.from.entity===pageId&&c.from.element===elId)}
function findElement(p,pageId,elId){const pg=p.entities[pageId];return pg&&pg.elements?pg.elements.find(x=>x.id===elId):null}
function descendants(p,id){const kids={};for(const e of Object.values(p.entities))if(e.parentId)(kids[e.parentId]=kids[e.parentId]||[]).push(e.id);const out=new Set();const st=[...(kids[id]||[])];while(st.length){const k=st.pop();if(out.has(k)||k===id)continue;out.add(k);st.push(...(kids[k]||[]))}return out}
function entityLabel(p,id){const e=p.entities[id];return e?e.name:'(missing)'}
function connFromLabel(p,c){const e=p.entities[c.from.entity];if(!e)return '(missing)';if(c.from.element){const el=findElement(p,e.id,c.from.element);return e.name+' › '+(el?el.label:'(missing button)')}return e.name}

/* Branch a new page (or other card) from a button or card. Creates the entity + a typed connection. */
function branchNew(p,from,kind,props={}){
  const src=p.entities[from.entity];
  const el=from.element?findElement(p,src.id,from.element):null;
  const name=props.name||(el?el.label:(kind==='page'?'New page':KINDS[kind].label));
  const e=addEntity(p,kind,Object.assign({name,moduleId:src.moduleId,parentId:src.id,x:src.x+380,y:src.y+(el?src.elements.indexOf(el)*46:0)},kind==='page'?{pageType:'Custom'}:{},props));
  nudgeFree(p,e);
  if(src.sx!=null&&kind==='page'&&typeof DEVICES!=='undefined'){e.sx=src.sx+(DEVICES[S.prefs.device]||DEVICES.phone).w+220;e.sy=src.sy+(el?src.elements.indexOf(el)*70:0)}
  const c=addConn(p,from,e.id);
  return {entity:e,conn:c};
}
function estSize(e){if(e.kind==='decision')return{w:190,h:190};return{w:268,h:e.kind==='page'?(e.view==='screen'?200:104+46*(e.elements||[]).length):130}}
function nudgeFree(p,e){
  const box=x=>{const s=estSize(x);return{x:x.x,y:x.y,w:s.w,h:s.h}};
  let tries=0;const hit=()=>Object.values(p.entities).some(o=>{if(o.id===e.id)return false;const a=box(e),b=box(o);return a.x<b.x+b.w+20&&a.x+a.w+20>b.x&&a.y<b.y+b.h+20&&a.y+a.h+20>b.y});
  while(hit()&&tries++<60)e.y+=60;
}

/* Tidy-up layout: columns by how many taps from the start page, rows grouped by module. */
function autoLayout(){}

/* Checks: problems and things worth a look. Never fixes anything by itself. */
function checkProject(p){
  const iss=[];const add=(sev,msg,ref,fix)=>iss.push({sev,msg,ref,fix});
  const hasIn={};for(const c of Object.values(p.connections))hasIn[c.to]=true;
  for(const c of Object.values(p.connections)){
    if(!p.entities[c.from.entity]||!p.entities[c.to])add('problem','A link points to something that no longer exists.',{t:'conn',id:c.id},'remove-conn');
    else if(c.from.element&&!findElement(p,c.from.entity,c.from.element))add('problem','A link starts from a button that was removed.',{t:'conn',id:c.id},'remove-conn');
  }
  for(const e of Object.values(p.entities)){
    if(e.kind==='page'){
      for(const el of e.elements){if(EL_TYPES[el.type]?.act&&!outConns(p,e.id,el.id).length)add('problem',`“${el.label}” on ${e.name} doesn't do anything yet.`,{t:'element',id:e.id,el:el.id},'link-el')}
      if(!hasIn[e.id]&&p.startPageId!==e.id)add('problem',`Nobody can reach “${e.name}”. No button or link opens it.`,{t:'entity',id:e.id})
      if(!outConns(p,e.id).length&&!/modal|sheet/i.test(e.pageType))add('check',`“${e.name}” has no way out. Add a back or home button?`,{t:'entity',id:e.id})
    }
    if(e.kind==='function'&&!hasIn[e.id])add('check',`Nothing runs the function “${e.name}”.`,{t:'entity',id:e.id})
    if(e.kind==='function'&&!(e.steps||'').trim())add('check',`“${e.name}” has no steps written yet.`,{t:'entity',id:e.id})
    if(e.kind==='decision'&&outConns(p,e.id).filter(c=>c.type!=='reference').length<2)add('problem',`Decision “${e.name}” needs at least two answers (like Yes and No).`,{t:'entity',id:e.id})
    if(e.kind==='setting'&&!hasIn[e.id]&&!outConns(p,e.id).length)add('check',`Setting “${e.key||e.name}” isn't used anywhere.`,{t:'entity',id:e.id})
    if(e.parentId&&!p.entities[e.parentId])add('check',`“${e.name}” belongs to a branch that was deleted.`,{t:'entity',id:e.id})
  }
  if(!p.startPageId||!p.entities[p.startPageId])add('check','No start page is set. Pick one in App details.',null);
  return iss;
}

/* Trace: follow links forwards (what happens next) or backwards (what leads here). */
function trace(p,start,dir='fwd'){
  const ents=new Set(),conns=new Set(),order=[];const q=[];
  if(dir==='fwd'){
    const first=start.el?outConns(p,start.id,start.el):outConns(p,start.id);
    ents.add(start.id);order.push(start.el?connFromLabel(p,{from:{entity:start.id,element:start.el}}):entityLabel(p,start.id));
    for(const c of first){conns.add(c.id);if(!ents.has(c.to)){ents.add(c.to);order.push(entityLabel(p,c.to));q.push(c.to)}}
    while(q.length){const id=q.shift();const e=p.entities[id];if(!e)continue;
      for(const c of outConns(p,id)){if(e.kind==='page'&&c.from.element&&!start.deep)continue;conns.add(c.id);if(!ents.has(c.to)&&p.entities[c.to]){ents.add(c.to);order.push(entityLabel(p,c.to));q.push(c.to)}}}
  }else{
    ents.add(start.id);order.push(entityLabel(p,start.id));q.push(start.id);
    while(q.length){const id=q.shift();for(const c of inConns(p,id)){conns.add(c.id);const s=c.from.entity;if(!ents.has(s)&&p.entities[s]){ents.add(s);order.push(connFromLabel(p,c));if(p.entities[s].kind!=='page')q.push(s)}}}
  }
  return {ents,conns,order,dir,start};
}

// ---------- Exports ----------
function exportJSON(p){const o=clone(p);o.format='flowmate-project';o.schema=SCHEMA;o.exportedAt=new Date().toISOString();return JSON.stringify(o,null,2)}
function importJSON(text){
  let o;try{o=JSON.parse(text)}catch(e){throw new Error("This file isn't valid JSON.")}
  if(!o||typeof o!=='object'||!o.entities||!o.connections)throw new Error("This doesn't look like a FlowMate project file.");
  if((o.schema||1)>SCHEMA)throw new Error('This project was made with a newer FlowMate.');
  o.schema=SCHEMA;o.modules=o.modules||{};o.roles=o.roles||[];o.name=o.name||'Imported project';
  for(const e of Object.values(o.entities)){if(!KINDS[e.kind])throw new Error(`Unknown card type “${e.kind}”.`);if(e.kind==='page')e.elements=e.elements||[];e.x=+e.x||0;e.y=+e.y||0}
  delete o.exportedAt;return o;
}
function toMermaid(p){
  const id=s=>s.replace(/[^A-Za-z0-9_]/g,'_');const q=s=>String(s).replace(/"/g,"'");
  const shape={page:['["','"]'],function:['("','")'],decision:['{"','"}'],setting:['[["','"]]'],data:['[("','")]'],component:['[/"','"/]']};
  let out='flowchart LR\n';
  const byMod={};for(const e of Object.values(p.entities))(byMod[e.moduleId||'none']=byMod[e.moduleId||'none']||[]).push(e);
  for(const[m,list] of Object.entries(byMod)){const mod=p.modules[m];if(mod)out+=`  subgraph ${id(m)}["${q(mod.name)}"]\n`;for(const e of list){const[a,b]=shape[e.kind];out+=`    ${id(e.id)}${a}${q(e.name)}${b}\n`}if(mod)out+='  end\n'}
  for(const c of Object.values(p.connections)){if(!p.entities[c.from.entity]||!p.entities[c.to])continue;const el=c.from.element?findElement(p,c.from.entity,c.from.element):null;const lab=[el&&el.label,c.label].filter(Boolean).join(': ');const arrow=c.type==='reference'||c.type==='read'?'-.->':'-->';out+=`  ${id(c.from.entity)} ${arrow}${lab?`|"${q(lab)}"|`:''} ${id(c.to)}\n`}
  return out;
}
function toCSV(p){
  const cell=v=>{v=String(v??'');return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const rows=[['ID','Kind','Name','Module','Status','Type','On page','Goes to','Link type']];
  for(const e of Object.values(p.entities)){
    const mod=p.modules[e.moduleId]?.name||'';
    rows.push([e.id,KINDS[e.kind].label,e.name,mod,e.status,e.pageType||e.valueType||'', '', outConns(p,e.id).filter(c=>!c.from.element).map(c=>entityLabel(p,c.to)).join('; '),'']);
    if(e.kind==='page')for(const el of e.elements){const cs=outConns(p,e.id,el.id);rows.push([el.id,'Element',el.label,mod,'',EL_TYPES[el.type]?.label||el.type,e.name,cs.map(c=>entityLabel(p,c.to)).join('; '),cs.map(c=>CONN[c.type]?.label).join('; ')])}
  }
  return rows.map(r=>r.map(cell).join(',')).join('\n');
}

// ---------- LandlordMate example ----------
function seedLandlord(){
  const p=blankProject({name:'LandlordMate',description:'Example project: a small landlord and tenant app for 1–3 rentals. Everything here is editable. It shows how FlowMate maps pages, buttons, functions, decisions, settings and data.',platforms:['Android','Web'],withHome:false});
  p.roles=[{id:'role_guest',name:'Guest'},{id:'role_tenant',name:'Tenant'},{id:'role_landlord',name:'Landlord'},{id:'role_admin',name:'Administrator'}];
  const M={};[['home','Home','coral'],['property','Property','gold'],['room','Room','oak'],['messages','Messages','rose'],['settings','Settings','sage'],['shared','Shared','clay']].forEach(([k,n,c],i)=>{const id='mod_'+k;p.modules[id]={id,name:n,colour:c,order:i};M[k]=id});
  const P=(k,name,mod,type,els,extra={})=>{const id='pg_'+k;addEntity(p,'page',Object.assign({id,name,moduleId:M[mod],pageType:type,status:'Planned',elements:els.map((e,i)=>({id:id+'_e'+i,label:e[0],type:e[1]}))},extra));return id};
  const E=(kind,k,name,mod,extra={})=>{const id=kind.slice(0,3)+'_'+k;addEntity(p,kind,Object.assign({id,name,moduleId:M[mod],status:'Planned'},extra));return id};
  const home=P('home','Home','home','Home / dashboard',[['My properties','button'],['Report issue','button'],['Messages','tab'],['My account','tab']],{status:'Done',roles:['role_tenant','role_landlord'],desc:'First screen after opening the app.'});
  const props=P('props','My properties','property','List',[['Property card','listitem'],['Add property','button']],{status:'Done',roles:['role_landlord']});
  const prop=P('prop','Property','property','Detail',[['Overview','section'],['Rooms','tab'],['Maintenance','tab'],['Documents','tab']],{status:'In progress',desc:'Everything about one rental.'});
  const rooms=P('rooms','Rooms','room','List',[['Room card','listitem']]);
  const maint=P('maint','Maintenance','property','List',[['Open repair','listitem'],['New repair','button']],{status:'In progress'});
  const docs=P('docs','Documents','property','List',[['Lease and bond papers','section'],['Upload document','button']],{status:'Idea'});
  const room=P('room','Room','room','Detail',[['Room information','section'],['Photos & condition','button'],['Report damage','button'],['Repairs','button'],['Room notes','input']],{status:'Review'});
  const cond=P('cond','Photos & condition','room','Media gallery',[['Upload photo','button'],['Save record','button']],{status:'Review'});
  const damage=P('damage','Report damage','room','Form',[['Describe the damage','input'],['Attach photos','button'],['Submit','button']],{roles:['role_tenant']});
  const repairs=P('repairs','Repairs','room','List',[['Repair status','dropdown'],['Update status','button']]);
  const report=P('report','Report issue','home','Form',[['Pick property','dropdown'],['Describe the issue','input'],['Submit','button']],{roles:['role_tenant']});
  const msgs=P('msgs','Messages','messages','Messaging',[['All messages','section'],['Tenant conversation','listitem'],['Notifications','tab']],{status:'New'});
  const thread=P('thread','Conversation','messages','Messaging',[['Message box','input'],['Send','button']],{status:'New'});
  const notifs=P('notifs','Notifications','messages','List',[['Notification','listitem']],{status:'New'});
  const account=P('account','My account','settings','Settings',[['Profile','button'],['App settings','button'],['Sign out','button']],{status:'In progress'});
  const profile=P('profile','Profile','settings','Profile',[['Name and phone','input'],['Save changes','button']],{status:'Review'});
  const appset=P('appset','App settings','settings','Settings',[['Tenant messaging','toggle'],['Notification sounds','toggle'],['Appearance','section']],{status:'In progress',roles:['role_landlord','role_admin']});
  const done=P('done','All done','shared','Confirmation',[['Back to home','button']],{status:'Done'});
  const oops=P('oops','Something went wrong','shared','Error',[['Try again','button']],{status:'Planned'});
  const fAdd=E('function','addprop','Save new property','property',{trigger:'Add property button',steps:'Check the address is filled in\nCreate the property record\nOpen the new property',success:'Show the new property',error:'Show what needs fixing'});
  const fUp=E('function','upload','Upload photo','room',{trigger:'Upload photo or Attach photos',steps:'Pick from camera or gallery\nShrink the photo\nSave it to the room record',success:'Photo shows in the gallery',error:'Photo too big or no connection'});
  const fRec=E('function','saverecord','Save condition record','room',{steps:'Save the date, photos and notes\nLock the record so it can be used as evidence',success:'Show confirmation'});
  const fSub=E('function','submit','Submit repair request','room',{trigger:'Submit on Report damage or Report issue',steps:'Check a description is filled in\nCreate the repair record\nNotify the landlord\nShow confirmation',success:'All done page',error:'Something went wrong page'});
  const fNot=E('function','notify','Notify landlord','messages',{steps:'Check the notification sound setting\nSend a push notification'});
  const fStat=E('function','status','Update repair status','room',{steps:'Save the new status\nNotify the other person'});
  const fSend=E('function','send','Send message','messages',{steps:'Save the message\nShow it in the conversation'});
  const fProf=E('function','saveprofile','Save profile','settings',{steps:'Validate the form\nUpdate the profile record\nRefresh pages that show the name\nShow confirmation',status:'Review'});
  const dMsg=E('decision','canmsg','Is tenant messaging allowed?','messages',{});
  const sMsg=E('setting','msg','Allow tenant messaging','settings',{key:'allowTenantMessaging',valueType:'On / off',defaultValue:'On',scope:'Whole app',desc:'Lets tenants start conversations with the landlord.'});
  const sSnd=E('setting','sound','Notification sounds','settings',{key:'notificationSounds',valueType:'On / off',defaultValue:'On',scope:'Whole app'});
  const dProp=E('data','property','Property','property',{fields:'address: text\nrent: money\npaidUpTo: date\nleaseEnds: date'});
  const dRep=E('data','repair','Repair request','room',{fields:'room: Room\ndescription: text\nphotos: list of Photo\nstatus: New / Booked / Fixed'});
  const dPhoto=E('data','photo','Room photo','room',{fields:'image: file\ntakenOn: date\nnote: text'});
  const dMsgD=E('data','message','Message','messages',{fields:'from: user\nto: user\ntext: text\nsentAt: date and time'});
  const L=(from,i,to,type,label='')=>addConn(p,{entity:from,element:i==null?null:from+'_e'+i},to,type,label);
  L(home,0,props,'navigate');L(home,1,report,'navigate');L(home,2,msgs,'navigate');L(home,3,account,'navigate');
  L(props,0,prop,'navigate');L(props,1,fAdd,'trigger');L(fAdd,null,dProp,'write');L(fAdd,null,prop,'navigate','Success');
  L(prop,1,rooms,'navigate');L(prop,2,maint,'navigate');L(prop,3,docs,'navigate');
  L(rooms,0,room,'navigate');L(maint,0,repairs,'navigate');L(maint,1,report,'navigate');
  L(room,1,cond,'navigate');L(room,2,damage,'navigate');L(room,3,repairs,'navigate');
  L(cond,0,fUp,'trigger');L(cond,1,fRec,'trigger');L(fUp,null,dPhoto,'write');L(fUp,null,oops,'error','Failed');
  L(fRec,null,dPhoto,'write');L(fRec,null,done,'navigate','Success');
  L(damage,1,fUp,'trigger');L(damage,2,fSub,'trigger');L(report,2,fSub,'trigger');
  L(fSub,null,dRep,'write');L(fSub,null,fNot,'notify');L(fSub,null,done,'navigate','Success');L(fSub,null,oops,'error','Failed');
  L(fNot,null,sSnd,'reference','Checks');
  L(repairs,1,fStat,'trigger');L(fStat,null,dRep,'write');L(fStat,null,fNot,'notify');
  L(msgs,1,thread,'navigate');L(msgs,2,notifs,'navigate');L(notifs,0,thread,'navigate');
  L(thread,1,dMsg,'trigger');L(dMsg,null,sMsg,'reference','Reads');L(dMsg,null,fSend,'condition','Yes');L(dMsg,null,oops,'condition','No');L(fSend,null,dMsgD,'write');
  L(account,0,profile,'navigate');L(account,1,appset,'navigate');L(account,2,home,'navigate');
  L(profile,1,fProf,'trigger');L(fProf,null,done,'navigate','Success');L(fProf,null,oops,'error','Failed');
  L(appset,0,sMsg,'setting');L(appset,1,sSnd,'setting');
  L(done,0,home,'navigate');L(oops,0,home,'back','Return');
  p.startPageId=home;
  autoLayout(p);
  return p;
}

