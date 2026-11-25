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
