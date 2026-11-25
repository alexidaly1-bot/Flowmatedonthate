// =========================================================
// TEMPLATES for new projects
// =========================================================
function buildTemplate(kind,name,desc,platforms){
  const T={booking:{n:'My booking app',mods:{Browse:[['Home','Home / dashboard',['Search services','Upcoming booking','Book now']],['Service list','List',['Service card','Filter']],['Service detail','Detail',['Photos','Price','Choose a time']]],Booking:[['Pick a time','Form',['Calendar','Time slots','Continue']],['Checkout','Checkout',['Card details','Pay']],['Booking confirmed','Confirmation',['Add to calendar','Back to home']]],Account:[['Sign in','Login / registration',['Email','Password','Sign in','Forgot password']],['My bookings','List',['Booking item','Cancel booking']]]},
      links:[['Home','Book now','Service list'],['Home','Search services','Service list'],['Service list','Service card','Service detail'],['Service detail','Choose a time','Pick a time'],['Pick a time','Continue','Checkout'],['Checkout','Pay','Booking confirmed'],['Booking confirmed','Back to home','Home'],['Home','Upcoming booking','My bookings']],fn:['Take payment','Checkout','Pay','Booking confirmed']},
    shop:{n:'My shop',mods:{Shop:[['Home','Home / dashboard',['Search','Categories','Featured products']],['Product list','List',['Product card','Sort','Filter']],['Product detail','Detail',['Photos','Add to cart','Reviews']]],Cart:[['Cart','List',['Cart item','Checkout']],['Checkout','Checkout',['Address','Card details','Place order']],['Order confirmed','Confirmation',['Track order','Keep shopping']]],Account:[['Sign in','Login / registration',['Email','Password','Sign in','Forgot password']],['Orders','List',['Order item']]]},
      links:[['Home','Categories','Product list'],['Home','Featured products','Product detail'],['Product list','Product card','Product detail'],['Product detail','Add to cart','Cart'],['Cart','Checkout','Checkout'],['Checkout','Place order','Order confirmed'],['Order confirmed','Keep shopping','Home'],['Order confirmed','Track order','Orders']],fn:['Place the order','Checkout','Place order','Order confirmed']},
    social:{n:'My community app',mods:{Feed:[['Home feed','Home / dashboard',['New post','Post card','Notifications']],['Post detail','Detail',['Comments','Like','Share']],['New post','Form',['Write something','Add photo','Post']]],Messages:[['Chats','Messaging',['Chat item','New chat']],['Chat','Messaging',['Message box','Send']]],Profile:[['Profile','Profile',['Edit profile','My posts','Settings']],['Settings','Settings',['Notifications','Privacy','Sign out']]]},
      links:[['Home feed','New post','New post'],['Home feed','Post card','Post detail'],['New post','Post','Home feed'],['Chats','Chat item','Chat'],['Profile','Settings','Settings']],fn:['Publish post','New post','Post','Home feed']}}[kind];
  const p=blankProject({name:name||T.n,description:desc||'',platforms,withHome:false});const ids={};let mx=0;
  for(const[mn,list] of Object.entries(T.mods)){const m=addModule(p,mn);list.forEach(([n,pt,parts],i)=>{const e=addEntity(p,'page',{name:n,pageType:pt,moduleId:m.id,x:mx,y:i*300});e.elements=parts.map(l=>({id:uid('el'),label:l,type:/^(email|password|address|card details|write something|message box|calendar)$/i.test(l)?'input':/card|item$/i.test(l)?'listitem':'button'}));ids[n]=e});mx+=420}
  p.startPageId=Object.values(ids)[0].id;
  for(const[a,el,b] of T.links){const s=ids[a];const x=s&&s.elements.find(q=>q.label===el);if(s&&x&&ids[b])addConn(p,{entity:s.id,element:x.id},ids[b].id,'navigate')}
  const[fnN,pg,el,to]=T.fn;const src=ids[pg];const f=addEntity(p,'function',{name:fnN,moduleId:src.moduleId,x:src.x+330,y:src.y+120,trigger:'Button tap',steps:'Check the details\nSave it\nShow the confirmation',success:'Shows the confirmation page',error:'Shows what went wrong and lets them try again'});
  const x=src.elements.find(q=>q.label===el);for(const c of Object.values(p.connections))if(c.from.entity===src.id&&c.from.element===x.id)delete p.connections[c.id];addConn(p,{entity:src.id,element:x.id},f.id,'trigger');addConn(p,{entity:f.id,element:null},ids[to].id,'navigate');
  return p;
}

function cardBadges(p,e){const n=(p.comments||[]).filter(c=>!c.resolved&&c.ref&&c.ref.id===e.id).length;return (e.unverified?'<span class="cbadge uv" title="Made from a screenshot. Check it.">Unverified</span>':'')+(n?`<span class="cbadge cm" title="${n} open comment${n===1?'':'s'}">💬 ${n}</span>`:'')}
Object.assign(ACT,{unverify:()=>commit('Mark as checked',p=>{p.entities[S.sel.id].unverified=false}),
  walkthrough:()=>walkthroughModal(),'export2':()=>export2Modal()});


