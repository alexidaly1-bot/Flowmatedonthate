/* ---------- Appearance engine (runs before first paint) ----------
   The five theme objects below are the supplied flowmate-theme.json files, unchanged.
   Everything else (layout variants, preferences) lives outside them. */
window.FMT=(function(){
  var THEMES={"mist-cobalt":{"name":"Mist Cobalt","mood":"Calm, polished product studio with soft modular panels.","colourblindChecked":"Machado 100% severity simulation: protanopia, deuteranopia, tritanopia; numerical sRGB/CIELAB palette check, not a human or rendered-interface test. Link/status labels, symbols and patterns required. See validation report for minimum pair distances.","fonts":{"display":{"family":"Manrope","weights":[700,800],"googleFontsUrl":"https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&display=swap"},"body":{"family":"Nunito Sans","weights":[400,600,700],"googleFontsUrl":"https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700&display=swap"},"baseSizePx":16,"lineHeight":1.45,"letterSpacingEm":0},"shape":{"radiusSmallPx":6,"radiusPx":12,"radiusLargePx":20,"borderWidthPx":1,"shadowStyle":"soft"},"light":{"canvas":"#EBF2F6","card":"#FFFFFF","bar":"#E2EBF2","row":"#F8FAFC","rowHot":"#E0E7F4","ink":"#182535","ink2":"#40556A","line":"#777777","dot":"#BDC5CC","shadow":"#615B55","primary":"#0E43A9","primaryFill":"#E0E7F4","primaryText":"#0E43A9","onPrimary":"#FFFFFF","accent":"#B43B25","accentFill":"#F6E7E5","onAccent":"#FFFFFF","soft":"#FAF1F0","neutralWarm":"#E5EAF1","okBg":"#EAF3F2","okInk":"#16766D","warnBg":"#F4EFE8","warnInk":"#875200","badBg":"#F7EBED","badInk":"#A31D39","pinkBg":"#F4EDF4","pinkInk":"#823B80","greyBg":"#EEEEEF","greyInk":"#45474D","links":{"navigate":"#2222FF","function":"#661100","data":"#9900BB","condition":"#000044","error":"#BB3300","permission":"#554477","api":"#226655","reference":"#330011"},"modules":["#DEEDFD","#FBE6E2","#EDE6FC","#E2F3EB","#F9EED7","#E5EDF7"]},"dark":{"canvas":"#0F172A","card":"#1E293B","bar":"#19263A","row":"#192335","rowHot":"#2A3A53","ink":"#F8FAFC","ink2":"#CBD8E8","line":"#858585","dot":"#424958","shadow":"#080A10","primary":"#83B5FF","primaryFill":"#2A3A53","primaryText":"#83B5FF","onPrimary":"#000000","accent":"#FFA38B","accentFill":"#393845","onAccent":"#000000","soft":"#2E3241","neutralWarm":"#303C50","okBg":"#29434E","okInk":"#70F2D1","warnBg":"#3B3F43","warnInk":"#FFD17C","badBg":"#3B3547","badInk":"#FF879B","pinkBg":"#383B54","pinkInk":"#E8B5FF","greyBg":"#323C4D","greyInk":"#B8BEC8","links":{"navigate":"#22AAFF","function":"#CC9955","data":"#EEBBEE","condition":"#AAFF77","error":"#FF8811","permission":"#99AA99","api":"#55FFAA","reference":"#FFFFFF"},"modules":["#203A53","#3C2C36","#322B4B","#203B38","#3A3328","#24334C"]},"notes":"Use the matching layout and visual direction in IMPLEMENTATION.md. No botanical imagery. Use filled or clearly visible icons with labels, explicit link patterns and status icons. Apply all tokens consistently; do not claim full WCAG conformance until rendered UI is tested."},"warm-canvas":{"name":"Warm Canvas","mood":"Warm editorial, tactile without decorative plants.","colourblindChecked":"Machado 100% severity simulation: protanopia, deuteranopia, tritanopia; numerical sRGB/CIELAB palette check, not a human or rendered-interface test. Link/status labels, symbols and patterns required. See validation report for minimum pair distances.","fonts":{"display":{"family":"Fraunces","weights":[700,800],"googleFontsUrl":"https://fonts.googleapis.com/css2?family=Fraunces:wght@700;800&display=swap"},"body":{"family":"Atkinson Hyperlegible","weights":[400,600,700],"googleFontsUrl":"https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;600;700&display=swap"},"baseSizePx":16,"lineHeight":1.45,"letterSpacingEm":0},"shape":{"radiusSmallPx":5,"radiusPx":11,"radiusLargePx":19,"borderWidthPx":1,"shadowStyle":"soft"},"light":{"canvas":"#F9F1E7","card":"#FFFFFF","bar":"#F1E6D8","row":"#FDFAF7","rowHot":"#F3E7E3","ink":"#22201F","ink2":"#55483F","line":"#777777","dot":"#CAC3BB","shadow":"#615B55","primary":"#A14425","primaryFill":"#F3E7E3","primaryText":"#A14425","onPrimary":"#FFFFFF","accent":"#28666B","accentFill":"#E5EDED","onAccent":"#FFFFFF","soft":"#F0F4F5","neutralWarm":"#EADACA","okBg":"#EAF3F2","okInk":"#16766D","warnBg":"#F4EFE8","warnInk":"#875200","badBg":"#F7EBED","badInk":"#A31D39","pinkBg":"#F4EDF4","pinkInk":"#823B80","greyBg":"#EEEEEF","greyInk":"#45474D","links":{"navigate":"#2222FF","function":"#661100","data":"#9900BB","condition":"#000044","error":"#BB3300","permission":"#554477","api":"#226655","reference":"#330011"},"modules":["#E8F2F3","#FBE9DB","#E9F0E3","#F1E9F7","#F7EEDB","#E9EBF2"]},"dark":{"canvas":"#191D25","card":"#262B35","bar":"#22252E","row":"#21262F","rowHot":"#3E3A3E","ink":"#FFF6EA","ink2":"#E1D7CD","line":"#898989","dot":"#4C4D50","shadow":"#080A10","primary":"#F2A47F","primaryFill":"#3E3A3E","primaryText":"#F2A47F","onPrimary":"#000000","accent":"#9EDDDC","accentFill":"#344049","onAccent":"#000000","soft":"#2E3741","neutralWarm":"#493C36","okBg":"#304549","okInk":"#70F2D1","warnBg":"#42413E","warnInk":"#FFD17C","badBg":"#423742","badInk":"#FF879B","pinkBg":"#3F3D4F","pinkInk":"#E8B5FF","greyBg":"#393E48","greyInk":"#B8BEC8","links":{"navigate":"#22AAFF","function":"#CC9955","data":"#EEBBEE","condition":"#AAFF77","error":"#FF8811","permission":"#99AA99","api":"#55FFAA","reference":"#FFFFFF"},"modules":["#243842","#3C2B29","#29382F","#342D43","#3A342A","#2C3443"]},"notes":"Use the matching layout and visual direction in IMPLEMENTATION.md. No botanical imagery. Use filled or clearly visible icons with labels, explicit link patterns and status icons. Apply all tokens consistently; do not claim full WCAG conformance until rendered UI is tested."},"orbit-system":{"name":"Orbit System","mood":"Futuristic instrument panel, electric cyan and ultraviolet.","colourblindChecked":"Machado 100% severity simulation: protanopia, deuteranopia, tritanopia; numerical sRGB/CIELAB palette check, not a human or rendered-interface test. Link/status labels, symbols and patterns required. See validation report for minimum pair distances.","fonts":{"display":{"family":"Space Grotesk","weights":[700,800],"googleFontsUrl":"https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800&display=swap"},"body":{"family":"Sora","weights":[400,600,700],"googleFontsUrl":"https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap"},"baseSizePx":16,"lineHeight":1.45,"letterSpacingEm":0},"shape":{"radiusSmallPx":3,"radiusPx":8,"radiusLargePx":13,"borderWidthPx":1,"shadowStyle":"flat"},"light":{"canvas":"#F1F4FA","card":"#FFFFFF","bar":"#E9EDF8","row":"#FAFBFD","rowHot":"#E9E4F6","ink":"#101729","ink2":"#38445D","line":"#777777","dot":"#C0C3CC","shadow":"#615B55","primary":"#5731BA","primaryFill":"#E9E4F6","primaryText":"#5731BA","onPrimary":"#FFFFFF","accent":"#00647D","accentFill":"#E0ECEF","onAccent":"#FFFFFF","soft":"#EDF4F6","neutralWarm":"#E2E6F1","okBg":"#EAF3F2","okInk":"#16766D","warnBg":"#F4EFE8","warnInk":"#875200","badBg":"#F7EBED","badInk":"#A31D39","pinkBg":"#F4EDF4","pinkInk":"#823B80","greyBg":"#EEEEEF","greyInk":"#45474D","links":{"navigate":"#2222FF","function":"#661100","data":"#9900BB","condition":"#000044","error":"#BB3300","permission":"#554477","api":"#226655","reference":"#330011"},"modules":["#E0F5FA","#EFE7FC","#F0F3D8","#F8E8F4","#E5EDF9","#E8EAF0"]},"dark":{"canvas":"#080E14","card":"#121B27","bar":"#111723","row":"#0E1620","rowHot":"#10323F","ink":"#F3F7FF","ink2":"#C3D3E3","line":"#7C7C7C","dot":"#3C4148","shadow":"#080A10","primary":"#00D9F2","primaryFill":"#10323F","primaryText":"#00D9F2","onPrimary":"#000000","accent":"#CBF85A","accentFill":"#28362D","onAccent":"#000000","soft":"#1F2A2B","neutralWarm":"#283043","okBg":"#1E373D","okInk":"#70F2D1","warnBg":"#313332","warnInk":"#FFD17C","badBg":"#312936","badInk":"#FF879B","pinkBg":"#2E2F43","pinkInk":"#E8B5FF","greyBg":"#28303C","greyInk":"#B8BEC8","links":{"navigate":"#22AAFF","function":"#CC9955","data":"#EEBBEE","condition":"#AAFF77","error":"#FF8811","permission":"#99AA99","api":"#55FFAA","reference":"#FFFFFF"},"modules":["#102C36","#28213E","#28321C","#34223A","#172B42","#252B35"]},"notes":"Use the matching layout and visual direction in IMPLEMENTATION.md. No botanical imagery. Use filled or clearly visible icons with labels, explicit link patterns and status icons. Apply all tokens consistently; do not claim full WCAG conformance until rendered UI is tested."},"bold-play":{"name":"Bold Play","mood":"Graphic, playful neo-brutalist workspace with thick outlines.","colourblindChecked":"Machado 100% severity simulation: protanopia, deuteranopia, tritanopia; numerical sRGB/CIELAB palette check, not a human or rendered-interface test. Link/status labels, symbols and patterns required. See validation report for minimum pair distances.","fonts":{"display":{"family":"Bricolage Grotesque","weights":[700,800],"googleFontsUrl":"https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&display=swap"},"body":{"family":"Lexend","weights":[400,600,700],"googleFontsUrl":"https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700&display=swap"},"baseSizePx":16,"lineHeight":1.45,"letterSpacingEm":0},"shape":{"radiusSmallPx":4,"radiusPx":10,"radiusLargePx":15,"borderWidthPx":2,"shadowStyle":"strong"},"light":{"canvas":"#FFF8EE","card":"#FFFFFF","bar":"#EEE9FF","row":"#FFFDF9","rowHot":"#E3E5F8","ink":"#171717","ink2":"#454046","line":"#777777","dot":"#CCC6BF","shadow":"#615B55","primary":"#2439C7","primaryFill":"#E3E5F8","primaryText":"#2439C7","onPrimary":"#FFFFFF","accent":"#FFD600","accentFill":"#FFFAE0","onAccent":"#000000","soft":"#FFFCED","neutralWarm":"#F2E5CE","okBg":"#EAF3F2","okInk":"#16766D","warnBg":"#F4EFE8","warnInk":"#875200","badBg":"#F7EBED","badInk":"#A31D39","pinkBg":"#F4EDF4","pinkInk":"#823B80","greyBg":"#EEEEEF","greyInk":"#45474D","links":{"navigate":"#2222FF","function":"#661100","data":"#9900BB","condition":"#000044","error":"#BB3300","permission":"#554477","api":"#226655","reference":"#330011"},"modules":["#E1ECFF","#FFF1BF","#FCE2EA","#EDE5FF","#DEF2EB","#F1EDE6"]},"dark":{"canvas":"#121218","card":"#202028","bar":"#191A25","row":"#1B1B22","rowHot":"#2F3142","ink":"#FFF9EF","ink2":"#E3D9EE","line":"#7F7F7F","dot":"#464547","shadow":"#080A10","primary":"#9FAAFF","primaryFill":"#2F3142","primaryText":"#9FAAFF","onPrimary":"#000000","accent":"#FFD600","accentFill":"#3B3623","onAccent":"#000000","soft":"#302D25","neutralWarm":"#39333C","okBg":"#2A3B3E","okInk":"#70F2D1","warnBg":"#3D3733","warnInk":"#FFD17C","badBg":"#3D2D37","badInk":"#FF879B","pinkBg":"#3A3344","pinkInk":"#E8B5FF","greyBg":"#34353D","greyInk":"#B8BEC8","links":{"navigate":"#22AAFF","function":"#CC9955","data":"#EEBBEE","condition":"#AAFF77","error":"#FF8811","permission":"#99AA99","api":"#55FFAA","reference":"#FFFFFF"},"modules":["#202D49","#393019","#3B2234","#31264A","#193630","#302D31"]},"notes":"Use the matching layout and visual direction in IMPLEMENTATION.md. No botanical imagery. Use filled or clearly visible icons with labels, explicit link patterns and status icons. Apply all tokens consistently; do not claim full WCAG conformance until rendered UI is tested."},"mono-studio":{"name":"Mono Studio","mood":"Professional desktop workbench, compact and distraction-free.","colourblindChecked":"Machado 100% severity simulation: protanopia, deuteranopia, tritanopia; numerical sRGB/CIELAB palette check, not a human or rendered-interface test. Link/status labels, symbols and patterns required. See validation report for minimum pair distances.","fonts":{"display":{"family":"Plus Jakarta Sans","weights":[700,800],"googleFontsUrl":"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&display=swap"},"body":{"family":"IBM Plex Sans","weights":[400,600,700],"googleFontsUrl":"https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&display=swap"},"baseSizePx":16,"lineHeight":1.45,"letterSpacingEm":0},"shape":{"radiusSmallPx":3,"radiusPx":6,"radiusLargePx":10,"borderWidthPx":1,"shadowStyle":"flat"},"light":{"canvas":"#F7F6F3","card":"#FFFFFF","bar":"#EAE8E5","row":"#FCFCFB","rowHot":"#F4E7DF","ink":"#1F2328","ink2":"#46505B","line":"#777777","dot":"#C7C8C6","shadow":"#615B55","primary":"#A74308","primaryFill":"#F4E7DF","primaryText":"#A74308","onPrimary":"#FFFFFF","accent":"#48566B","accentFill":"#E9EBED","onAccent":"#FFFFFF","soft":"#F2F3F5","neutralWarm":"#E8E2D9","okBg":"#EAF3F2","okInk":"#16766D","warnBg":"#F4EFE8","warnInk":"#875200","badBg":"#F7EBED","badInk":"#A31D39","pinkBg":"#F4EDF4","pinkInk":"#823B80","greyBg":"#EEEEEF","greyInk":"#45474D","links":{"navigate":"#2222FF","function":"#661100","data":"#9900BB","condition":"#000044","error":"#BB3300","permission":"#554477","api":"#226655","reference":"#330011"},"modules":["#E8EDF3","#F7EBDD","#EBEFF0","#EDE9F3","#E5EFE8","#ECEBE7"]},"dark":{"canvas":"#111316","card":"#1B1D21","bar":"#24272D","row":"#181A1D","rowHot":"#362E2B","ink":"#F5F5F5","ink2":"#C9D0D8","line":"#818181","dot":"#434547","shadow":"#080A10","primary":"#FFAC76","primaryFill":"#362E2B","primaryText":"#FFAC76","onPrimary":"#000000","accent":"#B1C2D9","accentFill":"#2D3137","onAccent":"#000000","soft":"#26292E","neutralWarm":"#393733","okBg":"#263938","okInk":"#70F2D1","warnBg":"#39342D","warnInk":"#FFD17C","badBg":"#392B31","badInk":"#FF879B","pinkBg":"#36313E","pinkInk":"#E8B5FF","greyBg":"#2F3237","greyInk":"#B8BEC8","links":{"navigate":"#22AAFF","function":"#CC9955","data":"#EEBBEE","condition":"#AAFF77","error":"#FF8811","permission":"#99AA99","api":"#55FFAA","reference":"#FFFFFF"},"modules":["#232D3A","#372A21","#252C30","#302B3B","#26332D","#303033"]},"notes":"Use the matching layout and visual direction in IMPLEMENTATION.md. No botanical imagery. Use filled or clearly visible icons with labels, explicit link patterns and status icons. Apply all tokens consistently; do not claim full WCAG conformance until rendered UI is tested."}};
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
