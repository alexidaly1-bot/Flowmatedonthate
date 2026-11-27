import re,json
P='/home/claude/flowmate/index.html'
s=open(P).read()
T=open('/home/claude/fmtheme/themes.json').read()
head=open('/home/claude/fmtheme/head.js').read().replace('/*THEMES_JSON*/',T)
glyphs=open('/home/claude/fmtheme/glyphs.css').read()
tcss=open('/home/claude/fmtheme/themes.css').read()
tjs=open('/home/claude/fmtheme/theme.js').read()
def rep(old,new,count=1):
    global s
    n=s.count(old)
    assert n==count,(n,old[:80])
    s=s.replace(old,new)

# 1. Head: drop old font link + pre-paint script, add theme engine
a=s.index('<link href="https://fonts.googleapis.com/css2?family=Atkinson')
b=s.index('</script>',a)+len('</script>')
s=s[:a]+'<script>\n'+head+'</script>'+s[b:]

# 2. Radius tokens in editor CSS (not the planned-app preview parts)
st=s.index('<style>');en=s.index('</style>',st)
css=s[st:en]
SKIP=('.dev','.scr','.sp','.sw','.wire','.port','.inport','.mod-dot','.dotst','.spinner','.card.decision::before','.dline','.grab','.mic','.sp-','.ed-grip','.pl-dev','.web-key')
def rr(m):
    v=int(m.group(1))
    if v>=999:return 'var(--r-pill)'
    if v<=8:return 'var(--r-sm)'
    if v<=16:return 'var(--r)'
    return 'var(--r-lg)'
out=[]
for line in css.split('\n'):
    sel=line.strip().split('{')[0]
    if 'border-radius' in line and not any(sel.startswith(x) for x in SKIP) and 'var(--ap' not in line:
        line=re.sub(r'border-radius:([^;}]+)',lambda m:'border-radius:'+re.sub(r'(\d+)px',rr,m.group(1)),line)
    out.append(line)
css='\n'.join(out)
s=s[:st]+css+s[en:]
# focus rule: keep element shape on focus
rep(':focus-visible{outline:3px solid var(--gold);outline-offset:2px;border-radius:var(--r)}',':focus-visible{outline:3px solid var(--ink);outline-offset:2px}')
# theme layer at end of the main stylesheet
en=s.index('</style>',s.index('<style>'))
s=s[:en]+glyphs+tcss+s[en:]

# 3. Prefs: safe parse + sanitise
rep("prefs:Object.assign({theme:'auto',textSize:100,complexity:'technical',motion:'auto',lines:'square',thresholds:[.25,.5,.75,1.25,2],contrast:false,sidebar:true},JSON.parse(Store.get('fm.prefs')||'{}')),",
    "prefs:FMT.sanitize(Object.assign({theme:'auto',textSize:100,complexity:'technical',motion:'auto',lines:'square',thresholds:[.25,.5,.75,1.25,2],contrast:false,sidebar:true},safeJSON(Store.get('fm.prefs')))),linkHide:new Set(),")
rep("function savePrefs(){Store.set('fm.prefs',JSON.stringify(S.prefs))}",
    "function savePrefs(){Store.set('fm.prefs',JSON.stringify(S.prefs))}\nif(!Array.isArray(S.prefs.thresholds)||S.prefs.thresholds.length!==5||S.prefs.thresholds.some(x=>!(x>0)))S.prefs.thresholds=[.25,.5,.75,1.25,2];\nif(!['square','curved'].includes(S.prefs.lines))S.prefs.lines='square';")

# 4. Edges: families, patterns, symbols, filter
rep("let defs='<defs>';for(const[k,v] of Object.entries(CONN))defs+=`<marker id=\"mk-${k}\" viewBox=\"0 0 10 10\" refX=\"7\" refY=\"5\" markerWidth=\"5.5\" markerHeight=\"5.5\" orient=\"auto-start-reverse\"><path d=\"M0,0 L10,5 L0,10 z\" style=\"fill:var(${v.col})\"/></marker>`;defs+='</defs>';",
    "let defs='<defs>';for(const[k,v] of Object.entries(FAMS))defs+=`<marker id=\"mk-${k}\" viewBox=\"0 0 10 10\" refX=\"7\" refY=\"5\" markerWidth=\"4.6\" markerHeight=\"4.6\" orient=\"auto-start-reverse\"><path d=\"M0,0 L10,5 L0,10 z\" style=\"fill:var(${v.col})\"/></marker>`;defs+='</defs>';")
rep("""    const def=CONN[c.type]||CONN.navigate;const d=pathD(pp.x1,pp.y1,pp.x2,pp.y2);""",
    """    const def=CONN[c.type]||CONN.navigate;const fam=famOf(c.type);const fd=FAMS[fam];if(S.linkHide.has(fam))continue;const d=pathD(pp.x1,pp.y1,pp.x2,pp.y2);""")
rep("""paths+=`<path class="ln${sel?' sel':''}" data-c="${c.connId}" d="${d}" style="stroke:var(${def.col})" ${def.dash?`stroke-dasharray="${def.dash}"`:''} marker-end="url(#mk-${c.type in CONN?c.type:'navigate'})"/><path class="hit" data-conn="${c.connId}" d="${d}"><title>${esc(def.label)}${c.label?': '+esc(c.label):''}</title></path>`;""",
    """paths+=`<path class="ln f-${fam}${sel?' sel':''}" data-c="${c.connId}" d="${d}" style="stroke:var(${fd.col})" ${fd.dash?`stroke-dasharray="${fd.dash}"`:''} marker-end="url(#mk-${fam})"/><path class="hit" data-conn="${c.connId}" d="${d}"><title>${fd.label} link: ${esc(def.label)}${c.label?': '+esc(c.label):''}</title></path>`;""")
rep("""    if(c.label){const lx=scr?pp.x2-8:pp.x2-Math.min(70,(pp.x2-pp.x1)/2.5),ly=scr?pp.y2-4:pp.y2;labels+=`<div class="elabel${c.type==='condition'?' dec':''}${scr?' r':''}" data-lc="${c.connId}" style="left:${lx}px;top:${ly}px;color:var(${def.col})">${esc(c.label)}</div>`}""",
    """    {const lx=scr?pp.x2-8:pp.x2-Math.min(70,(pp.x2-pp.x1)/2.5),ly=scr?pp.y2-4:pp.y2;labels+=c.label?`<div class="elabel f-${fam}${c.type==='condition'?' dec':''}${scr?' r':''}" data-lc="${c.connId}" style="left:${lx}px;top:${ly}px"><i class="g" aria-hidden="true"></i><span class="lt">${esc(c.label)}</span></div>`:`<div class="elabel badge f-${fam}${scr?' r':''}" data-lc="${c.connId}" style="left:${lx}px;top:${ly}px" aria-hidden="true"><i class="g"></i></div>`}""")
# 5. Minimap: module tints with an outline
rep("ctx.fillStyle=css.getPropertyValue('--m-'+(m?m.colour:'coral')).trim()||'#E2805F';ctx.globalAlpha=S.trace&&!S.trace.ents.has(id)?.25:.85;const rr=Math.max(2,g.w*s*.12);ctx.beginPath();ctx.roundRect(g.x*s+ox,g.y*s+oy,Math.max(3,g.w*s),Math.max(3,g.h*s),rr);ctx.fill()",
    "ctx.fillStyle=css.getPropertyValue('--m-'+(m?m.colour:'coral')).trim()||'#E1ECFF';ctx.strokeStyle=css.getPropertyValue('--line').trim();ctx.lineWidth=1;ctx.globalAlpha=S.trace&&!S.trace.ents.has(id)?.25:1;const rr=Math.max(2,g.w*s*.12);ctx.beginPath();ctx.roundRect(g.x*s+ox,g.y*s+oy,Math.max(3,g.w*s),Math.max(3,g.h*s),rr);ctx.fill();ctx.stroke()")
# 6. Node IDs on cards (shown by Mono Studio)
rep("""<span class="ttl">${esc(e.name)}<span class="kind">${esc(sub)}</span></span><span class="chip ${stClass(e.status)}">""",
    """<span class="ttl"><span class="nid">${nodeIds(p)[e.id]}</span>${esc(e.name)}<span class="kind">${esc(sub)}</span></span><span class="chip ${stClass(e.status)}">""")
# 7. Settings: Appearance section
old_a="""h=head('Settings','gear','How FlowMate looks for you')+`<div class="field"><span class="flabel">Theme</span>${seg('theme',[['auto','Match device'],['light','Light'],['dark','Dark']])}</div><div class="field"><span class="flabel">Text size</span>${seg('textSize',[[100,'Normal'],[115,'Large'],[130,'Larger'],[160,'Largest']])}</div><div class="field"><span class="flabel">Contrast</span>${seg('contrast',[[false,'Normal'],[true,'High']])}</div><div class="field"><span class="flabel">Animation</span>${seg('motion',[['auto','Match device'],['off','Off']])}</div><div class="field"><span class="flabel">Link lines</span>"""
new_a="""FMT.loadAllFonts();h=head('Settings','gear','How FlowMate looks for you')+`<div class="mod-h" id="appearance">Appearance</div>${appearanceHTML()}<div class="mod-h">Canvas</div><div class="field"><span class="flabel">Link lines</span>"""
rep(old_a,new_a)
# 8. Theme engine hook
old_p="""function applyPrefs(){
  const pr=S.prefs;const root=document.documentElement;
  const host=root.getAttribute('data-theme');
  const dark=pr.theme==='dark'||(pr.theme==='auto'&&(host==='dark'||(host!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)));
  root.setAttribute('data-fm-mode',dark?'dark':'light');
  root.style.fontSize=(pr.textSize/100*16)+'px';
  root.setAttribute('data-contrast',pr.contrast?'high':'normal');
  root.setAttribute('data-motion',pr.motion);
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{applyPrefs();renderMinimap()});"""
new_p=tjs+"""
// ---------- Theme ----------
function applyPrefs(){
  const r=FMT.apply(S.prefs);const key=r.id+'/'+r.mode;
  if(S._apKey&&S._apKey!==key&&S.panel==='settings'&&S.p&&!S._apBusy)requestAnimationFrame(()=>{if(S.panel==='settings')rerenderPanelKeep()});
  S._apKey=key;
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{applyPrefs();renderMinimap()});"""
rep(old_p,new_p)
# 9. Link key button + panel
rep("""      <div class="overlay ov-br">
        <button class="btn icon ghost" data-act="view-back\"""",
    """      <div id="lkey" role="group" aria-label="Link key and filter" hidden></div>
      <div class="overlay ov-br">
        <button class="btn icon ghost lkey-btn mob-only" data-act="lkey" aria-label="Link key and filter" aria-expanded="false" title="Link key"><svg class="ic" viewBox="0 0 24 24"><path d="M3 7h9M3 12h4M10 12h4M3 17h1.5M8 17h1.5M13 17h1.5"/><path d="M15 4l4 3-4 3z" fill="currentColor"/></svg></button>
        <button class="btn icon ghost" data-act="view-back\"""")
rep("""        <button class="btn icon ghost" data-act="redo" aria-label="Redo" title="Redo (Ctrl+Y)">""","""        <button class="btn icon ghost lkey-btn" data-act="lkey" aria-label="Link key and filter" aria-expanded="false" title="Link key"><svg class="ic" viewBox="0 0 24 24"><path d="M3 7h9M3 12h4M10 12h4M3 17h1.5M8 17h1.5M13 17h1.5"/><path d="M15 4l4 3-4 3z" fill="currentColor"/></svg></button>
        <button class="btn icon ghost" data-act="redo" aria-label="Redo" title="Redo (Ctrl+Y)">""")
# 10. Roadmap + exports
rep("<li>Light and dark mode, text size, high contrast, phone layout</li>","<li><b>Appearance:</b> 5 themes (Mist Cobalt, Warm Canvas, Orbit System, Bold Play, Mono Studio), each with light and dark, text size, spacing, contrast, motion, grid and link labels</li><li>Link key: every link type has its own colour, line pattern and symbol</li><li>Phone and Fold layout</li>")
rep("if(ev.target.closest('.overlay,#minimap,#panel,#dropMenu,.crumbs,#traceBar,.empty-hint div,.fab,.collapse-btn'))return;","if(ev.target.closest('.overlay,#minimap,#panel,#dropMenu,.crumbs,#traceBar,.empty-hint div,.fab,.collapse-btn,#lkey'))return;")
rep("if(n.closest('#tray,.overlay,#panel,#editor,#minimap'))return{};","if(n.closest('#tray,.overlay,#panel,#editor,#minimap,#lkey'))return{};")
rep("if(ev.target.closest('#panel,#dropMenu'))return;ev.preventDefault();","if(ev.target.closest('#panel,#dropMenu,#lkey'))return;ev.preventDefault();")
rep("window.FM={S,","window.FM={applyPrefs,renderLinkKey,FAMS,famOf,nodeIds,S,")
open(P,'w').write(s)
print('ok',len(s))
