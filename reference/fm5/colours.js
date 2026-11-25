
// =========================================================
// COLOURS: scheme generator, theme manager (for the app being planned)
// =========================================================
const CL=(()=>{
  const clamp01=x=>Math.min(1,Math.max(0,x));
  const hex2rgb=h=>{h=String(h).replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return [(n>>16)&255,(n>>8)&255,n&255]};
  const rgb2hex=c=>'#'+c.map(v=>Math.round(Math.min(255,Math.max(0,v))).toString(16).padStart(2,'0')).join('').toUpperCase();
  const lin=v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)};
  const unlin=v=>255*(v<=.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-.055);
  function toOklab(hex){const [r,g,b]=hex2rgb(hex).map(lin);
    const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
    return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s]}
  function fromOklabRaw(L,a,b){const l=Math.pow(L+.3963377774*a+.2158037573*b,3),m=Math.pow(L-.1055613458*a-.0638541728*b,3),s=Math.pow(L-.0894841775*a-1.291485548*b,3);
    return [4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s]}
  function oklch(hex){const [L,a,b]=toOklab(hex);let h=Math.atan2(b,a)*180/Math.PI;if(h<0)h+=360;return {l:L,c:Math.hypot(a,b),h}}
  /* OKLCH → hex, lowering chroma until the colour fits the screen's range */
  function fromOklch(l,c,h){l=clamp01(l);h=((h%360)+360)%360;let cc=Math.max(0,c);
    for(let i=0;i<40;i++){const a=cc*Math.cos(h*Math.PI/180),b=cc*Math.sin(h*Math.PI/180);const rgb=fromOklabRaw(l,a,b);if(rgb.every(v=>v>=-.0005&&v<=1.0005))return rgb2hex(rgb.map(v=>unlin(clamp01(v))));cc*=.9}
    return rgb2hex(fromOklabRaw(l,0,0).map(v=>unlin(clamp01(v))))}
  const lum=hex=>{const [r,g,b]=hex2rgb(hex).map(lin);return .2126*r+.7152*g+.0722*b};
  const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  function hsl(hex){const [r,g,b]=hex2rgb(hex).map(v=>v/255);const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,s=0;const l=(mx+mn)/2;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60}return {h:Math.round(h),s:Math.round(s*100),l:Math.round(l*100)}}
  const M={protanopia:[[.152286,1.052583,-.204868],[.114503,.786281,.099216],[-.003882,-.048116,1.051998]],deuteranopia:[[.367322,.860646,-.227968],[.280085,.672501,.047413],[-.01182,.04294,.968881]],tritanopia:[[1.255528,-.076749,-.178779],[-.078411,.930809,.147602],[.004733,.691367,.3039]]};
  function simulate(hex,type){const m=M[type];if(!m)return hex;const v=hex2rgb(hex).map(lin);return rgb2hex(m.map(r=>unlin(clamp01(r[0]*v[0]+r[1]*v[1]+r[2]*v[2]))))}
  /* Move a colour lighter or darker (keeping its hue) until it reaches the contrast target against bg */
  function fit(fg,bg,target){if(contrast(fg,bg)>=target)return fg;const o=oklch(fg);const darker=lum(bg)>.18;let best=fg;
    for(let i=1;i<=60;i++){const l=darker?o.l-i*.015:o.l+i*.015;if(l<0||l>1)break;const c=fromOklch(l,o.c,o.h);best=c;if(contrast(c,bg)>=target)return c}
    return contrast('#000000',bg)>contrast('#FFFFFF',bg)?'#000000':'#FFFFFF'}
  const bestOn=bg=>contrast('#FFFFFF',bg)>=contrast('#111111',bg)?'#FFFFFF':'#111111';
  const valid=h=>/^#?[0-9a-fA-F]{6}$/.test(String(h).trim())||/^#?[0-9a-fA-F]{3}$/.test(String(h).trim());
  const norm=h=>rgb2hex(hex2rgb(String(h).trim()));
  return {hex2rgb,rgb2hex,oklch,fromOklch,lum,contrast,hsl,simulate,fit,bestOn,valid,norm,toOklab,M};
})();

/* Pull the main colours out of a picture (k-means in a perceptual colour space) */
function extractColours(img,k=6){
  const cv=document.createElement('canvas');const W=72,H=Math.max(1,Math.round(72*img.naturalHeight/img.naturalWidth));cv.width=W;cv.height=H;
  const ctx=cv.getContext('2d');ctx.drawImage(img,0,0,W,H);const d=ctx.getImageData(0,0,W,H).data;const px=[];
  for(let i=0;i<d.length;i+=4){if(d[i+3]<128)continue;px.push(CL.toOklab(CL.rgb2hex([d[i],d[i+1],d[i+2]])))}
  if(!px.length)return [];
  px.sort((a,b)=>a[0]-b[0]);let C=[];for(let i=0;i<k;i++)C.push(px[Math.floor((i+.5)*px.length/k)].slice());
  let assign=new Array(px.length).fill(0);
  for(let it=0;it<12;it++){const sum=C.map(()=>[0,0,0,0]);
    for(let i=0;i<px.length;i++){let bi=0,bd=1e9;for(let j=0;j<C.length;j++){const dd=(px[i][0]-C[j][0])**2+(px[i][1]-C[j][1])**2+(px[i][2]-C[j][2])**2;if(dd<bd){bd=dd;bi=j}}assign[i]=bi;const s=sum[bi];s[0]+=px[i][0];s[1]+=px[i][1];s[2]+=px[i][2];s[3]++}
    C=C.map((c,j)=>sum[j][3]?[sum[j][0]/sum[j][3],sum[j][1]/sum[j][3],sum[j][2]/sum[j][3]]:c)}
  const cnt=C.map(()=>0);assign.forEach(a=>cnt[a]++);
  const toHex=c=>{const L=c[0],a=c[1],b=c[2];const h=(Math.atan2(b,a)*180/Math.PI+360)%360;return CL.fromOklch(L,Math.hypot(a,b),h)};
  let out=C.map((c,j)=>({hex:toHex(c),weight:cnt[j]/px.length})).filter(x=>x.weight>.01);
  // merge near-duplicates
  const res=[];for(const x of out.sort((a,b)=>b.weight-a.weight)){const o=CL.oklch(x.hex);const dup=res.find(r=>{const q=CL.oklch(r.hex);return Math.abs(q.l-o.l)<.05&&Math.hypot(q.c*Math.cos(q.h*Math.PI/180)-o.c*Math.cos(o.h*Math.PI/180),q.c*Math.sin(q.h*Math.PI/180)-o.c*Math.sin(o.h*Math.PI/180))<.03});if(dup)dup.weight+=x.weight;else res.push(x)}
  // roles
  res.sort((a,b)=>b.weight-a.weight);res.forEach(r=>{r.role=''});if(res[0])res[0].role='Dominant';if(res[1])res[1].role='Secondary';
  const acc=res.slice(2).filter(r=>CL.oklch(r.hex).c>.06).sort((a,b)=>CL.oklch(b.hex).c-CL.oklch(a.hex).c)[0];if(acc)acc.role='Accent';
  return res;
}
function analyseSet(cols){
  if(!cols.length)return '';const L=cols.map(c=>CL.oklch(c.hex));const w=cols.map(c=>c.weight||1/cols.length);const tw=w.reduce((a,b)=>a+b,0);
  const avg=f=>L.reduce((s,o,i)=>s+f(o)*w[i],0)/tw;const warm=L.reduce((s,o,i)=>s+((o.h<95||o.h>300)&&o.c>.03?w[i]:0),0)/tw;const cool=L.reduce((s,o,i)=>s+((o.h>=150&&o.h<=300)&&o.c>.03?w[i]:0),0)/tw;
  const light=L.reduce((s,o,i)=>s+(o.l>.6?w[i]:0),0)/tw;
  return `${warm>cool+.15?'Mostly warm':cool>warm+.15?'Mostly cool':'Warm and cool mixed'} · ${avg(o=>o.c)>.12?'saturated':avg(o=>o.c)>.06?'medium saturation':'muted'} · ${avg(o=>o.l)>.65?'light':avg(o=>o.l)<.4?'dark':'mid-tone'} · ${light>.65?'mostly light areas':light<.35?'mostly dark areas':'balanced light and dark'}`;
}
const WORD_HUES={red:25,rose:10,pink:350,coral:35,orange:55,peach:60,sunset:45,autumn:55,terracotta:40,rust:40,gold:85,yellow:95,sun:90,sand:80,beach:85,olive:115,lime:130,green:145,forest:150,leaf:140,mint:165,sage:150,teal:190,ocean:220,sea:210,sky:235,blue:255,navy:260,denim:250,indigo:275,purple:300,violet:295,lavender:290,plum:330,berry:345,wine:15,chocolate:45,coffee:50,earth:55,earthy:55,stone:70,slate:250,charcoal:260};
function wordsToSeeds(text){
  const t=String(text||'').toLowerCase();const seeds=[];let cS=1,lS=0;
  if(/\b(calm|soft|gentle|muted|quiet|relax)/.test(t))cS*=.6;if(/\b(bold|vivid|bright|energetic|playful|loud)/.test(t))cS*=1.4;if(/\b(pastel|airy|light)/.test(t)){lS+=.1;cS*=.6}if(/\b(dark|moody|night|deep|luxury|premium)/.test(t))lS-=.12;
  for(const[w,h] of Object.entries(WORD_HUES))if(new RegExp('\\b'+w).test(t))seeds.push(CL.fromOklch(.6+lS,.13*cS,h));
  if(!seeds.length&&t.trim())seeds.push(CL.fromOklch(.58+lS,.12*cS,(t.length*47)%360));
  return seeds.slice(0,4);
}

/* Build a full semantic palette for light and dark from seed colours */
const VARIANTS=[['closest','Closest to your colours'],['softer','Softer'],['warmer','Warmer'],['colourful','More colourful'],['contrast','Higher contrast'],['minimal','Minimal'],['dark','Dark-mode first']];
function makePalette(seeds,variant,locked=[]){
  const S0=seeds.map(h=>CL.norm(h));if(!S0.length)return null;
  const info=S0.map(h=>({hex:h,o:CL.oklch(h),locked:locked.includes(h)}));
  const byC=info.slice().sort((a,b)=>b.o.c-a.o.c);
  let pri=info.find(x=>x.locked)||byC[0];
  let sec=info.find(x=>x!==pri&&Math.abs(((x.o.h-pri.o.h+540)%360)-180)>25&&x.o.c>.03)||null;
  const acc=info.find(x=>x!==pri&&x!==sec&&x.o.c>.08)||null;
  let cS={softer:.6,colourful:1.35,minimal:.25}[variant]||1,hS=variant==='warmer'?1:0;
  const shiftH=h=>hS?h+((((55-h)+540)%360)-180)*.25:h;
  const ph=shiftH(pri.o.h),pc=Math.min(.32,pri.o.c*(variant==='minimal'?1:cS));
  const target=variant==='contrast'?7:4.5;
  const mk=mode=>{
    const dark=mode==='dark';const nc=variant==='minimal'?.004:Math.min(.02,pc*.12+.004)*(variant==='colourful'?1.6:1);
    const bg=dark?CL.fromOklch(.18,nc,ph):CL.fromOklch(variant==='softer'?.975:.985,nc,ph);
    const surface=dark?CL.fromOklch(.22,nc*1.2,ph):CL.fromOklch(.997,nc*.6,ph);
    const elevated=dark?CL.fromOklch(.26,nc*1.3,ph):'#FFFFFF';
    const text=CL.fit(dark?CL.fromOklch(.95,nc,ph):CL.fromOklch(.22,nc*1.4,ph),bg,variant==='contrast'?10:7);
    const textSecondary=CL.fit(dark?CL.fromOklch(.8,nc*1.4,ph):CL.fromOklch(.45,nc*1.6,ph),bg,target);
    let primary=pri.locked&&!dark?pri.hex:CL.fromOklch(dark?Math.max(.68,pri.o.l):Math.min(pri.o.l,.62),dark?Math.min(pc,.16):pc,ph);
    if(!pri.locked&&variant==='closest'&&!dark)primary=pri.hex;
    let onPrimary=CL.bestOn(primary);if(CL.contrast(onPrimary,primary)<target&&!(pri.locked&&!dark)){primary=CL.fit(primary,onPrimary,target)}
    const secBase=sec?sec.o:{l:pri.o.l,c:pc*.7,h:ph+(variant==='minimal'?0:30)};
    let secondary=CL.fromOklch(dark?.72:Math.min(secBase.l,.55),Math.min(.25,secBase.c*cS),shiftH(secBase.h));if(sec&&sec.locked&&!dark)secondary=sec.hex;
    const onSecondary=CL.bestOn(secondary);if(CL.contrast(onSecondary,secondary)<target&&!(sec&&sec.locked))secondary=CL.fit(secondary,onSecondary,target);
    const accent=acc?(acc.locked?acc.hex:CL.fromOklch(dark?.75:.6,Math.min(.25,acc.o.c*cS),shiftH(acc.o.h))):CL.fromOklch(dark?.75:.6,variant==='minimal'?pc:Math.min(.22,pc*1.1),ph+180);
    const link=CL.fit(primary,bg,target);
    const border=CL.fit(dark?CL.fromOklch(.42,nc*2,ph):CL.fromOklch(.72,nc*2,ph),bg,3);
    const selected=dark?CL.fromOklch(.3,Math.min(.08,pc*.5),ph):CL.fromOklch(.93,Math.min(.05,pc*.35),ph);
    const hover=dark?CL.fromOklch(.25,nc*2,ph):CL.fromOklch(.955,nc*2,ph);
    const disabled=dark?CL.fromOklch(.32,.005,ph):CL.fromOklch(.9,.005,ph);
    const disabledText=CL.fit(dark?CL.fromOklch(.62,.005,ph):CL.fromOklch(.55,.005,ph),disabled,3);
    const st=(h,c)=>CL.fit(CL.fromOklch(dark?.78:.5,c,h),bg,target);
    return {background:bg,surface,elevated,primary,onPrimary,secondary,onSecondary,accent,text,textSecondary,link,border,selected,hover,disabled,disabledText,success:st(150,.14),warning:st(70,.13),error:st(27,.17),info:st(245,.13)};
  };
  return {variant,name:(VARIANTS.find(v=>v[0]===variant)||[0,variant])[1],seeds:S0,locked:locked.slice(),light:mk('light'),dark:mk('dark'),created:Date.now()};
}
const ROLE_LABEL={background:'Main background',surface:'Surface',elevated:'Raised surface',primary:'Primary button',onPrimary:'Text on primary',secondary:'Secondary button',onSecondary:'Text on secondary',accent:'Accent',text:'Main text',textSecondary:'Secondary text',link:'Links',border:'Border',selected:'Selected',hover:'Hover',disabled:'Disabled',disabledText:'Disabled text',success:'Success',warning:'Warning',error:'Error',info:'Information'};
function paletteChecks(P){
  const ck=(a,b,lab,min)=>{const r=CL.contrast(P[a],P[b]);return {lab,a,b,r,min,ok:r>=min,large:r>=3}};
  return [ck('text','background','Main text on background',4.5),ck('textSecondary','background','Secondary text on background',4.5),ck('text','surface','Main text on surface',4.5),ck('onPrimary','primary','Text on primary button',4.5),ck('onSecondary','secondary','Text on secondary button',4.5),ck('link','background','Links on background',4.5),ck('border','background','Borders (non-text)',3),ck('success','background','Success text',4.5),ck('warning','background','Warning text',4.5),ck('error','background','Error text',4.5),ck('info','background','Information text',4.5),ck('disabledText','disabled','Disabled text (large)',3)];
}

// ---------- Looks for the planned app: app → module → page → role ----------
function lookFor(p,pageId,roleId){
  const out=Object.assign({},LOOK_DEF,p.look||{});const pg=pageId&&p.entities[pageId];
  const add=l=>{if(l)for(const[k,v] of Object.entries(l))if(v!=null&&v!=='')out[k]=v};
  if(pg&&pg.moduleId&&p.modules[pg.moduleId])add(p.modules[pg.moduleId].look);
  if(pg)add(pg.look);
  if(roleId){const r=p.roles.find(x=>x.id===roleId);if(r)add(r.look)}
  return out;
}
function scopeLook(p,scope){const[k,id]=scope.split(':');if(k==='app')return p.look;if(k==='mod')return (p.modules[id]||{}).look;if(k==='role')return (p.roles.find(r=>r.id===id)||{}).look;return (p.entities[id]||{}).look}
function scopeLabel(p,scope){const[k,id]=scope.split(':');if(k==='app')return 'Whole app';if(k==='mod')return 'Module: '+((p.modules[id]||{}).name||'?');if(k==='role')return 'Role: '+roleName(p,id);return (p.entities[id]&&p.entities[id].kind==='component'?'Component: ':'Page: ')+entityLabel(p,id)}
function setScopeLook(p,scope,look){const[k,id]=scope.split(':');if(k==='app'){p.look=look;return}if(k==='mod'){if(p.modules[id])p.modules[id].look=look;return}if(k==='role'){const r=p.roles.find(x=>x.id===id);if(r)r.look=look;return}if(p.entities[id])p.entities[id].look=look}
function allLookScopes(p){const out=[['app:',p.look]];for(const m of Object.values(p.modules))if(m.look)out.push(['mod:'+m.id,m.look]);for(const e of Object.values(p.entities))if(e.look)out.push(['ent:'+e.id,e.look]);for(const r of p.roles)if(r.look)out.push(['role:'+r.id,r.look]);return out.filter(x=>x[1])}
function lookColours(l){const c=new Set();if(!l)return c;if(l.primary)c.add(CL.norm(l.primary));if(l.palette)for(const m of ['light','dark'])for(const v of Object.values(l.palette[m]||{}))c.add(CL.norm(v));return c}

// ---------- Colours panel UI ----------
const COL={seeds:[],photos:[],words:'',results:[],sel:0,mode:'light',cvd:'',scope:'app:',locked:new Set(),inspect:null};
function swatch(hex,lab,act=''){return `<button class="sw-c" style="background:${hex};color:${CL.bestOn(hex)}" ${act||`data-act="col-inspect" data-v="${hex}"`} aria-label="${esc((lab?lab+' ':'')+hex)}" title="${esc((lab?lab+': ':'')+hex)}"><span>${esc(lab||'')}</span></button>`}
function appPreview(P){
  const st=`--pb:${P.background};--ps:${P.surface};--pe:${P.elevated};--pp:${P.primary};--pop:${P.onPrimary};--psec:${P.secondary};--posec:${P.onSecondary};--pt:${P.text};--pt2:${P.textSecondary};--pl:${P.link};--pbd:${P.border};--psel:${P.selected};--pok:${P.success};--pwarn:${P.warning};--perr:${P.error};--pacc:${P.accent}`;
  return `<div class="cprev" style="${st}" aria-hidden="true"><div class="cp-top">My app</div><div class="cp-body"><div class="cp-card"><b>Property card</b><p>Rent paid up to 20 Dec</p><a>View details</a></div><div class="cp-row"><span class="cp-chip ok">Paid</span><span class="cp-chip warn">Due soon</span><span class="cp-chip err">Overdue</span></div><div class="cp-sel">Selected item</div><div class="cp-btns"><span class="cp-b1">Save</span><span class="cp-b2">Cancel</span><span class="cp-b3">Disabled</span></div></div></div>`;
}
function coloursHTML(p){
  const seeds=COL.seeds;const res=COL.results;const cur=res[COL.sel];
  const scopes=[['app:','Whole app'],...Object.values(p.modules).map(m=>['mod:'+m.id,'Module: '+m.name]),...pages(p).map(e=>['ent:'+e.id,'Page: '+e.name]),...byKindP(p,'component').map(e=>['ent:'+e.id,'Component: '+e.name]),...p.roles.map(r=>['role:'+r.id,'Role: '+r.name])];
  let h=`<p class="help">Colours here are for the app you're planning (Screens and Play). FlowMate's own look is in Settings.</p>
  <div class="mod-h">1. Add your colours</div>
  <div class="row-btns"><label class="btn small" for="col-photo">${icon('image')}Photos or screenshots</label><input id="col-photo" type="file" accept="image/*" multiple hidden data-act-change="col-photo">
  <label class="btn small col-wheel">${icon('palette')}Colour wheel<input type="color" data-act-change="col-wheel" aria-label="Pick a colour"></label></div>
  <div class="field"><label for="col-hex">HEX codes (comma or space between them)</label><div class="row-in"><input id="col-hex" class="inp" placeholder="#E2805F, #2D6A4F, #F3DCD4"><button class="btn small" data-act="col-hex">Add</button></div></div>
  <div class="field"><label for="col-words">Or describe it</label><div class="row-in"><input id="col-words" class="inp" value="${esc(COL.words)}" placeholder="e.g. calm ocean, earthy and warm"><button class="btn small" data-act="col-words">Add</button>${AI.sample?`<button class="btn small" data-act="col-ai">${icon('sparkle')}Ask Claude</button>`:''}</div></div>
  ${(p.palettes.favourites||[]).length?`<div class="field"><label for="col-fav">Or start from a saved palette</label><select id="col-fav" class="inp" data-act-change="col-fav">${opt('','','Pick one')}${p.palettes.favourites.map((f,i)=>opt(String(i),'',f.name+' (v'+f.versions.length+')')).join('')}</select></div>`:''}
  ${COL.photos.map((ph,i)=>`<div class="col-photo"><img src="${ph.url}" alt="Photo ${i+1}"><div><small>${esc(ph.summary)}</small><div class="sw-row">${ph.cols.map((c,j)=>`<button class="sw-c pick${c.on?' on':''}" style="background:${c.hex};color:${CL.bestOn(c.hex)}" data-act="col-pick" data-i="${i}" data-j="${j}" aria-pressed="${c.on}" title="${c.role||''} ${c.hex} ${Math.round(c.weight*100)}%"><span>${c.on?'✓':''}${c.role?' '+c.role[0]:''}</span></button>`).join('')}</div><small>Tap a colour to use it or leave it out. D = dominant, S = secondary, A = accent.</small></div><button class="mini" data-act="col-photo-del" data-i="${i}" aria-label="Remove photo">${icon('trash')}</button></div>`).join('')}
  <div class="sw-row seeds">${seeds.map(h=>`<span class="seed"><span class="sw-c" style="background:${h}"></span><code>${h}</code><button class="mini${COL.locked.has(h)?' on':''}" data-act="col-lock" data-v="${h}" aria-pressed="${COL.locked.has(h)}" title="Lock: never changed">${COL.locked.has(h)?'🔒':'🔓'}</button><button class="mini" data-act="col-seed-del" data-v="${h}" aria-label="Remove ${h}">${icon('x')}</button></span>`).join('')||'<p class="help">No colours yet.</p>'}</div>
  ${seeds.length?`<p class="help">${esc(analyseSet(seeds.map(hex=>({hex}))))}</p><button class="btn primary" data-act="col-gen">${icon('sparkle')}Make palettes</button>`:''}`;
  if(res.length){
    h+=`<div class="mod-h">2. Pick an option</div><div class="col-opts" role="radiogroup" aria-label="Palette options">${res.map((r,i)=>`<button class="col-opt${i===COL.sel?' on':''}" role="radio" aria-checked="${i===COL.sel}" data-act="col-sel" data-i="${i}"><span class="sw-row">${['background','surface','primary','secondary','accent','text'].map(k=>`<i style="background:${r[COL.mode][k]}"></i>`).join('')}</span><b>${esc(r.name)}</b><small>${paletteChecks(r[COL.mode]).filter(c=>!c.ok).length?'⚠ '+paletteChecks(r[COL.mode]).filter(c=>!c.ok).length+' contrast issue(s)':'✓ all checks pass'}</small></button>`).join('')}</div>`;
    const P=cur[COL.mode];const ck=paletteChecks(P);
    h+=`<div class="mod-h">3. Check it</div><div class="chips">${['light','dark'].map(m=>`<button class="${COL.mode===m?'on':''}" aria-pressed="${COL.mode===m}" data-act="col-mode" data-v="${m}">${m==='light'?'Light':'Dark'}</button>`).join('')}</div>
    <div class="field"><label for="col-cvd">See it as someone with</label><select id="col-cvd" class="inp" data-act-change="col-cvd">${[['','Typical colour vision'],['protanopia','Protanopia (red-blind)'],['deuteranopia','Deuteranopia (green-blind)'],['tritanopia','Tritanopia (blue-blind)']].map(([k,l])=>opt(k,COL.cvd,l)).join('')}</select></div>
    ${appPreview(COL.cvd?Object.fromEntries(Object.entries(P).map(([k,v])=>[k,CL.simulate(v,COL.cvd)])):P,'')}
    <div class="sw-grid">${Object.keys(ROLE_LABEL).map(k=>swatch(COL.cvd?CL.simulate(P[k],COL.cvd):P[k],ROLE_LABEL[k])).join('')}</div>
    <div class="list">${ck.map(c=>`<div class="li ck${c.ok?'':' bad'}"><span class="ckm">${c.ok?'✓':'✕'}</span><span class="grow">${esc(c.lab)}<small>${c.r.toFixed(2)}:1 · needs ${c.min}:1${!c.ok&&c.large?' · OK for large text only':''}</small></span>${c.ok?'':`<button class="btn small" data-act="col-fix" data-k="${c.a}" data-b="${c.b}" data-min="${c.min}">Fix</button>`}</div>`).join('')}</div>`;
    const adj=cur.seeds.filter(h=>!Object.values(cur.light).includes(h)&&!cur.locked.includes(h));
    if(adj.length)h+=`<p class="help">Some of your colours were adjusted to pass contrast. Original → used:</p><div class="sw-row">${adj.slice(0,4).map(h0=>{const o=CL.oklch(h0);const near=Object.values(cur.light).sort((a,b)=>Math.abs(CL.oklch(a).h-o.h)-Math.abs(CL.oklch(b).h-o.h))[0];return `<span class="seed">${swatch(h0,'')}→${swatch(near,'')}</span>`}).join('')}</div>`;
    if(cur.locked.length)h+=`<p class="help">🔒 Locked colours are never changed. ${ck.some(c=>!c.ok)?'If a locked colour fails a check, use the Fix suggestion or unlock it.':''}</p>`;
    h+=`<div class="mod-h">4. Use it</div><div class="field"><label for="col-scope">Apply to</label><select id="col-scope" class="inp" data-act-change="col-scope">${scopes.map(([k,l])=>opt(k,COL.scope,l)).join('')}</select><p class="help">Pages and modules inherit the whole-app colours unless you give them their own.</p></div>
    <div class="row-btns"><button class="btn primary" data-act="col-apply">${icon('check')}Apply…</button><button class="btn small" data-act="col-fav-save">${icon('star')}Save to favourites</button><button class="btn small" data-act="col-tokens">${icon('download')}Design tokens</button></div>`;
  }
  // Theme manager
  const looks=allLookScopes(p);
  h+=`<div class="mod-h">Theme manager <span class="count">${looks.length}</span></div><div class="list">${looks.map(([sc,l])=>`<div class="li"><span class="sw-row">${[...lookColours(l)].slice(0,6).map(c=>`<i style="background:${c}"></i>`).join('')}</span><span class="grow">${esc(scopeLabel(p,sc==='app:'?'app:':sc))}<small>${l.paletteName?esc(l.paletteName):'Main colour '+esc(l.primary||'')}${sc==='app:'?'':' · overrides the whole app'}</small></span>${sc==='app:'?'':`<button class="btn small" data-act="col-unset" data-v="${sc}">Use inherited</button>`}</div>`).join('')}</div>`;
  // Favourites & history
  h+=`<div class="mod-h">Favourites <span class="count">${p.palettes.favourites.length}</span></div>${p.palettes.favourites.map((f,i)=>`<div class="li"><span class="sw-row">${['background','primary','secondary','accent','text'].map(k=>`<i style="background:${f.versions[f.versions.length-1].light[k]}"></i>`).join('')}</span><span class="grow">${esc(f.name)}<small>Version ${f.versions.length} · ${ago(f.versions[f.versions.length-1].created)}</small></span><button class="btn small" data-act="col-fav-load" data-i="${i}">Open</button><button class="mini" data-act="col-fav-del" data-i="${i}" aria-label="Remove favourite">${icon('trash')}</button></div>`).join('')||'<p class="help">None saved yet.</p>'}
  <div class="mod-h">History <span class="count">${p.palettes.history.length}</span></div>${p.palettes.history.slice().reverse().slice(0,10).map((f,i)=>`<div class="li"><span class="sw-row">${['background','primary','secondary','accent','text'].map(k=>`<i style="background:${f.light[k]}"></i>`).join('')}</span><span class="grow">${esc(f.name)}<small>Applied to ${esc(f.appliedTo||'')} · ${ago(f.appliedAt||f.created)}</small></span><button class="btn small" data-act="col-hist-load" data-i="${p.palettes.history.length-1-i}">Open</button></div>`).join('')||'<p class="help">Nothing applied yet.</p>'}
  <div class="mod-h">Colour usage</div><div class="row-btns"><button class="btn small" data-act="col-usage">${icon('search')}Where each colour is used</button><button class="btn small" data-act="col-replace">${icon('pen')}Replace a colour…</button><button class="btn small" data-act="col-export">${icon('download')}Export palettes</button><label class="btn small" for="col-import">${icon('upload')}Import palettes</label><input id="col-import" type="file" accept="application/json,.json" hidden data-act-change="col-import"></div>`;
  return h;
}
function inspectHTML(hex){const r=CL.hex2rgb(hex),hs=CL.hsl(hex),o=CL.oklch(hex);return `<div class="insp"><span class="sw-c big" style="background:${hex}"></span><div class="kv"><b>HEX</b><code>${hex}</code><b>RGB</b><code>${r.join(', ')}</code><b>HSL</b><code>${hs.h}°, ${hs.s}%, ${hs.l}%</code><b>OKLCH</b><code>${(o.l*100).toFixed(1)}% ${o.c.toFixed(3)} ${o.h.toFixed(1)}°</code><b>On white</b><code>${CL.contrast(hex,'#FFFFFF').toFixed(2)}:1</code><b>On black</b><code>${CL.contrast(hex,'#000000').toFixed(2)}:1</code></div></div>`}
function addSeeds(list){for(const h of list){if(!CL.valid(h))continue;const n=CL.norm(h);if(!COL.seeds.includes(n))COL.seeds.push(n)}COL.seeds=COL.seeds.slice(0,12);rerenderPanelKeep()}
function photoSeeds(){const s=[];for(const ph of COL.photos)for(const c of ph.cols)if(c.on)s.push(c.hex);return s}
function syncSeeds(){const manual=COL.seeds.filter(h=>!COL._fromPhotos||!COL._fromPhotos.has(h));const ps=photoSeeds();COL._fromPhotos=new Set(ps);COL.seeds=[...new Set([...ps,...manual])].slice(0,12)}
function genPalettes(){COL.results=VARIANTS.map(([k])=>makePalette(COL.seeds,k,[...COL.locked].filter(h=>COL.seeds.includes(h)))).filter(Boolean);COL.sel=0;rerenderPanelKeep()}
function paletteToLook(pal,base){return Object.assign({},base||{},{primary:pal.light.primary,palette:{light:pal.light,dark:pal.dark},paletteName:pal.name,paletteAt:Date.now()})}
Object.assign(ACT,{
  'col-hex':()=>{const v=$('#col-hex').value;addSeeds(v.split(/[\s,;]+/).filter(Boolean).map(x=>x.startsWith('#')?x:'#'+x))},
  'col-words':()=>{COL.words=$('#col-words').value;addSeeds(wordsToSeeds(COL.words))},
  'col-ai':async()=>{COL.words=$('#col-words').value;if(!COL.words.trim())return toast('Describe the look first');toast('Asking Claude…');
    try{const r=await AI.sample.json?AI.sample.json(`Suggest 4 colours (hex) that match this description of an app's look: "${COL.words.slice(0,300)}". Reply as JSON only: {"colours":["#RRGGBB",...]}`):null;const list=(r&&r.colours)||[];if(!list.length)throw 0;addSeeds(list);toast('Added '+list.length+' colours')}catch(e){addSeeds(wordsToSeeds(COL.words));toast("Claude couldn't answer, so I used the words instead")}},
  'col-seed-del':d=>{COL.seeds=COL.seeds.filter(h=>h!==d.v);COL.locked.delete(d.v);for(const ph of COL.photos)for(const c of ph.cols)if(c.hex===d.v)c.on=false;rerenderPanelKeep()},
  'col-lock':d=>{COL.locked.has(d.v)?COL.locked.delete(d.v):COL.locked.add(d.v);rerenderPanelKeep()},
  'col-pick':d=>{const c=COL.photos[+d.i].cols[+d.j];c.on=!c.on;syncSeeds();rerenderPanelKeep()},
  'col-photo-del':d=>{COL.photos.splice(+d.i,1);syncSeeds();rerenderPanelKeep()},
  'col-gen':()=>{if(!COL.seeds.length)return toast('Add a colour first');genPalettes()},
  'col-sel':d=>{COL.sel=+d.i;if(COL.results[COL.sel].variant==='dark')COL.mode='dark';rerenderPanelKeep()},
  'col-mode':d=>{COL.mode=d.v;rerenderPanelKeep()},
  'col-inspect':d=>openModal({title:'Colour details',ic:'palette',body:inspectHTML(d.v),actions:[{label:'Copy HEX',icon:'copy',run:()=>{navigator.clipboard&&navigator.clipboard.writeText(d.v).then(()=>toast('Copied '+d.v),()=>toast(d.v))}},{label:'Close',primary:true,run:closeModal}]}),
  'col-fix':d=>{const cur=COL.results[COL.sel];const P=cur[COL.mode];const old=P[d.k];const nu=CL.fit(old,P[d.b],+d.min);
    if(cur.locked.includes(old)){openModal({title:'This colour is locked',ic:'alert',body:`<p>${esc(old)} is locked, so FlowMate won't change it. A safe alternative is:</p>${inspectHTML(nu)}<p class="help">Unlock it if you want to use the alternative.</p>`,actions:[{label:'OK',primary:true,run:closeModal}]});return}
    openModal({title:'Fix contrast',ic:'palette',body:`<p>${esc(ROLE_LABEL[d.k])}: original vs adjusted</p><div class="sw-row">${swatch(old,'Before')}${swatch(nu,'After')}</div><p>${CL.contrast(old,P[d.b]).toFixed(2)}:1 → <b>${CL.contrast(nu,P[d.b]).toFixed(2)}:1</b></p>`,actions:[{label:'Keep original',run:closeModal},{label:'Use adjusted',primary:true,run:()=>{P[d.k]=nu;closeModal();rerenderPanelKeep()}}]})},
  'col-apply':()=>{const p=S.p;const pal=COL.results[COL.sel];const sc=$('#col-scope').value;COL.scope=sc;const key=sc==='app:'?'app:':sc;
    const before=lookFor(p,sc.startsWith('ent:')?sc.slice(4):null);const after=paletteToLook(pal,{});
    openModal({title:'Apply colours?',sub:scopeLabel(p,key),ic:'palette',wide:true,body:`<div class="ba"><div><b>Before</b>${appPreview(before.palette?before.palette[COL.mode]:{background:'#FFFFFF',surface:'#F5F1EE',elevated:'#FFFFFF',primary:before.primary,onPrimary:CL.bestOn(before.primary),secondary:'#888888',onSecondary:'#FFFFFF',text:'#1F1B1A',textSecondary:'#5C5552',link:CL.fit(before.primary,'#FFFFFF',4.5),border:'#E2DBD6',selected:'#F3E7E3',success:'#2E7D32',warning:'#8A5A00',error:'#B3261E',accent:before.primary},'')}</div><div><b>After</b>${appPreview(pal[COL.mode],'')}</div></div><p class="help">This changes ${esc(scopeLabel(p,key))} in Screens and Play. ${key==='app:'?'Pages with their own colours keep them.':'The rest of the app keeps the whole-app colours.'}</p>`,
      actions:[{label:'Cancel',run:closeModal},{label:'Apply',primary:true,run:()=>{closeModal();commit(`Apply “${pal.name}” colours to ${scopeLabel(p,key)}`,p=>{const cur=scopeLook(p,key);setScopeLook(p,key,paletteToLook(pal,cur));p.palettes.history.push(Object.assign(clone(pal),{appliedTo:scopeLabel(p,key),appliedAt:Date.now()}));if(p.palettes.history.length>20)p.palettes.history.shift()});lookCache.clear&&lookCache.clear();toast('Colours applied. See them in Screens or Play.')}}]})},
  'col-unset':d=>{const p=S.p;commit('Use inherited colours for '+scopeLabel(p,d.v),p=>setScopeLook(p,d.v,undefined));},
  'col-fav-save':()=>{const pal=COL.results[COL.sel];openModal({title:'Save to favourites',ic:'star',body:`<div class="field"><label for="fav-n">Name</label><input id="fav-n" class="inp" value="${esc(pal.name)}"></div><p class="help">Saving with a name you've used before adds a new version.</p>`,
    actions:[{label:'Cancel',run:closeModal},{label:'Save',primary:true,run:()=>{const name=($('#fav-n').value||'').trim()||pal.name;closeModal();commit('Save favourite palette',p=>{const f=p.palettes.favourites.find(x=>x.name===name);const v=clone(pal);v.created=Date.now();if(f)f.versions.push(v);else p.palettes.favourites.push({name,versions:[v]})});toast('Saved “'+name+'”')}}]})},
  'col-fav-load':d=>{const f=S.p.palettes.favourites[+d.i];const v=f.versions[f.versions.length-1];COL.results=[Object.assign(clone(v),{name:f.name})];COL.sel=0;COL.seeds=v.seeds.slice();COL.locked=new Set(v.locked||[]);rerenderPanelKeep()},
  'col-fav-del':d=>{const f=S.p.palettes.favourites[+d.i];confirmModal('Remove favourite?',`“${esc(f.name)}” and its ${f.versions.length} version(s) will be removed. You can undo this.`,'Remove',()=>commit('Remove favourite palette',p=>{p.palettes.favourites.splice(+d.i,1)}))},
  'col-hist-load':d=>{const v=S.p.palettes.history[+d.i];COL.results=[clone(v)];COL.sel=0;COL.seeds=v.seeds.slice();rerenderPanelKeep()},
  'col-tokens':()=>{const pal=COL.results[COL.sel];const json=paletteTokens(pal);openModal({title:'Design tokens',sub:pal.name,ic:'download',wide:true,body:`<pre class="out">${esc(json.css)}</pre>`,actions:[{label:'Copy CSS',icon:'copy',run:()=>{navigator.clipboard&&navigator.clipboard.writeText(json.css).then(()=>toast('CSS copied'),()=>toast("Couldn't copy. Select the text instead."))}},{label:'Download JSON',primary:true,icon:'download',run:()=>download('colour-tokens.json',json.json)}]})},
  'col-usage':()=>{const p=S.p;const map={};for(const[sc,l] of allLookScopes(p))for(const c of lookColours(l))(map[c]=map[c]||[]).push(scopeLabel(p,sc==='app:'?'app:':sc));
    openModal({title:'Colour usage',ic:'search',wide:true,body:`<div class="list">${Object.entries(map).map(([c,w])=>`<div class="li">${swatch(c,'')}<span class="grow"><code>${c}</code><small>${esc([...new Set(w)].join(', '))}</small></span></div>`).join('')||'<p class="help">No colours applied yet.</p>'}</div>`,actions:[{label:'Close',primary:true,run:closeModal}]})},
  'col-replace':()=>{const p=S.p;const all=new Set();for(const[,l] of allLookScopes(p))lookColours(l).forEach(c=>all.add(c));
    openModal({title:'Replace a colour',ic:'pen',body:`<div class="field"><label for="rp-a">Find</label><select id="rp-a" class="inp">${[...all].map(c=>opt(c,'',c)).join('')}</select></div><div class="field"><label for="rp-b">Replace with</label><input id="rp-b" class="inp" type="color" value="#2D6A4F"></div><div class="field"><label for="rp-s">Where</label><select id="rp-s" class="inp">${[['all','Everywhere'],['app:','Whole-app colours only'],...Object.values(p.modules).map(m=>['mod:'+m.id,'Module: '+m.name])].map(([k,l])=>opt(k,'all',l)).join('')}</select></div><p id="rp-n" class="help"></p>`,
      actions:[{label:'Cancel',run:closeModal},{label:'Replace',primary:true,run:()=>{const a=$('#rp-a').value,b=CL.norm($('#rp-b').value),w=$('#rp-s').value;closeModal();let n=0;
        commit(`Replace ${a} with ${b}`,p=>{for(const[sc,l] of allLookScopes(p)){if(w!=='all'&&sc!==w)continue;if(l.primary&&CL.norm(l.primary)===a){l.primary=b;n++}if(l.palette)for(const m of ['light','dark'])for(const k of Object.keys(l.palette[m]||{}))if(CL.norm(l.palette[m][k])===a){l.palette[m][k]=b;n++}}});lookCache.clear&&lookCache.clear();toast(`Replaced ${n} use${n===1?'':'s'}`)}}]})},
  'col-export':()=>download(`${S.p.name.replace(/\W+/g,'-').toLowerCase()}-palettes.json`,JSON.stringify({format:'flowmate-palettes',favourites:S.p.palettes.favourites,history:S.p.palettes.history},null,2)),
});
function paletteTokens(pal){const o={};for(const m of ['light','dark']){o[m]={};for(const[k,v] of Object.entries(pal[m]))o[m][k]={$type:'color',$value:v}}
  const css=`/* ${pal.name}: colour tokens from FlowMate */\n:root{\n${Object.entries(pal.light).map(([k,v])=>`  --color-${k.replace(/[A-Z]/g,x=>'-'+x.toLowerCase())}: ${v};`).join('\n')}\n}\n@media (prefers-color-scheme: dark){\n  :root{\n${Object.entries(pal.dark).map(([k,v])=>`    --color-${k.replace(/[A-Z]/g,x=>'-'+x.toLowerCase())}: ${v};`).join('\n')}\n  }\n}\n`;
  return {json:JSON.stringify({name:pal.name,color:o},null,2),css}}
document.addEventListener('change',async ev=>{
  const t=ev.target;const a=t.dataset&&t.dataset.actChange;if(!a||!a.startsWith('col-'))return;
  if(a==='col-photo'){for(const f of [...t.files].slice(0,6)){const url=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(f)});const img=new Image();await new Promise(r=>{img.onload=r;img.onerror=r;img.src=url});const cols=extractColours(img).map((c,i)=>Object.assign(c,{on:i<3}));
      const small=document.createElement('canvas');const sc=Math.min(1,160/img.naturalWidth);small.width=Math.max(1,img.naturalWidth*sc);small.height=Math.max(1,img.naturalHeight*sc);small.getContext('2d').drawImage(img,0,0,small.width,small.height);
      COL.photos.push({url:small.toDataURL('image/jpeg',.7),cols,summary:analyseSet(cols)})}syncSeeds();t.value='';rerenderPanelKeep();toast('Colours taken from your photo'+(t.files.length>1?'s':''))}
  if(a==='col-wheel')addSeeds([t.value]);
  if(a==='col-fav'&&t.value!==''){const f=S.p.palettes.favourites[+t.value];addSeeds(f.versions[f.versions.length-1].seeds)}
  if(a==='col-cvd'){COL.cvd=t.value;rerenderPanelKeep()}
  if(a==='col-scope')COL.scope=t.value;
  if(a==='col-import'){const f=t.files[0];if(!f)return;try{const o=JSON.parse(await f.text());if(o.format!=='flowmate-palettes')throw new Error("This isn't a FlowMate palette file.");commit('Import palettes',p=>{for(const fv of o.favourites||[])if(fv&&fv.name&&Array.isArray(fv.versions))p.palettes.favourites.push(fv)});toast('Palettes imported')}catch(e){toast(e.message||"Couldn't read that file")}t.value=''}
});
