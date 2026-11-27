// =========================================================
// FM6 · STABILITY
// =========================================================
// Storage: no second copy in memory unless the device refuses to save
Store.get=function(k){try{const v=localStorage.getItem(k);return v==null?(this.mem[k]??null):v}catch(e){this.ok=false;return this.mem[k]??null}};
Store.set=function(k,v){try{localStorage.setItem(k,v);if(k in this.mem)delete this.mem[k]}catch(e){this.mem[k]=v;if(this.ok!==false||!this.warned){this.warned=true;try{toast('This device could not save. Your work is kept while FlowMate is open, and your account copy still syncs.')}catch(x){}}this.ok=false}};
// Anything unexpected: note it once, keep going
let _errT=0;
function softFault(msg){if(/ResizeObserver|Script error|AbortError|cancelled/i.test(String(msg||'')))return;console.warn('[FlowMate]',msg);if(Date.now()-_errT>6000){_errT=Date.now();try{toast('Something went wrong in the background. Your work is saved.')}catch(e){}}}
window.addEventListener('error',ev=>softFault(ev.message));
window.addEventListener('unhandledrejection',ev=>{const r=ev.reason;if(r&&(r.code==='cancelled'||r.name==='AbortError'))return;softFault(r&&(r.message||r.code)||r)});
// Leaving the page: write the latest copy straight away
window.addEventListener('pagehide',()=>{try{logFlush();if(S.p){CE.lastSave=null;saveLocal(S.p)}}catch(e){}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&S.p){try{logFlush();CE.lastSave=null;saveLocal(S.p)}catch(e){}}});

// ---------- Theme ----------
function applyPrefs(){
  const r=FMT.apply(S.prefs);const key=r.id+'/'+r.mode;
  if(S._apKey&&S._apKey!==key&&S.panel==='settings'&&S.p&&!S._apBusy)requestAnimationFrame(()=>{if(S.panel==='settings')rerenderPanelKeep()});
  S._apKey=key;
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{applyPrefs();renderMinimap()});
new MutationObserver(()=>{applyPrefs();renderMinimap()}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
vp.addEventListener('scroll',()=>{if(vp.scrollTop||vp.scrollLeft){vp.scrollTop=0;vp.scrollLeft=0}});
window.addEventListener('scroll',()=>{if(window.scrollY||window.scrollX)window.scrollTo(0,0)});
window.addEventListener('resize',()=>{if(S.p){renderMinimap()}});

// ---------- Boot ----------
function boot(){
  applyPrefs();loadLocal();
  if(!Object.keys(S.projects).length){const p=seedLandlord();S.projects[p.id]=p;saveLocal(p)}
  const last=Store.get('fm.last');
  const id=S.projects[last]?last:Object.values(S.projects).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0].id;
  openProject(id);
  if(!Store.ok)toast("This browser won't let FlowMate save. Use Export to keep your work.");
  initCloud();initAI();initTeam().then(()=>{if(S.panel==='team')loadShared().then(()=>rerenderPanelKeep())});assetsCap();
}
window.FM={suggestedAnswer,decisionsFrom,condAnswers,paletteToLook,setScopeLook,openProject,openSmartAction,healthHTML,teamHTML,PAGE_TYPES,STATUSES,radiusShow:showRadius,normalizeProject,effectiveSetting,impactOf,impactSummary,settingRefs,radiusConfirm,makePalette,paletteChecks,extractColours,CL,COL,lookFor,runScenario,runAllScenarios,analyse,progressOf,genTasks,passportData,logicViews,docsFor,dataJourneyModal,findStart,walkSteps,WT,versionsOf,snapshotVersion,diffProjects,metricsOf,exportSVG,makeZip,makePDF,handoffFiles,toYAML,viewOnlyHTML,rasterise,Team,commentsFor,smartSearch,buildTemplate,copyCards,pasteCards,alignMulti,toggleMulti,startPresent,endPresent,storeFiles,screenshotFlow,applyPrefs,renderLinkKey,FAMS,famOf,nodeIds,S,centreOn,applyView,renderCanvas,playTap,select,derivedEdges,screensLayout,openPlay,PL,setView,openWeb,lookStyle,addModule,runOps,projectSnapshot,buildPrompt,AI,blankProject,addEntity,addElement,addConn,branchNew,removeEntity,removeElement,checkProject,trace,exportJSON,importJSON,toMermaid,toCSV,seedLandlord,autoLayout,commit,undo,redo,outConns,inConns,descendants};
boot();
