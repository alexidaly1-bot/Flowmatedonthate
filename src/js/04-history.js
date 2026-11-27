// =========================================================
// HISTORY — every structural change is one undoable step
// =========================================================
function commit(label,fn){
  const before=JSON.stringify(S.p);
  let r;try{r=fn(S.p)}catch(e){S.p=JSON.parse(before);S.projects[S.p.id]=S.p;toast(e.message||'That change could not be made.');return}
  pushUndo(label,before);touch();renderAll();return r;
}
function pushUndo(label,before){S.undo.push({label,json:before,at:Date.now()});if(S.undo.length>100)S.undo.shift();S.redo=[]}
function touch(){S.p.updatedAt=Date.now();S.p.rev=(S.p.rev||0)+1;S.projects[S.p.id]=S.p;saveLocal(S.p);queueCloud(S.p);renderSync()}
function restore(json){S.p=JSON.parse(json);S.projects[S.p.id]=S.p;validateSel();touch();renderAll()}
function undo(){const h=S.undo.pop();if(!h)return toast('Nothing to undo');S.redo.push({label:h.label,json:JSON.stringify(S.p)});restore(h.json);toast('Undid: '+h.label)}
function redo(){const h=S.redo.pop();if(!h)return toast('Nothing to redo');S.undo.push({label:h.label,json:JSON.stringify(S.p)});restore(h.json);toast('Redid: '+h.label)}
function validateSel(){const s=S.sel;if(!s)return;if(s.t==='conn'?!S.p.connections[s.id]:!S.p.entities[s.id])S.sel=null;else if(s.t==='element'&&!findElement(S.p,s.id,s.el))S.sel={t:'entity',id:s.id};S.trace=null}

