import os as _os, pathlib as _pl
_os.chdir(_os.path.dirname(_os.path.abspath(__file__)))
APP=_pl.Path('../dist/index.html').resolve().as_uri()
import json
from playwright.sync_api import sync_playwright
bm=open('fixtures/buttmate.json').read()
MOCK={"understood":"Add a quick way for a partner to say they're running late, so I can push my prep back.",
 "answer":"",
 "options":[
  {"title":"Add a Running late button","why":"Puts it on the partner's ready page. Quickest, but only partners with a link can use it.",
   "ops":[{"op":"addElement","ref":"e1","card":"pg_goodtogo","label":"Running late","type":"button"},
          {"op":"addCard","ref":"c1","kind":"function","name":"Push back prep","module":"mod_ready","steps":["Move the meet-up later","Move my prep block with it","Tell me quietly"]},
          {"op":"link","from":"pg_goodtogo","element":"e1","to":"c1","type":"trigger"},
          {"op":"link","from":"c1","to":"dt_meet","type":"write"},
          {"op":"link","from":"c1","to":"fn_alert","type":"notify"},
          {"op":"link","from":"c1","to":"pg_nope","type":"navigate"}]},
  {"title":"New Running late page","why":"A separate page with a time picker. Clearer, but one more screen.",
   "ops":[{"op":"addCard","ref":"c1","kind":"page","name":"Running late","module":"mod_ready","pageType":"Form","roles":["role_partner"]},
          {"op":"addElement","ref":"e1","card":"c1","label":"How late?","type":"dropdown"},
          {"op":"addElement","ref":"e2","card":"c1","label":"Send","type":"button"},
          {"op":"addCard","ref":"c2","kind":"function","name":"Save new prep time"},
          {"op":"link","from":"c1","element":"e2","to":"c2","type":"trigger"},
          {"op":"update","target":"dt_meet","set":{"fields":["person: Person","starts: date and time","lateBy: minutes"]}}]}]}
INIT="""window.__calls=[];window.claude={use:async n=>{if(n==='sample'){const f=async()=>({text:''});f.json=async(prompt,opts)=>{window.__calls.push(prompt);await new Promise(r=>setTimeout(r,300));opts&&opts.onText&&opts.onText({text:'x'.repeat(900),delta:'x'});return %s};return f}return null}};""" % json.dumps(MOCK)
res={};errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch();pg=b.new_page(viewport={'width':1440,'height':900})
    pg.add_init_script(INIT)
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(APP);pg.wait_for_timeout(500)
    pg.evaluate("j=>{const p=JSON.parse(j);FM.S.projects[p.id]=p;localStorage.setItem('fm.p.'+p.id,j);localStorage.setItem('fm.index',JSON.stringify(Object.keys(FM.S.projects)));localStorage.setItem('fm.last',p.id)}",bm)
    pg.reload();pg.wait_for_timeout(700)
    pg.screenshot(path='bm_canvas.png')
    pg.click('[data-act=fit]');pg.wait_for_timeout(200)
    pg.locator('.card[data-id=pg_goodtogo] .hd').click();pg.wait_for_timeout(200)
    pg.click('#saBtn');pg.wait_for_timeout(200)
    pg.screenshot(path='sa_ask.png')
    pg.fill('#sa-in','add a running late buton so my partner can tell me there late')
    n0=pg.evaluate("Object.keys(FM.S.p.entities).length")
    pg.click('[data-act=sa-go]');pg.wait_for_timeout(1000)
    res['prompt_has_map']=pg.evaluate("window.__calls[0].includes('pg_goodtogo')&&window.__calls[0].includes('running late buton')&&window.__calls[0].includes('SCOPE THE USER CHOSE: Only the selected card')")
    res['no_change_before_confirm']=pg.evaluate(f"Object.keys(FM.S.p.entities).length==={n0}")
    pg.locator('input[name=sa-opt][value="0"]').check();pg.wait_for_timeout(200)
    pg.screenshot(path='sa_result.png')
    res['preview']=pg.evaluate("FM.AI.res.options[0].preview.lines.map(l=>l.t+': '+l.text)")
    pg.click('[data-act=sa-apply]');pg.wait_for_timeout(400)
    res['applied']=pg.evaluate("(()=>{const p=FM.S.p;const f=Object.values(p.entities).find(e=>e.name==='Push back prep');const el=p.entities.pg_goodtogo.elements.find(e=>e.label==='Running late');return !!f&&!!el&&FM.outConns(p,'pg_goodtogo',el.id).some(c=>c.to===f.id)&&FM.outConns(p,f.id).length===2&&p.aiLog.length===1})()")
    pg.screenshot(path='sa_after.png')
    pg.keyboard.press('Control+z');pg.wait_for_timeout(200)
    res['undo_one_step']=pg.evaluate(f"Object.keys(FM.S.p.entities).length==={n0}&&!FM.S.p.entities.pg_goodtogo.elements.some(e=>e.label==='Running late')")
    # stale check: open again, get options, change project, apply option 1
    pg.click('#saBtn');pg.fill('#sa-in','running late page');pg.click('[data-act=sa-go]');pg.wait_for_timeout(800)
    pg.locator('input[name=sa-opt][value="1"]').check()
    pg.evaluate("FM.commit('test edit',p=>{p.entities.dt_meet.name='Meetup'})")
    pg.click('[data-act=sa-apply]');pg.wait_for_timeout(300)
    res['option2']=pg.evaluate("(()=>{const p=FM.S.p;const pg=Object.values(p.entities).find(e=>e.name==='Running late'&&e.kind==='page');return !!pg&&pg.roles.includes('role_partner')&&p.entities.dt_meet.fields.includes('lateBy')})()")
    res['followup_ctx']=pg.evaluate("window.__calls[1].includes('EARLIER IN THIS SESSION')")
    # mobile
    m=b.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True);m.add_init_script(INIT)
    m.on('pageerror',lambda e:errs.append('M '+str(e)))
    m.goto(APP);m.wait_for_timeout(300)
    m.evaluate("j=>{const p=JSON.parse(j);localStorage.setItem('fm.p.'+p.id,j);localStorage.setItem('fm.index',JSON.stringify([p.id]));localStorage.setItem('fm.last',p.id)}",bm)
    m.reload();m.wait_for_timeout(700);m.screenshot(path='bm_mob.png')
    m.tap('#saBtn');m.wait_for_timeout(300);m.screenshot(path='sa_mob.png')
    b.close()
print(json.dumps(res,indent=1));print(errs or 'no errors')
