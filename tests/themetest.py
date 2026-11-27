import os as _os, pathlib as _pl
_os.chdir(_os.path.dirname(_os.path.abspath(__file__)))
APP=_pl.Path('../dist/index.html').resolve().as_uri()
import json,glob,os
from playwright.sync_api import sync_playwright
bm=open('fixtures/bm_final.json').read()
IDS=['mist-cobalt','warm-canvas','orbit-system','bold-play','mono-studio']
KIT={i:json.load(open(f'fixtures/kit/{i}/flowmate-theme.json')) for i in IDS}
res={};errs=[];notes={}
CONTRAST_JS=r"""
(()=>{
 const parse=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return [p[0],p[1],p[2],p.length>3?p[3]:1]};
 const over=(f,b)=>{const a=f[3];return [f[0]*a+b[0]*(1-a),f[1]*a+b[1]*(1-a),f[2]*a+b[2]*(1-a),1]};
 const L=c=>{const v=c.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2]};
 const cr=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 function bgOf(el){const stack=[];let n=el;while(n&&n.nodeType===1){const cs=getComputedStyle(n);const c=parse(cs.backgroundColor);if(cs.backgroundImage&&cs.backgroundImage!=='none'&&!n.matches('.canvas-wrap'))return null;if(c&&c[3]>0){stack.push(c);if(c[3]>=1)break}n=n.parentElement}
  let b=[255,255,255,1];const root=parse(getComputedStyle(document.body).backgroundColor);if(root)b=root;for(let i=stack.length-1;i>=0;i--)b=over(stack[i],b);return b}
 function opac(el){let o=1,n=el;while(n&&n.nodeType===1){o*=+getComputedStyle(n).opacity;n=n.parentElement}return o}
 const sels=['body','.topbar .proj-switch','.nav','.nav.on','.nav-label','.btn','.btn.primary','.btn.gold','.chips button','.chips button.on','.chip[class*="st-"]','.elabel .lt','.frame .fl','.frame .fl small','.card .ttl','.card .kind','.card .meta','.el .lab','.el .dest','.flabel','.help','.li b','.li small','.sa-btn','.zoom-pct','.inp','.crumbs button','.seg button','.collapse-btn','.lg-row .nm','.thc .thn b','.thc .thn small','.thc .thk','#panel h2','.ed-head h2','.field>label','.card.decision .ttl','.toast'];
 const out=[];let min=99;let count=0;
 for(const s of sels){for(const el of [...document.querySelectorAll(s)].slice(0,40)){
   const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')continue;
   if(!el.textContent.trim())continue;{const dd=el.closest('details:not([open])');if(dd&&!el.closest('summary'))continue}if(el.checkVisibility&&!el.checkVisibility({contentVisibilityAuto:true}))continue;
   const f=parse(cs.color);const b=bgOf(el);if(!f||!b)continue;
   const fc=over([f[0],f[1],f[2],f[3]*opac(el)],b);const c=cr(fc,b);count++;
   if(c<min)min=c;if(c<4.5)out.push(s+' "'+el.textContent.trim().slice(0,24)+'" '+c.toFixed(2));
 }}
 return {min:+min.toFixed(2),count,fails:[...new Set(out)].slice(0,12)};
})()
"""
def lin(c):
    c=c/255;return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
def hexrgb(h):return [int(h[i:i+2],16) for i in (1,3,5)]
M={'normal':[[1,0,0],[0,1,0],[0,0,1]],'protanopia':[[.152286,1.052583,-.204868],[.114503,.786281,.099216],[-.003882,-.048116,1.051998]],'deuteranopia':[[.367322,.860646,-.227968],[.280085,.672501,.047413],[-.01182,.04294,.968881]],'tritanopia':[[1.255528,-.076749,-.178779],[-.078411,.930809,.147602],[.004733,.691367,.3039]]}
def lab(h,m):
    l=[lin(x) for x in hexrgb(h)];l=[min(1,max(0,sum(m[i][j]*l[j] for j in range(3)))) for i in range(3)]
    X=(.4124*l[0]+.3576*l[1]+.1805*l[2])/.95047;Y=(.2126*l[0]+.7152*l[1]+.0722*l[2]);Z=(.0193*l[0]+.1192*l[1]+.9505*l[2])/1.08883
    f=lambda t:t**(1/3) if t>.008856 else 7.787*t+16/116
    return (116*f(Y)-16,500*(f(X)-f(Y)),200*(f(Y)-f(Z)))
def dE(a,b):return sum((x-y)**2 for x,y in zip(a,b))**.5

with sync_playwright() as pw:
    b=pw.chromium.launch();ctx=b.new_context(viewport={'width':1280,'height':800});pg=ctx.new_page()
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(APP);pg.wait_for_timeout(300)
    pg.evaluate("j=>{localStorage.clear();const p=JSON.parse(j);localStorage.setItem('fm.p.'+p.id,j);localStorage.setItem('fm.index',JSON.stringify([p.id]));localStorage.setItem('fm.last',p.id)}",bm)
    pg.reload();pg.wait_for_timeout(800)
    # T1 registry
    reg=pg.evaluate("FMT.THEMES")
    res['T1_registry_exact_json']=all(reg[i]==KIT[i] for i in IDS) and list(pg.evaluate("FMT.ORDER"))==IDS
    hexok=pg.evaluate("""(()=>{let ok=true;for(const t of Object.values(FMT.THEMES))for(const m of ['light','dark']){const c=t[m];for(const[k,v] of Object.entries(c)){if(k==='links')Object.values(v).forEach(x=>ok=ok&&FMT.HEX.test(x));else if(k==='modules')ok=ok&&v.length===6&&v.every(x=>FMT.HEX.test(x));else ok=ok&&FMT.HEX.test(v)}}return ok})()""")
    res['T1_all_hex_valid']=hexok
    res['T1_default_is_mist_cobalt']=pg.evaluate("document.documentElement.dataset.fmTheme")=='mist-cobalt'
    # every key reaches a CSS variable
    res['T1_every_key_mapped']=pg.evaluate("""(()=>{const t=FMT.THEMES['bold-play'].light;const v=FMT.vars('bold-play','light');const keys=Object.keys(t).filter(k=>k!=='links'&&k!=='modules');return keys.every(k=>Object.values(v).includes(t[k])&&Object.keys(v).some(n=>n.startsWith('--fm-')&&v[n]===t[k]))&&FMT.LINKS.every(l=>v['--fm-link-'+l]===t.links[l])&&t.modules.every((m,i)=>v['--fm-module-'+i]===m)})()""")
    # T2 mode resolution
    pg.emulate_media(color_scheme='dark');pg.wait_for_timeout(200)
    a=pg.evaluate("document.documentElement.dataset.fmMode")
    pg.emulate_media(color_scheme='light');pg.wait_for_timeout(200)
    c=pg.evaluate("document.documentElement.dataset.fmMode")
    pg.evaluate("FM.S.prefs.theme='dark';FM.applyPrefs()");d=pg.evaluate("document.documentElement.dataset.fmMode")
    pg.evaluate("FM.S.prefs.theme='auto';FM.applyPrefs()")
    res['T2_system_mode_follows_and_overrides']=(a,c,d)==('dark','light','dark')
    # T6 theme switch keeps graph, zoom and selection
    pg.evaluate("FM.select({t:'entity',id:'pg_plan'});FM.centreOn('pg_plan',.85)");pg.wait_for_timeout(500)
    before=pg.evaluate("JSON.stringify([FM.S.view,FM.S.sel,FM.S.p.entities,FM.S.p.connections,FM.S.undo.length])")
    reports={}
    for th in IDS:
        for md in ['light','dark']:
            pg.evaluate(f"(()=>{{FM.S.prefs.themeId='{th}';FM.S.prefs.theme='{md}';FM.applyPrefs();FM.renderCanvas()}})()");pg.wait_for_timeout(250)
            reports[f'{th}/{md}']=pg.evaluate(CONTRAST_JS)
    after=pg.evaluate("JSON.stringify([FM.S.view,FM.S.sel,FM.S.p.entities,FM.S.p.connections,FM.S.undo.length])")
    res['T6_switch_keeps_graph_zoom_selection']=before==after
    # contrast with the settings panel and editor open too
    pg.click('[data-act=panel][data-p=settings]');pg.wait_for_timeout(400)
    for th in IDS:
        for md in ['light','dark']:
            pg.evaluate(f"(()=>{{FM.S.prefs.themeId='{th}';FM.S.prefs.theme='{md}';FM.applyPrefs()}})()");pg.wait_for_timeout(200)
            r=pg.evaluate(CONTRAST_JS);k=f'{th}/{md}'
            reports[k]={'min':min(reports[k]['min'],r['min']),'count':reports[k]['count']+r['count'],'fails':reports[k]['fails']+r['fails']}
    pg.evaluate("FM.S.prefs.contrast=true;FM.S.prefs.themeId='bold-play';FM.S.prefs.theme='light';FM.applyPrefs()");pg.wait_for_timeout(200)
    reports['bold-play/light+increased']=pg.evaluate(CONTRAST_JS)
    hc=pg.evaluate("[getComputedStyle(document.documentElement).getPropertyValue('--ink-2').trim(),getComputedStyle(document.documentElement).getPropertyValue('--ink').trim(),getComputedStyle(document.documentElement).getPropertyValue('--line').trim()]")
    res['T12_increased_contrast_changes_tokens']=hc[0]==hc[1]==hc[2]
    pg.evaluate("FM.S.prefs.contrast=false;FM.applyPrefs()")
    notes['contrast']={k:(v['min'],v['count'],v['fails'][:6]) for k,v in reports.items()}
    res['T5_text_contrast_all_modes_4.5']=all(v['min']>=4.5 for v in reports.values())
    # T7 link families
    fam=pg.evaluate("(()=>{const d=Object.values(FM.FAMS).map(f=>f.dash);const types=['navigate','modal','trigger','read','write','setting','condition','permission','notify','background','api','workflow','back','error','reference'];return {dashUnique:new Set(d).size===8,allTyped:types.every(t=>FM.famOf(t)&&FM.FAMS[FM.famOf(t)]),lines:[...document.querySelectorAll('#edges .ln')].every(l=>/\\bf-/.test(l.getAttribute('class'))),glyph:[...document.querySelectorAll('.elabel')].every(l=>l.querySelector('.g'))}})()")
    res['T7_link_families_patterns_symbols']=all(fam.values())
    cb={}
    for md in ['light','dark']:
        L=list(KIT['mist-cobalt'][md]['links'].values())
        for name,m in M.items():
            labs=[lab(h,m) for h in L];cb[f'{md}/{name}']=round(min(dE(labs[i],labs[j]) for i in range(8) for j in range(i+1,8)),1)
    notes['link_min_deltaE76_28_pairs']=cb
    S2={}
    for md in ['light','dark']:
        c=KIT['mist-cobalt'][md];L=[c[k] for k in ['okInk','warnInk','badInk','pinkInk','greyInk']]
        for name,m in M.items():
            labs=[lab(h,m) for h in L];S2[f'{md}/{name}']=round(min(dE(labs[i],labs[j]) for i in range(5) for j in range(i+1,5)),1)
    notes['status_ink_min_deltaE76_10_pairs']=S2
    # T12 toggles
    pg.evaluate("FM.S.prefs.grid=false;FM.S.prefs.linkLabels=false;FM.applyPrefs()");pg.wait_for_timeout(100)
    tg=pg.evaluate("[getComputedStyle(document.querySelector('.canvas-wrap')).backgroundImage,[...document.querySelectorAll('.elabel .lt')].every(x=>getComputedStyle(x).display==='none'),document.querySelectorAll('.elabel .g').length>0]")
    res['T12_grid_and_label_toggles']=tg[0]=='none' and tg[1] and tg[2]
    pg.evaluate("FM.S.prefs.grid=true;FM.S.prefs.linkLabels=true;FM.applyPrefs()")
    # T3 persistence via the real UI + restore before first paint
    pg.click('[data-act=ap][data-k=themeId][data-v=orbit-system]');pg.wait_for_timeout(200)
    pg.click('[data-act=ap][data-k=theme][data-v=dark]');pg.wait_for_timeout(200)
    pg.click('[data-act=ap][data-k=textSize][data-v="130"]');pg.wait_for_timeout(200)
    ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{window.__early=[document.documentElement.dataset.fmTheme,document.documentElement.dataset.fmMode,!!document.getElementById('fm-tv')]},{once:true})")
    pg.reload();pg.wait_for_timeout(800)
    early=pg.evaluate("window.__early")
    res['T3_persists_and_restores_before_paint']=early==['orbit-system','dark',True] and pg.evaluate("document.documentElement.style.fontSize")=='20.8px'
    # T8 cross-tab sync
    pg2=ctx.new_page();pg2.goto(APP);pg2.wait_for_timeout(800)
    pg.evaluate("FM.S.prefs.themeId='warm-canvas';FM.applyPrefs();localStorage.setItem('fm.prefs',JSON.stringify(FM.S.prefs))");pg.wait_for_timeout(500)
    res['T8_other_tab_follows']=pg2.evaluate("document.documentElement.dataset.fmTheme")=='warm-canvas'
    pg2.close()
    # T9 reset appearance only
    proj=pg.evaluate("localStorage.getItem('fm.p.'+FM.S.p.id)")
    pg.click('[data-act=panel][data-p=settings]') if not pg.evaluate("FM.S.panel==='settings'") else None
    pg.wait_for_timeout(300);pg.click('[data-act=ap-reset]');pg.wait_for_timeout(400)
    r9=pg.evaluate("[FM.S.prefs.themeId,FM.S.prefs.theme,FM.S.prefs.textSize,FM.S.prefs.density,FM.S.prefs.contrast,FM.S.prefs.grid,FM.S.prefs.linkLabels]")
    res['T9_reset_appearance_keeps_projects']=r9==['mist-cobalt','auto',100,'comfortable',False,True,True] and proj==pg.evaluate("localStorage.getItem('fm.p.'+FM.S.p.id)")
    # T10 keyboard: radio arrows + visible focus ring
    pg.focus('[data-act=ap][data-k=themeId][aria-checked=true]');pg.keyboard.press('ArrowDown');pg.wait_for_timeout(500)
    k=pg.evaluate("[FM.S.prefs.themeId,document.activeElement.dataset.v,getComputedStyle(document.activeElement).outlineStyle,parseFloat(getComputedStyle(document.activeElement).outlineWidth)]")
    res['T10_keyboard_radio_and_focus_ring']=k[0]=='warm-canvas' and k[1]=='warm-canvas' and k[2]=='solid' and k[3]>=2
    # T4 corrupt or missing values
    for bad in ['{not json','[1,2]','{"themeId":"plant","theme":"purple","textSize":"huge","contrast":"maybe","grid":0,"thresholds":"x","lines":7}']:
        pg.evaluate("b=>localStorage.setItem('fm.prefs',b)",bad);pg.reload();pg.wait_for_timeout(500)
    r4=pg.evaluate("[document.documentElement.dataset.fmTheme,FM.S.prefs.theme,FM.S.prefs.textSize,FM.S.prefs.contrast,FM.S.prefs.thresholds.length,FM.S.prefs.lines,document.querySelectorAll('.card').length>0]")
    res['T4_corrupt_prefs_fall_back_safely']=r4==['mist-cobalt','auto',100,False,5,'square',True]
    # T11 narrow widths: no page-level sideways scroll; 150% text
    for w in [320,360,768,1280,1440]:
        pg.set_viewport_size({'width':w,'height':800});pg.evaluate("FM.S.prefs.textSize=150;FM.applyPrefs();FM.renderCanvas()");pg.wait_for_timeout(300)
        notes[f'overflow_{w}']=pg.evaluate("document.documentElement.scrollWidth-window.innerWidth")
    res['T11_no_sideways_page_scroll_320_to_1440_at_150pct']=all(notes[f'overflow_{w}']<=0 for w in [320,360,768,1280,1440])
    res['no_page_errors']=not errs
    b.close()
print(json.dumps(res,indent=1));print(json.dumps(notes,indent=1)[:4000]);print(errs[:5])
