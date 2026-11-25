
// =========================================================
// FM6 · PARTS TOOLBAR — dock top / bottom / left / right, fold away, scroll or swipe
// =========================================================
const DOCKS=[['auto','Automatic'],['left','Left'],['right','Right'],['top','Top'],['bottom','Bottom']];
function trayDock(){const d=S.prefs.trayDock||'auto';if(d!=='auto')return d;return 'left'}
function trayVertical(){const d=trayDock();return d==='left'||d==='right'}
renderTray=function(){
  let t=$('#tray');
  if(!t||!t.classList.contains('tray6')){if(t)t.remove();t=document.createElement('div');t.id='tray';t.className='tray6';t.setAttribute('role','toolbar');t.setAttribute('aria-label','Parts. Drag onto a screen, or tap to add to the selected screen.');
    t.innerHTML=`<div class="tray-bar"><button class="tray-ctl tray-fold" data-act="tray-fold" aria-expanded="true" title="Fold the parts away">${icon('layers')}<span class="tl">Parts</span><span class="chev" aria-hidden="true">▾</span></button><button class="tray-ctl tray-move" data-act="tray-move" title="Move the parts bar to another side">${icon('tidy')}<span class="tl">Move</span></button></div>
    <button class="tray-ctl tray-arr prev" data-act="tray-scroll" data-d="-1" aria-label="Show earlier parts">‹</button>
    <div class="tray-scroll">${PARTS.map(([k,l,i])=>`<button class="tpart${k==='screen'?' new':''}" data-part="${k}" title="${k==='screen'?'Drag onto the canvas or onto a line':'Drag onto a screen, or tap to add to the selected screen'}" aria-label="${l}">${icon(i)}<span>${l}</span></button>`).join('')}</div>
    <button class="tray-ctl tray-arr next" data-act="tray-scroll" data-d="1" aria-label="Show more parts">›</button>`;
    vp.appendChild(t);
    const sc=t.querySelector('.tray-scroll');
    sc.addEventListener('scroll',()=>trayArrows(t),{passive:true});
    sc.addEventListener('wheel',ev=>{if(!trayVertical()&&Math.abs(ev.deltaY)>Math.abs(ev.deltaX)){sc.scrollLeft+=ev.deltaY;ev.preventDefault()}},{passive:false});
  }
  const dock=trayDock();const open=S.prefs.trayOpen==null?window.innerWidth>=600:S.prefs.trayOpen!==false;
  t.classList.remove('dock-left','dock-right','dock-top','dock-bottom');t.classList.add('dock-'+dock);
  t.classList.toggle('folded',!open);
  const f=t.querySelector('.tray-fold');f.setAttribute('aria-expanded',String(open));f.title=open?'Fold the parts away':'Show the parts';f.querySelector('.chev').textContent=open?(trayVertical()?'▴':'▾'):(trayVertical()?'▾':'▸');
  const v=trayVertical();t.querySelector('.prev').textContent=v?'▲':'◀';t.querySelector('.next').textContent=v?'▼':'▶';
  t.hidden=!isScreens();
  requestAnimationFrame(()=>trayArrows(t));
};
function trayArrows(t){
  const sc=t.querySelector('.tray-scroll');if(!sc)return;const v=trayVertical();
  const max=v?sc.scrollHeight-sc.clientHeight:sc.scrollWidth-sc.clientWidth;const pos=v?sc.scrollTop:sc.scrollLeft;
  const over=max>2&&!t.classList.contains('folded');t.classList.toggle('scrolls',over);
  t.querySelector('.prev').disabled=!over||pos<=2;t.querySelector('.next').disabled=!over||pos>=max-2;
}
Object.assign(ACT,{
  'tray-fold':()=>{S.prefs.trayOpen=!$('#tray').classList.contains('folded')?false:true;savePrefs();renderTray()},
  'tray-move':()=>{const order=['left','bottom','right','top'];const i=order.indexOf(trayDock());S.prefs.trayDock=order[(i+1)%4];savePrefs();renderTray();toast('Parts bar moved to the '+S.prefs.trayDock+'. Change it any time in Settings.')},
  'tray-scroll':ds=>{const t=$('#tray');const sc=t&&t.querySelector('.tray-scroll');if(!sc)return;const d=+(ds&&ds.d||1);const v=trayVertical();sc.scrollBy(v?{top:d*sc.clientHeight*.7,behavior:'smooth'}:{left:d*sc.clientWidth*.7,behavior:'smooth'})},
});
// A swipe along the bar scrolls it; dragging a part off the bar adds it to a screen
const _dmTray=dragMove,_ddTray=dragDrop;
dragMove=function(g,ev){
  if(g.type==='tray'&&!g.out){const t=$('#tray');const sc=t&&t.querySelector('.tray-scroll');
    if(sc){const r=t.getBoundingClientRect();const inside=ev.clientX>=r.left&&ev.clientX<=r.right&&ev.clientY>=r.top&&ev.clientY<=r.bottom;
      if(inside){const v=trayVertical();if(g.sl==null)g.sl=v?sc.scrollTop:sc.scrollLeft;const along=v?ev.clientY-g.sy:ev.clientX-g.sx,across=v?ev.clientX-g.sx:ev.clientY-g.sy;
        if(Math.abs(along)>=Math.abs(across)){if(v)sc.scrollTop=g.sl-along;else sc.scrollLeft=g.sl-along;g.scrolled=true;return}}
      g.out=true}}
  return _dmTray(g,ev);
};
dragDrop=function(g,ev){if(g.type==='tray'&&g.scrolled&&!g.out){clearDrag();return}return _ddTray(g,ev)};
// Tap a part with no screen selected: add it to the screen in the middle of the view
const _ttTray=trayTap;
trayTap=function(part){
  const s=S.sel;const has=s&&s.t!=='conn'&&S.p.entities[s.id]&&S.p.entities[s.id].kind==='page';
  if(part==='screen'||has)return _ttTray(part);
  const r=vp.getBoundingClientRect();const c=toWorld(r.left+r.width/2,r.top+r.height/2);let best=null,bd=Infinity;
  for(const[id,g] of Object.entries(S.geo)){const e=S.p.entities[id];if(!e||e.kind!=='page'||g.node===CE_GHOST)continue;const d=Math.hypot(g.x+g.w/2-c.x,g.y+g.h/2-c.y);if(d<bd){bd=d;best=id}}
  if(!best)return toast('Tap a screen first, then tap a part to add it');
  toast('Added to “'+S.p.entities[best].name+'”. Tap a screen first to choose another.');
  addPartAt(best,part,null);
};
