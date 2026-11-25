import os as _os, pathlib as _pl
_os.chdir(_os.path.dirname(_os.path.abspath(__file__)))
APP=_pl.Path('../dist/index.html').resolve().as_uri()
import json,sys,os,time
from playwright.sync_api import sync_playwright
URL='file://'+_os.path.abspath(sys.argv[1] if len(sys.argv)>1 else '../dist/index.html')
OUT=sys.argv[2] if len(sys.argv)>2 else 'out/perf.json'
N=int(os.environ.get('N','300'))
R={'file_kb':round(os.path.getsize(URL[7:])/1024,1)}
GEN="""(n)=>{const F=FM;F.commit('big',p=>{const mods=[];for(let i=0;i<8;i++)mods.push(F.addModule(p,'Mod '+i).id);
 const kinds=['page','page','page','function','decision','setting','data'];const ids=[];
 for(let i=0;i<n;i++){const k=kinds[i%kinds.length];const e=F.addEntity(p,k,{name:k+' '+i,moduleId:mods[i%8],x:(i%20)*420,y:Math.floor(i/20)*360});
  if(k==='page'){e.elements=[0,1,2,3].map(j=>({id:'el_'+i+'_'+j,label:'Btn '+j,type:j%2?'button':'listitem'}))}ids.push(e)}
 for(let i=1;i<n;i++){const a=ids[Math.floor(Math.random()*i)],b=ids[i];F.addConn(p,{entity:a.id,element:a.kind==='page'?a.elements[i%4].id:null},b.id,a.kind==='decision'?'condition':'navigate',a.kind==='decision'?(i%2?'Yes':'No'):'')}
 F.autoLayout(p)});return Object.keys(F.S.p.entities).length}"""
def metrics(pg,cdp):
    cdp.send('HeapProfiler.collectGarbage');pg.wait_for_timeout(200)
    m={x['name']:x['value'] for x in cdp.send('Performance.getMetrics')['metrics']}
    return {'heap_mb':round(m['JSHeapUsedSize']/1048576,2),'nodes':int(m['Nodes']),'listeners':int(m['JSEventListeners'])}
with sync_playwright() as pw:
    b=pw.chromium.launch(args=['--enable-precise-memory-info'])
    ctx=b.new_context(viewport={'width':1440,'height':900});pg=ctx.new_page();cdp=ctx.new_cdp_session(pg);cdp.send('Performance.enable')
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
    pg.goto(URL);pg.evaluate("localStorage.clear()")
    t=[]
    for i in range(3):
        t0=time.time();pg.reload();pg.wait_for_function("window.FM&&FM.S&&FM.S.p&&document.querySelectorAll('#cards .card').length>0");t.append((time.time()-t0)*1000)
    R['load_ms']=round(sorted(t)[1]);
    R['nav_dcl_ms']=round(pg.evaluate("performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd"))
    pg.wait_for_timeout(500);R['idle_sample']=metrics(pg,cdp)
    ev=pg.evaluate
    R['entities']=ev(GEN,N);pg.wait_for_timeout(400)
    def tm(js,reps=10):
        return round(ev("""(js)=>{const f=new Function(js);f();const t0=performance.now();for(let i=0;i<%d;i++)f();return (performance.now()-t0)/%d}"""%(reps,reps),js),2)
    R['large']={}
    L=R['large']
    L['renderCanvas_blocks_ms']=tm("FM.renderCanvas()")
    L['select_ms']=tm("FM.select({t:'entity',id:Object.keys(FM.S.p.entities)[5]})")
    L['applyView_pan_ms']=tm("FM.S.view.x+=3;FM.applyView()",60)
    L['commit_ms']=tm("FM.commit('x',p=>{Object.values(p.entities)[0].desc=String(Math.random())})",5)
    L['json_kb']=round(len(ev("JSON.stringify(FM.S.p)"))/1024,1)
    L['saveLocal_ms']=tm("localStorage.setItem('fm.test',JSON.stringify(FM.S.p))",5)
    L['prompt_kchars']=round(ev("FM.buildPrompt(FM.S.p,'tidy up',\"app\",null,[]).length")/1000,1)
    L['prompt_card_kchars']=round(ev("FM.buildPrompt(FM.S.p,'tidy up','card',{t:'entity',id:Object.keys(FM.S.p.entities)[5]},[]).length")/1000,1)
    # real pan drag frame timing
    pg.mouse.move(700,450)
    ev("window.__ft=[];let l=performance.now();(function f(t){window.__ft.push(t-l);l=t;if(window.__ft.length<200)requestAnimationFrame(f)})(performance.now())")
    pg.mouse.down()
    for i in range(60):pg.mouse.move(700-i*6,450-i*2)
    pg.mouse.up();pg.wait_for_timeout(300)
    ft=ev("window.__ft.slice(2)");ft=[x for x in ft if x>0];ft.sort()
    L['pan_frame_p50_ms']=round(ft[len(ft)//2],1) if ft else None;L['pan_frame_p95_ms']=round(ft[int(len(ft)*.95)],1) if ft else None
    # zoom crossing levels
    L['zoom_levels_ms']=tm("for(const z of [.1,.3,.5,.8,1.2,.2])FM.S.view.z=z,FM.applyView()",3)
    L['mounted_cards']=ev("document.querySelectorAll('#cards .card').length");L['live_dom']=ev("document.querySelectorAll('*').length");L['metrics']=metrics(pg,cdp)
    ev("FM.setView('screens')");pg.wait_for_timeout(800)
    L['renderCanvas_screens_ms']=tm("FM.renderCanvas()",5)
    L['metrics_screens']=metrics(pg,cdp)
    ev("FM.setView('blocks')");pg.wait_for_timeout(300)
    L['undo_stack_mb']=round(ev("FM.S.undo.reduce((a,h)=>a+h.json.length,0)")*2/1048576,2)
    # reload with large project
    t0=time.time();pg.reload();pg.wait_for_function("window.FM&&FM.S&&FM.S.p&&Object.keys(FM.S.geo).length>50");L['reload_large_ms']=round((time.time()-t0)*1000)
    R['errors']=errs
    b.close()
json.dump(R,open(OUT,'w'),indent=1);print(json.dumps(R,indent=1))
