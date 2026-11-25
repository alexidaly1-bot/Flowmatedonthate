// =========================================================
// VIEW — pan, zoom, semantic zoom levels
// =========================================================
const vp=$('#viewport'),world=$('#world'),cardsEl=$('#cards'),edgesEl=$('#edges'),framesEl=$('#frames'),labelsEl=$('#elabels');
function zoomLevel(z){const t=S.prefs.thresholds;let l=1;for(const v of t)if(z>=v)l++;return l}
function applyView(){}
function zoomAt(sx,sy,nz){const{x,y,z}=S.view;nz=clamp(nz,.08,3);const wx=(sx-x)/z,wy=(sy-y)/z;S.view={x:sx-wx*nz,y:sy-wy*nz,z:nz};applyView()}
function zoomBy(f){const r=vp.getBoundingClientRect();zoomAt(r.width/2,r.height/2,S.view.z*f)}
function bounds(ids){
  let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity;
  for(const id of ids){const g=S.geo[id];if(!g)continue;a=Math.min(a,g.x);b=Math.min(b,g.y);c=Math.max(c,g.x+g.w);d=Math.max(d,g.y+g.h)}
  return a===Infinity?null:{x:a,y:b,w:c-a,h:d-b};
}
function rememberView(){S.viewBack.push({...S.view});if(S.viewBack.length>30)S.viewBack.shift()}
function fitTo(bb,maxZ=1.1){if(!bb)return;const r=vp.getBoundingClientRect();const pad=90;const z=clamp(Math.min((r.width-pad*2)/bb.w,(r.height-pad*2)/bb.h),.08,maxZ);S.view={z,x:r.width/2-(bb.x+bb.w/2)*z,y:r.height/2-(bb.y+bb.h/2)*z};applyView()}
function fitAll(){rememberView();fitTo(bounds(Object.keys(S.geo)))}
function centreOn(id,z){const g=S.geo[id];if(!g)return;rememberView();const r=vp.getBoundingClientRect();const nz=z||Math.max(S.view.z,.85);const mob=window.innerWidth<=760;S.view={z:nz,x:r.width/2-(g.x+g.w/2)*nz,y:mob?70-g.y*nz:r.height/2-(g.y+Math.min(g.h,300)/2)*nz};applyView()}
function toWorld(cx,cy){const r=vp.getBoundingClientRect();return{x:(cx-r.left-S.view.x)/S.view.z,y:(cy-r.top-S.view.y)/S.view.z}}

