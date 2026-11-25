// =========================================================
// VOICE-GUIDED WALKTHROUGH
// =========================================================
const WT={steps:[],i:0,tts:null};
const STOP=new Set('show me what happens if a an the to i my when do does how is are you they we tenant landlord user users as on in of for and or it this that there with can'.split(' '));
function findStart(p,q){
  const words=normL(q).split(/\s+/).filter(w=>w.length>2&&!STOP.has(w));const stem=w=>w.replace(/(ing|ed|es|s)$/,'');const ws=words.map(stem);
  let best=null,bs=0;const score=t=>{const tw=normL(t).split(/\s+/).filter(Boolean).map(stem);return ws.filter(w=>tw.some(x=>x.startsWith(w)||w.startsWith(x))).length};
  for(const e of pages(p)){let s=score(e.name)*.8;if(s>bs){bs=s;best={id:e.id}}for(const el of e.elements){const sc=score(el.label);const s2=sc?sc+(outConns(p,e.id,el.id).some(c=>p.entities[c.to]&&p.entities[c.to].kind!=='page')?.5:outConns(p,e.id,el.id).length?.3:0):0;if(s2>bs){bs=s2;best={id:e.id,el:el.id}}}}
  for(const f of byKindP(p,'function')){const s=score(f.name)*.9;if(s>bs){bs=s;best={id:f.id}}}
  const role=p.roles.find(r=>normL(q).includes(normL(r.name).split(' ')[0]));
  return bs>0?Object.assign(best,{role:role&&role.id}):null;
}
function walkSteps(p,start){
  const out=[];const seen=new Set();const first=p.entities[start.id];
  out.push({id:start.id,el:start.el,conn:null});seen.add(start.id);
  let q=(start.el?outConns(p,start.id,start.el):outConns(p,start.id)).map(c=>({c,depth:1}));
  let pagesSeen=0;
  while(q.length&&out.length<12){const {c,depth}=q.shift();const t=p.entities[c.to];if(!t||seen.has(t.id))continue;seen.add(t.id);out.push({id:t.id,conn:c.id,via:c});
    if(t.kind!=='page'&&depth<6)q=q.concat(outConns(p,t.id).filter(k=>k.type!=='reference').map(k=>({c:k,depth:depth+1})));
    else if(t.kind==='page'&&++pagesSeen<3&&depth<6){const nx=t.elements.flatMap(el=>outConns(p,t.id,el.id)).filter(k=>{const x=p.entities[k.to];return x&&x.kind!=='page'}).slice(0,1);q=q.concat(nx.map(k=>({c:k,depth:depth+1})))}}
  return out;
}
function captionFor(p,st,i){const e=p.entities[st.id];const c=st.via;
  const how=c?(c.label?`“${c.label}”: `:'')+({navigate:'opens',modal:'pops up',trigger:'runs',read:'reads',write:'saves to',setting:'changes',condition:'leads to',permission:'checks access, then',notify:'notifies via',background:'later runs',api:'calls',workflow:'runs',back:'goes back to',error:'if it fails, goes to',reference:'uses'}[c.type]||'leads to'):'';
  if(i===0)return e.kind==='page'?`Start on ${e.name}${st.el?`. You tap “${(findElement(p,e.id,st.el)||{}).label}”.`:'.'}`:`It starts with ${e.name}.`;
  if(e.kind==='page')return `${how} the ${e.name} page (${e.pageType}, ${e.elements.length} parts).`;
  if(e.kind==='function')return `${how} ${e.name}. ${(e.steps||'').split('\n').filter(Boolean).slice(0,3).join(', ')||'No steps written yet.'}`;
  if(e.kind==='decision')return `${how} a check: ${e.name} ${condAnswers(p,e).map(k=>`${k.label||'?'} → ${entityLabel(p,k.to)}`).join(', ')}.`;
  return `${how} ${KINDS[e.kind].label.toLowerCase()} ${e.name}.`}
function walkthroughModal(){
  const has=!!AI.dict;
  openModal({title:'Walk me through it',sub:'Ask about a journey. FlowMate highlights it step by step.',ic:'play',body:`<div class="field sa-ask"><label for="sa-in">What do you want to see?</label><textarea id="sa-in" class="inp" rows="2" placeholder="e.g. Show me what happens if a tenant reports a repair">${esc(AI.text||'')}</textarea>${has?`<button class="mic" id="sa-mic" data-act="sa-mic" aria-pressed="false" aria-label="Talk instead of typing">${icon('mic')}</button>`:''}<p id="sa-partial" class="help"></p></div><label class="opt-line"><input type="checkbox" id="wt-speak"> Read the steps out loud</label>`,
    actions:[{label:'Cancel',run:closeModal},{label:'Show me',primary:true,icon:'play',run:()=>{const q=$('#sa-in').value.trim();const speak=$('#wt-speak').checked;if(!q)return;const p=S.p;const st=findStart(p,q);closeModal();AI.text='';
      if(!st)return toast("I couldn't match that to anything on the map. Try a button or page name.");WT.steps=walkSteps(p,st);WT.i=0;WT.speak=speak;WT.q=q;showWalk()}}]});
}
async function showWalk(){
  const p=S.p;const st=WT.steps[WT.i];if(!st)return endWalk();
  const ents=new Set(WT.steps.slice(0,WT.i+1).map(s=>s.id)),conns=new Set(WT.steps.slice(1,WT.i+1).map(s=>s.conn).filter(Boolean));
  S.trace={ents,conns,order:[],dir:'walk',start:{id:WT.steps[0].id,el:WT.steps[0].el||null}};renderCanvas();applyTraceClasses();centreOn(st.id,Math.max(S.view.z,.7));
  const cap=captionFor(p,st,WT.i);let w=$('#walk');if(!w){w=document.createElement('div');w.id='walk';w.setAttribute('role','region');w.setAttribute('aria-label','Walkthrough');$('#viewport').appendChild(w)}
  w.innerHTML=`<p class="wq">“${esc(WT.q)}”</p><p class="wc" aria-live="polite"><b>Step ${WT.i+1} of ${WT.steps.length}.</b> ${esc(cap)}</p><div class="row-btns"><button class="btn small" data-act="walk-prev" ${WT.i?'':'disabled'}>${icon('back')}Back</button><button class="btn small primary" data-act="walk-next">${WT.i<WT.steps.length-1?'Next':'Finish'}</button>${WT.ttsOK!==false?`<button class="btn small ghost" data-act="walk-say" aria-label="Read this step aloud">${icon('bell')}Read aloud</button>`:''}<button class="btn small ghost" data-act="walk-end">Close</button></div>`;
  if(WT.speak)sayIt(cap);
}
async function sayIt(text){try{if(!WT.tts&&window.claude&&window.claude.use)WT.tts=await window.claude.use('tts');if(WT.tts){await WT.tts.speak(text).catch(()=>{});return}}catch(e){}
  try{if('speechSynthesis' in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-AU';speechSynthesis.speak(u)}else WT.ttsOK=false}catch(e){WT.ttsOK=false}}
function endWalk(){const w=$('#walk');if(w)w.remove();S.trace=null;renderCanvas();applyTraceClasses();try{WT.tts&&WT.tts.stop();window.speechSynthesis&&speechSynthesis.cancel()}catch(e){}}
Object.assign(ACT,{walkthrough:walkthroughModal,'walk-next':()=>{if(WT.i<WT.steps.length-1){WT.i++;showWalk()}else endWalk()},'walk-prev':()=>{if(WT.i>0){WT.i--;showWalk()}},'walk-end':endWalk,'walk-say':()=>sayIt(captionFor(S.p,WT.steps[WT.i],WT.i))});

