import re,sys
P='/home/claude/flowmate/index.html'
s=open('/home/claude/flowmate/index.v5.html').read()
def rep(old,new,count=1):
    global s
    n=s.count(old)
    assert n==count,(n,old[:120])
    s=s.replace(old,new)

# --- consolidate: bodies fm6 replaces are removed (declarations kept as stubs) ---
import re as _re
for _n in ['renderCanvas','renderEdges','renderFrames','portPos','renderMinimap','applyView','computeHeavy','scheduleHeavy','autoLayout','renderTray','screensLayout','saAsk']:
    _m=[x.start() for x in _re.finditer(r'\n(async )?function '+_n+r'\(',s)];assert len(_m)==1,_n
    _a=_m[0]+1;_b=s.index('\n}\n',_a)+2 if _n!='scheduleHeavy' else s.index('\n',_a)
    s=s[:_a]+'function '+_n+'(){}'+s[_b:]
FILES=[f for f in ['canvas.js','layout.js','tray.js','smart.js','design.js','log.js','perf.js'] if __import__('os').path.exists('/home/claude/fm6/'+f)]
mods=''.join(open('/home/claude/fm6/'+f).read() for f in FILES)
anchor="\n// ---------- Theme ----------\nfunction applyPrefs(){\n  const r=FMT.apply"
assert s.count(anchor)==1
s=s.replace(anchor,'\n'+mods+anchor)
css=open('/home/claude/fm6/fm6.css').read()
i=s.index('</style>',s.index('<style>'));s=s[:i]+css+s[i:]
# pointer: new overlays don't start a pan
rep("if(ev.target.closest('.overlay,#minimap,#panel,#dropMenu,.crumbs,#traceBar,.empty-hint div,.fab,.collapse-btn,#lkey'))return;",
    "if(ev.target.closest('.overlay,#minimap,#panel,#dropMenu,.crumbs,#traceBar,.empty-hint div,.fab,.collapse-btn,#lkey,#ovwarn,.tray-ctl'))return;")
# drag: snapshot only once something actually moves
rep("ox:PX(e),oy:PY(e),vx:S.view.x,vy:S.view.y,moved:false,before:JSON.stringify(S.p)};","ox:PX(e),oy:PY(e),vx:S.view.x,vy:S.view.y,moved:false,before:null};")
rep("  const dx=ev.clientX-G.sx,dy=ev.clientY-G.sy;if(!G.moved&&Math.hypot(dx,dy)<5)return;G.moved=true;",
    "  const dx=ev.clientX-G.sx,dy=ev.clientY-G.sy;if(!G.moved&&Math.hypot(dx,dy)<5)return;if(!G.moved&&G.before===null)G.before=JSON.stringify(S.p);G.moved=true;")
rep("    const{vis}=visibleSet(S.p);renderEdges(vis);renderFrames(vis);\n  }",
    "    if(!G.raf)G.raf=requestAnimationFrame(()=>{if(G)G.raf=0;const{vis}=visibleSet(S.p);withIX(()=>{renderFrames(vis);renderEdges(vis)})});\n  }")
rep("if(ev.target.closest('#panel,#dropMenu,#lkey'))return;ev.preventDefault();","if(ev.target.closest('#panel,#dropMenu,#lkey,#tray'))return;ev.preventDefault();")
rep("<div class=\"field\"><span class=\"flabel\">Snap cards to a grid</span>${seg('snap',[[false,'Off'],[true,'On']])}</div>","<div class=\"field\"><span class=\"flabel\">Snap cards to a grid</span>${seg('snap',[[false,'Off'],[true,'On']])}</div><div class=\"field\"><span class=\"flabel\">Parts bar (Screens view)</span>${seg('trayDock',[['auto','Automatic'],['left','Left'],['right','Right'],['top','Top'],['bottom','Bottom']])}</div><div class=\"field\"><span class=\"flabel\">Parts bar open</span>${seg('trayOpen',[[true,'Open'],[false,'Folded away']])}</div><div class=\"field\"><span class=\"flabel\">Images in Smart Action</span>${seg('saImages',[[true,'On'],[false,'Off']])}</div>")
rep("['history','History & versions','history'],","['activity','Activity & reasons','trace'],['history','History & versions','history'],")
rep("  else if(k==='team')h=head('Team','chat','Share, comment and review')+teamHTML(p);","  else if(k==='team')h=head('Team','chat','Share, comment and review')+teamHTML(p);\n  else if(k==='activity')h=head('Activity & reasons','trace','Every change, and why it was made')+activityHTML(p);")
for x in sys.argv[1:]:
    exec(open(x).read())
open(P,'w').write(s)
print('written',len(s))
