import os as _os, pathlib as _pl
_os.chdir(_os.path.dirname(_os.path.abspath(__file__)))
APP=_pl.Path('../app/index.html').resolve().as_uri()
import json,time
from playwright.sync_api import sync_playwright
bm=open('fixtures/bm_final.json').read()
res={};errs=[]
def load(pg,proj_js=None):
    pg.goto(APP);pg.wait_for_timeout(300)
    pg.evaluate("j=>{localStorage.clear();const p=JSON.parse(j);localStorage.setItem('fm.p.'+p.id,j);const l=FM.seedLandlord();l.id='prj_land';localStorage.setItem('fm.p.prj_land',JSON.stringify(l));localStorage.setItem('fm.index',JSON.stringify([p.id,'prj_land']));localStorage.setItem('fm.last',p.id)}",bm)
    pg.reload();pg.wait_for_timeout(600)
with sync_playwright() as pw:
    b=pw.chromium.launch();pg=b.new_page(viewport={'width':1440,'height':900})
    pg.on('pageerror',lambda e:errs.append(str(e)))
    load(pg)
    before=pg.evaluate("JSON.stringify(Object.values(FM.S.p.entities).map(e=>{const c={...e};delete c.sx;delete c.sy;return c}))")
    pg.click('[data-act=view][data-v=screens]');pg.wait_for_timeout(500)
    pg.screenshot(path='out/lp_screens.png')
    pg.click('[data-act=view][data-v=blocks]');pg.wait_for_timeout(200)
    after=pg.evaluate("JSON.stringify(Object.values(FM.S.p.entities).map(e=>{const c={...e};delete c.sx;delete c.sy;return c}))")
    res['P1_views_same_data']=before==after
    pg.click('[data-act=view][data-v=screens]');pg.wait_for_timeout(300)
    # centre on Plan a meet-up
    pg.evaluate("FM.centreOn('pg_plan',.8)");pg.wait_for_timeout(400)
    res['heavy_plan']=pg.evaluate("document.querySelector('.scard[data-id=pg_plan]').dataset.heavy")
    tb=pg.locator('[data-part=button]').bounding_box()
    tgt=pg.locator('.scard[data-id=pg_plan] .scr .sp[data-el=pg_plan_e2]').bounding_box()
    pg.mouse.move(tb['x']+20,tb['y']+15);pg.mouse.down();pg.mouse.move(tb['x']+200,tb['y']+60,steps=5)
    pg.mouse.move(tgt['x']+40,tgt['y']+6,steps=8);pg.wait_for_timeout(100)
    pg.screenshot(path='out/lp_drag.png')
    pg.mouse.up();pg.wait_for_timeout(300)
    res['P2_insert_index2']=pg.evaluate("(()=>{const e=FM.S.p.entities.pg_plan.elements;return e[2].type==='button'&&e[2].label==='New button'&&FM.S.sel.el===e[2].id})()")
    # P3: move 'Save' (last) part to pg_meet
    pg.evaluate("(()=>{const a=FM.S.p.entities.pg_meet,b=FM.S.p.entities.pg_plan;FM.S.view={z:.5,x:700-a.sx*.5,y:330-((a.sy+b.sy)/2+330)*.5};FM.applyView();FM.renderCanvas()})()");pg.wait_for_timeout(400)
    src=pg.locator('.scard[data-id=pg_plan] .scr .sp[data-el=pg_plan_e4]').bounding_box()
    dst=pg.locator('.scard[data-id=pg_meet] .scr .sp[data-el=pg_meet_e3]').bounding_box()
    pg.mouse.move(src['x']+30,src['y']+10);pg.mouse.down();pg.mouse.move(src['x']+60,src['y']+40,steps=4);pg.mouse.move(dst['x']+30,dst['y']+4,steps=10);pg.mouse.up();pg.wait_for_timeout(300)
    res['P3_moved_with_links']=pg.evaluate("(()=>{const p=FM.S.p;return p.entities.pg_meet.elements.some(e=>e.id==='pg_plan_e4')&&!p.entities.pg_plan.elements.some(e=>e.id==='pg_plan_e4')&&FM.outConns(p,'pg_meet','pg_plan_e4').some(c=>c.to==='fn_savemeet')})()")
    pg.keyboard.press('Control+z');pg.keyboard.press('Control+z');pg.wait_for_timeout(200)
    res['undo_restores']=pg.evaluate("FM.S.p.entities.pg_plan.elements.length===5&&FM.S.p.entities.pg_plan.elements[4].id==='pg_plan_e4'")
    pg.evaluate("FM.centreOn('pag_qiebee2vk',.65)");pg.wait_for_timeout(400)
    pg.screenshot(path='out/lp_screens2.png')
    # P4 play
    pg.evaluate("FM.select(null)");
    pg.click('.ov-tr [data-act=play]');pg.wait_for_timeout(300)
    res['P4_start_home']=pg.evaluate("FM.PL.steps[0].page==='pag_qiebee2vk'")
    pg.click('#play [data-pl=pag_qiebee2vk_e2]');pg.wait_for_timeout(150)
    res['P4_tab_to_roster']=pg.evaluate("FM.PL.steps.at(-1).page==='pg_roster'")
    pg.click('#play [data-pl=pg_roster_e2]');pg.wait_for_timeout(100)
    t0=time.time();pg.click('#play [data-pl=pg_plan_e4]');pg.wait_for_timeout(100)
    res['P5_sheet_works_fails']=pg.evaluate("FM.PL.sheet&&FM.PL.sheet.options.map(o=>o.label).join('|')")
    pg.screenshot(path='out/lp_play_sheet.png')
    pg.click('#play .pl-card .btn.primary');pg.wait_for_timeout(100)
    res['P5_decision']=pg.evaluate("FM.PL.sheet&&FM.PL.sheet.title")
    pg.click('#play .pl-card [data-i=\"0\"]');pg.wait_for_timeout(100)
    res['P5_end_page']=pg.evaluate("FM.PL.steps.at(-1).page")
    pg.screenshot(path='out/lp_play.png')
    # P8 trail jump
    pg.click('#play .pl-trail [data-i=\"1\"]');pg.wait_for_timeout(100)
    res['P8_jump']=pg.evaluate("FM.PL.steps.length===2&&FM.PL.steps[1].page==='pg_roster'")
    # P9 save path & replay
    pg.click('#play [data-pl=pg_roster_e2]');pg.wait_for_timeout(80)
    pg.click('#play [data-pact=save]');pg.fill('#pth-n','Plan route');pg.click('.mfoot .btn.primary');pg.wait_for_timeout(200)
    res['P9_saved']=pg.evaluate("FM.S.p.paths.length===1&&FM.S.p.paths[0].steps.length===3")
    pg.click('#play [data-pact=restart]');pg.click('#play [data-pact=paths]');pg.click('#play .pl-card [data-i=\"0\"]');pg.wait_for_timeout(3600)
    res['P9_replayed']=pg.evaluate("FM.PL.steps.at(-1).page==='pg_plan'&&FM.PL.steps.length===3")
    pg.evaluate("FM.commit('cut',p=>{for(const c of Object.values(p.connections))if(c.from.element==='pg_roster_e2')delete p.connections[c.id]})")
    pg.click('#play [data-pact=rp-stop]') if pg.locator('#play [data-pact=rp-stop]').count() else None
    pg.click('#play [data-pact=paths]');pg.click('#play .pl-card [data-i=\"0\"]');pg.wait_for_timeout(3400)
    res['P9_broken_msg']=pg.evaluate("FM.PL.sheet&&FM.PL.sheet.title+' / '+FM.PL.sheet.text")
    pg.keyboard.press('Escape');pg.keyboard.press('Escape');pg.wait_for_timeout(100)
    res['play_closed']=pg.evaluate("!FM.PL.open")
    # P7 role block
    pg.evaluate("FM.openPlay('pg_person')");pg.select_option('#pl-role','role_me')
    pg.click('#play [data-pl=pg_person_e5]');pg.wait_for_timeout(80)
    opts=pg.evaluate("FM.PL.sheet.options.map(o=>o.label)")
    idx=[i for i,o in enumerate(opts) if 'ready' in o.lower()][0]
    pg.click(f'#play .pl-card [data-i=\"{idx}\"]');pg.wait_for_timeout(80)
    res['P7_role_block']=pg.evaluate("FM.PL.sheet&&FM.PL.sheet.title")
    pg.keyboard.press('Escape');pg.keyboard.press('Escape')
    # switch to LandlordMate for P6 + P10
    pg.evaluate("localStorage.setItem('fm.last','prj_land')");pg.reload();pg.wait_for_timeout(600)
    pg.evaluate("FM.openPlay('pg_appset')");pg.click('#play [data-pl=pg_appset_e0]');pg.wait_for_timeout(80)
    res['P6_setting_flipped']=pg.evaluate("FM.PL.steps.at(-1).sim.settings.set_msg")
    pg.click('#play [data-pact=web]');pg.wait_for_timeout(150)
    pg.screenshot(path='out/lp_web.png')
    pg.click('#web [data-wnode=pg_thread]');pg.wait_for_timeout(80)
    pg.click('#play [data-pl=pg_thread_e1]');pg.wait_for_timeout(80)
    res['P6_suggests_no']=pg.evaluate("FM.PL.sheet.options.find(o=>o.primary).label+' | '+FM.PL.sheet.text")
    pg.keyboard.press('Escape')
    pg.click('#play [data-pact=restart]');
    pg.evaluate("FM.openPlay('pg_docs')");pg.click('#play [data-pl=pg_docs_e1]');pg.wait_for_timeout(350)
    res['P10_dead']=pg.evaluate("FM.PL.sheet&&FM.PL.sheet.title")
    pg.keyboard.press('Escape');pg.keyboard.press('Escape')
    # P11 web from canvas
    pg.evaluate("FM.select({t:'entity',id:'pg_room'})");pg.wait_for_timeout(200);pg.screenshot(path='out/lp_ovtr.png');pg.evaluate("document.querySelector('.ov-tr [data-act=web]').click()");pg.wait_for_timeout(100)
    res['P11_centre']=pg.evaluate("document.querySelector('#web-t').nextElementSibling.textContent")
    pg.click('#web [data-wnode=pg_cond]');pg.wait_for_timeout(100)
    res['P11_pick']=pg.evaluate("FM.S.sel.id")
    # P12 perf: 60 pages
    perf=pg.evaluate("""(()=>{const p=FM.blankProject({name:'Big'});let prev=p.startPageId;for(let i=0;i<59;i++){const e=FM.addEntity(p,'page',{name:'Page '+i,pageType:'Detail'});for(let k=0;k<5;k++)FM.addElement(p,e.id,{label:'Btn '+k,type:['button','listitem','toggle','input','tab'][k]});FM.addConn(p,{entity:prev,element:null},e.id,'navigate');prev=e.id}
      FM.S.projects[p.id]=p;FM.S.p=p;FM.S.scrH={};FM.autoLayout(p);
      FM.setView('blocks');let t=performance.now();FM.renderCanvas();const blocks=performance.now()-t;
      FM.setView('screens');FM.centreOn(p.startPageId,.7);t=performance.now();FM.renderCanvas();const scr=performance.now()-t;const heavy=FM.S.heavy.size;
      t=performance.now();for(let i=0;i<30;i++){FM.S.view.x-=20;FM.applyView()}const pan=(performance.now()-t)/30;
      return {blocksRenderMs:Math.round(blocks),screensRenderMs:Math.round(scr),heavyScreens:heavy,panFrameMs:+pan.toFixed(2)}})()""")
    res['P12_perf']=perf
    # play tap speed
    pg.evaluate("FM.openPlay(Object.values(FM.S.p.entities).find(e=>e.elements&&e.elements.length).id)")
    t=pg.evaluate("(()=>{const t=performance.now();for(let i=0;i<20;i++)FM.openPlay(Object.values(FM.S.p.entities).find(e=>e.elements&&e.elements.length).id);return (performance.now()-t)/20})()")
    res['P12_play_tap_ms']=round(t,1)
    # mobile
    m=b.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
    m.on('pageerror',lambda e:errs.append('M '+str(e)))
    load(m)
    m.tap('[data-act=view][data-v=screens]');m.wait_for_timeout(500);m.screenshot(path='out/lp_mob_screens.png')
    m.tap('.ov-tr [data-act=play]');m.wait_for_timeout(300);m.screenshot(path='out/lp_mob_play.png')
    m.tap('#play [data-pl=pag_qiebee2vk_e4]');m.wait_for_timeout(200);m.screenshot(path='out/lp_mob_sheet.png')
    # dark
    d=b.new_page(viewport={'width':1440,'height':900},color_scheme='dark');load(d)
    d.click('[data-act=view][data-v=screens]');d.wait_for_timeout(300);d.evaluate("FM.centreOn('pg_roster',.7)");d.wait_for_timeout(400);d.screenshot(path='out/lp_dark.png')
    b.close()
print(json.dumps(res,indent=1));print(errs or 'no errors')
