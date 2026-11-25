/* ---------- Appearance engine (runs before first paint) ----------
   The five theme objects below are the supplied flowmate-theme.json files, unchanged.
   Everything else (layout variants, preferences) lives outside them. */
window.FMT=(function(){
  var THEMES=/*THEMES_JSON*/;
  var ORDER=['mist-cobalt','warm-canvas','orbit-system','bold-play','mono-studio'];
  var DEFAULT_ID='mist-cobalt';
  var LINKS=['navigate','function','data','condition','error','permission','api','reference'];
  var HEX=/^#[0-9A-Fa-f]{6}$/;
  /* Layout variant notes for each theme. Kept outside the JSON on purpose. */
  var META={
    'mist-cobalt':{headFallback:'system-ui, sans-serif',variant:'Soft cards, pill controls, airy module areas'},
    'warm-canvas':{headFallback:'Georgia, serif',variant:'Editorial serif headings, tab-shaped module labels'},
    'orbit-system':{headFallback:'system-ui, sans-serif',variant:'Precise console, angular panels, accent outlines'},
    'bold-play':{headFallback:'system-ui, sans-serif',variant:'Thick outlines, solid offset shadows, chunky buttons'},
    'mono-studio':{headFallback:'system-ui, sans-serif',variant:'Flat workbench, compact rectangles, node IDs'}
  };
  var AP_DEF={apVersion:1,themeId:DEFAULT_ID,theme:'auto',textSize:100,density:'comfortable',motion:'auto',contrast:false,grid:true,linkLabels:true};
  var SIZES=[100,115,130,150];
  function pick(v,list,d){return list.indexOf(v)>=0?v:d}
  /* Check every appearance value. Anything missing or broken falls back to the default. */
  function sanitize(p){
    p=(p&&typeof p==='object'&&!Array.isArray(p))?p:{};
    var o={};for(var k in p)o[k]=p[k];
    o.apVersion=1;
    o.themeId=THEMES[p.themeId]?p.themeId:DEFAULT_ID;
    o.theme=pick(p.theme,['auto','light','dark'],'auto');
    var ts=+p.textSize;if(ts===160)ts=150;o.textSize=pick(ts,SIZES,100);
    o.density=pick(p.density,['comfortable','compact'],'comfortable');
    o.motion=pick(p.motion,['auto','off'],'auto');
    o.contrast=p.contrast===true||p.contrast==='true';
    o.grid=!(p.grid===false||p.grid==='false');
    o.linkLabels=!(p.linkLabels===false||p.linkLabels==='false');
    return o;
  }
  function systemDark(){try{return matchMedia('(prefers-color-scheme: dark)').matches}catch(e){return false}}
  function effMode(pref){
    if(pref==='dark'||pref==='light')return pref;
    var host=document.documentElement.getAttribute('data-theme');
    if(host==='dark'||host==='light')return host;
    return systemDark()?'dark':'light';
  }
  function kebab(k){return k.replace(/[A-Z0-9]+/g,function(m){return '-'+m.toLowerCase()})}
  function rgb(h){return [parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)]}
  function rgba(h,a){var c=rgb(h);return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'}
  function mix(a,b,t){var x=rgb(a),y=rgb(b);return '#'+[0,1,2].map(function(i){return ('0'+Math.round(x[i]*(1-t)+y[i]*t).toString(16)).slice(-2)}).join('').toUpperCase()}
  function lum(h){return rgb(h).map(function(v){v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)}).reduce(function(s,v,i){return s+v*[.2126,.7152,.0722][i]},0)}
  function contrast(a,b){var x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
  function shadowFor(t,c,mode){
    var s=t.shape.shadowStyle;
    if(s==='flat')return '0 0 0 0 transparent';
    if(s==='strong')return '3px 3px 0 0 '+(mode==='dark'?mix(c.primary,c.card,.55):c.shadow);
    return mode==='dark'?'0 10px 24px -10px '+rgba(c.shadow,.7)+', 0 1px 2px '+rgba(c.shadow,.45):'0 8px 22px -10px '+rgba(c.shadow,.32)+', 0 1px 2px '+rgba(c.shadow,.12);
  }
  /* Turn a theme + mode into CSS custom properties.
     --fm-* follow the JSON keys; the short names are the ones FlowMate's styles already use. */
  function vars(id,mode,opt){
    opt=opt||{};var t=THEMES[id]||THEMES[DEFAULT_ID];var c={};var src=t[mode]||t.light;
    for(var k in src)c[k]=src[k];
    if(opt.contrast){c.ink2=c.ink;c.line=c.ink;c.dot=mix(c.dot,c.ink,.25)}
    var v={};
    for(k in c){if(k==='links'||k==='modules')continue;v['--fm-'+kebab(k)]=c[k]}
    LINKS.forEach(function(l){v['--fm-link-'+l]=c.links[l]});
    c.modules.forEach(function(m,i){v['--fm-module-'+i]=m});
    var df='"'+t.fonts.display.family+'", '+(META[id]||META[DEFAULT_ID]).headFallback;
    var bf='"'+t.fonts.body.family+'", system-ui, sans-serif';
    v['--fm-font-display']=df;v['--fm-font-body']=bf;
    v['--fm-base-size']=t.fonts.baseSizePx+'px';v['--fm-line-height']=t.fonts.lineHeight;v['--fm-letter-spacing']=t.fonts.letterSpacingEm+'em';
    v['--fm-radius-sm']=t.shape.radiusSmallPx+'px';v['--fm-radius']=t.shape.radiusPx+'px';v['--fm-radius-lg']=t.shape.radiusLargePx+'px';
    v['--fm-border-width']=t.shape.borderWidthPx+'px';v['--fm-shadow-style']=t.shape.shadowStyle;
    v['--fm-shadow-css']=shadowFor(t,c,mode);
    /* Names the existing styles use */
    var a={'--canvas':c.canvas,'--card':c.card,'--bar':c.bar,'--row':c.row,'--row-hot':c.rowHot,'--ink':c.ink,'--ink-2':c.ink2,'--line':c.line,'--dot':c.dot,
      '--coral':c.primary,'--coral-fill':c.primary,'--on-fill':c.onPrimary,'--coral-text':c.primaryText,'--blush':c.primaryFill,
      '--gold':c.accent,'--gold-fill':c.accent,'--on-gold':c.onAccent,'--oak':c.line,
      '--ok-bg':c.okBg,'--ok-ink':c.okInk,'--warn-bg':c.warnBg,'--warn-ink':c.warnInk,'--pink-bg':c.pinkBg,'--pink-ink':c.pinkInk,
      '--grey-bg':c.greyBg,'--grey-ink':c.greyInk,'--bad':c.badInk,'--bad-bg':c.badBg,
      '--e-nav':c.links.navigate,'--e-fn':c.links['function'],'--e-data':c.links.data,'--e-cond':c.links.condition,'--e-err':c.links.error,'--e-perm':c.links.permission,'--e-api':c.links.api,'--e-ref':c.links.reference,
      '--m-coral':c.modules[0],'--m-gold':c.modules[1],'--m-oak':c.modules[2],'--m-rose':c.modules[3],'--m-sage':c.modules[4],'--m-clay':c.modules[5],
      '--font-display':df,'--font-body':bf,'--shadow':v['--fm-shadow-css'],'--overlay':mode==='dark'?'rgba(0,0,0,.6)':rgba(c.ink,.45)};
    for(k in a)v[k]=a[k];
    return v;
  }
  function css(v){var s='';for(var k in v)s+=k+':'+v[k]+';';return s}
  function familyParams(id){var t=THEMES[id];return [t.fonts.display.googleFontsUrl,t.fonts.body.googleFontsUrl].map(function(u){var m=/family=([^&]+)/.exec(u);return m?m[1]:''}).filter(Boolean)}
  function fontsUrl(ids){var f=[];ids.forEach(function(id){familyParams(id).forEach(function(x){if(f.indexOf(x)<0)f.push(x)})});return 'https://fonts.googleapis.com/css2?'+f.map(function(x){return 'family='+x}).join('&')+'&display=swap'}
  function addLink(id,href){
    var l=document.getElementById(id);if(l&&l.getAttribute('href')===href)return;
    if(!l){l=document.createElement('link');l.id=id;l.rel='stylesheet';document.head.appendChild(l)}
    l.setAttribute('href',href);
  }
  function loadFonts(id){addLink('fm-font',fontsUrl([id]))}
  function loadAllFonts(){addLink('fm-font-all',fontsUrl(ORDER))}
  var last={};
  /* Apply appearance to the whole editor. Only touches the editor; planned apps keep their own look. */
  function apply(p){
    p=sanitize(p);var root=document.documentElement;var mode=effMode(p.theme);
    var st=document.getElementById('fm-tv');
    if(!st){st=document.createElement('style');st.id='fm-tv';document.head.appendChild(st)}
    var text='html:root[data-fm-theme][data-fm-mode]{'+css(vars(p.themeId,mode,{contrast:p.contrast}))+'color-scheme:'+mode+'}';
    if(st.textContent!==text)st.textContent=text;
    root.setAttribute('data-fm-theme',p.themeId);
    root.setAttribute('data-fm-mode',mode);
    root.setAttribute('data-contrast',p.contrast?'high':'normal');
    root.setAttribute('data-motion',p.motion);
    root.setAttribute('data-density',p.density);
    root.setAttribute('data-grid',p.grid?'on':'off');
    root.setAttribute('data-link-labels',p.linkLabels?'on':'off');
    root.style.fontSize=(p.textSize/100*THEMES[p.themeId].fonts.baseSizePx)+'px';
    root.style.setProperty('--cts',p.textSize/100);
    loadFonts(p.themeId);
    last={id:p.themeId,mode:mode};
    return last;
  }
  return {THEMES:THEMES,ORDER:ORDER,DEFAULT_ID:DEFAULT_ID,LINKS:LINKS,META:META,AP_DEF:AP_DEF,SIZES:SIZES,HEX:HEX,
    sanitize:sanitize,effMode:effMode,vars:vars,css:css,apply:apply,loadAllFonts:loadAllFonts,fontsUrl:fontsUrl,contrast:contrast,mix:mix,current:function(){return last}};
})();
(function(){var p={};try{p=JSON.parse(localStorage.getItem('fm.prefs')||'{}')}catch(e){p={}}try{FMT.apply(p)}catch(e){FMT.apply({})}})();
