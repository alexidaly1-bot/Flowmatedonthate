import os as _os, pathlib as _pl
_os.chdir(_os.path.dirname(_os.path.abspath(__file__)))
APP=_pl.Path('../dist/index.html').resolve().as_uri()
import json
from playwright.sync_api import sync_playwright
exec(open('satest.py').read().split('INIT=')[0])
INIT="""window.claude={use:async n=>{if(n==='sample'){const f=async()=>({text:''});f.limits=async()=>({images:true});f.json=async()=>(%s);return f}return null}};""" % json.dumps(MOCK)
R={};errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch();pg=b.new_page(viewport={'width':1280,'height':860})
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]));pg.add_init_script(INIT)
    pg.goto(APP);pg.wait_for_timeout(200)
    pg.evaluate("j=>{localStorage.clear();const p=JSON.parse(j);localStorage.setItem('fm.p.'+p.id,j);localStorage.setItem('fm.index',JSON.stringify([p.id]));localStorage.setItem('fm.last',p.id)}",bm)
    pg.reload();pg.wait_for_timeout(1500);ev=pg.evaluate
    H=ev("Object.values(FM.S.p.entities).find(e=>e.kind==='page'&&e.elements.length>1).id")
    n0=ev("(FM.S.p.activity||[]).length")
    # manual change with panel hidden
    ev("FM.commit('Rename home',p=>{p.entities['"+H+"'].name='Home base'})")
    ev("FM.commit('Add page',p=>{const e=FM.addEntity(p,'page',{name:'Help',moduleId:Object.keys(p.modules)[0]});FM.addConn(p,{entity:'"+H+"',element:null},e.id,'navigate')})")
    pg.wait_for_timeout(700);last=ev("FM.S.p.activity.slice(-2)")
    R['manual_logged_hidden']=[ [c['op'] for c in a.get('ch',[])] for a in last]
    R['manual_src']=[a['src'] for a in last]
    # objective
    ev("document.querySelector('[data-act=panel][data-p=activity]')?document.querySelector('[data-act=panel][data-p=activity]').click():FM.S.panel='activity'");ev("FM.S.panel='activity';FM.renderCanvas()")
    pg.evaluate("document.querySelector('#panel')&&0");ev("FM.S.panel='activity'");ev("(()=>{const r=FM.commit;})()")
    ev("FM.S.panel='activity'");pg.evaluate("document.dispatchEvent(new Event('x'))")
    pg.evaluate("FM.S.panel='activity'");pg.evaluate("document.querySelector('#panel').hidden=false")
    ev("FM.S.panel='activity'");ev("FM.renderCanvas()");
    ev("(function(){FM.S.panel='activity'})()");ev("FM.select(null)")
    pg.fill('#obj-new','Simplify the registration process');pg.click('[data-act=obj-start]');pg.wait_for_timeout(200)
    ev("FM.commit('Remove a part',p=>{p.entities['"+H+"'].elements.pop()})")
    R['obj_grouped']=ev("(()=>{const a=FM.S.p.activity.slice(-1)[0];return [!!a.obj, FM.S.p.objectives.find(o=>o.id===a.obj).name]})()")
    R['panel_has_group']=ev("!!document.querySelector('#panel .act-grp.has-obj .obj-rn')")
    # rename objective in panel
    pg.fill('#obj-name','Simpler sign-up');pg.press('#obj-name','Enter');pg.wait_for_timeout(200)
    R['renamed']=ev("FM.S.p.objectives.slice(-1)[0].name")
    pg.click('[data-act=obj-end]');pg.wait_for_timeout(100)
    # AI change
    ev("FM.openSmartAction('running late button')");pg.wait_for_timeout(200);pg.click('[data-act=sa-go]');pg.wait_for_timeout(700)
    pg.click('label.saopt >> nth=0');pg.click('[data-act=sa-apply]');pg.wait_for_timeout(500)
    pg.wait_for_timeout(700);ai=ev("FM.S.p.activity.slice(-1)[0]")
    R['ai_entry']=[ai['src'],ai.get('why','')[:40],len(ai.get('ch',[])),ai.get('obj')]
    # undo keeps the log
    ev("FM.undo()");pg.wait_for_timeout(200)
    R['undo_logged']=ev("(()=>{const a=FM.S.p.activity;return [a.length, a.slice(-1)[0].label, a.slice(-2)[0].src]})()")
    # reasoning view
    pg.click('[data-act=act-mode][data-v=reason]');pg.wait_for_timeout(150)
    R['reason_items']=ev("[...document.querySelectorAll('#panel .reason .act-i')].map(li=>li.innerText.split('\\n').slice(-1)[0].slice(0,60))")
    pg.screenshot(path='out/log_reason.png')
    pg.click('[data-act=act-mode][data-v=activity]');pg.wait_for_timeout(150)
    pg.screenshot(path='out/log_activity.png')
    # persists
    pg.reload();pg.wait_for_timeout(1200)
    R['persist']=ev("[FM.S.p.activity.length,FM.S.p.objectives.length]")
    R['errs']=errs;b.close()
print(json.dumps(R,indent=1))
