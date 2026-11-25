import os as _os, pathlib as _pl
_os.chdir(_os.path.dirname(_os.path.abspath(__file__)))
APP=_pl.Path('../dist/index.html').resolve().as_uri()
import json
from playwright.sync_api import sync_playwright
bm=open('fixtures/bm_final.json').read()
R={};errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch()
    for name,w,h,mob in [('desk',1366,768,False),('phone',372,820,True)]:
        pg=b.new_page(viewport={'width':w,'height':h},has_touch=mob,is_mobile=mob,device_scale_factor=2 if mob else 1)
        pg.on('pageerror',lambda e:errs.append(name+':'+str(e)[:300]))
        pg.goto(APP);pg.wait_for_timeout(200)
        pg.evaluate("j=>{localStorage.clear();const p=JSON.parse(j);localStorage.setItem('fm.p.'+p.id,j);localStorage.setItem('fm.index',JSON.stringify([p.id]));localStorage.setItem('fm.last',p.id)}",bm)
        pg.reload();pg.wait_for_timeout(1200);ev=pg.evaluate
        pid=ev("Object.values(FM.S.p.entities).find(e=>e.kind==='page'&&e.elements.length>=3&&e.elements.some(x=>FM.outConns(FM.S.p,e.id,x.id).length)).id")
        el=ev(f"(()=>{{const e=FM.S.p.entities['{pid}'];const x=e.elements.find(x=>FM.outConns(FM.S.p,e.id,x.id).length);return [x.id,x.label,FM.outConns(FM.S.p,e.id,x.id)[0].to]}})()")
        ev(f"FM.select({{t:'entity',id:'{pid}'}})");pg.wait_for_timeout(300)
        R[name+'_btn']=ev("!!document.querySelector('#editor [data-act=lay-open]')")
        ev("document.querySelector('#editor [data-act=lay-open]').click()");pg.wait_for_timeout(400)
        pg.screenshot(path=f'out/lay_{name}_open.png')
        box=pg.locator(f'#lay-stage .sp[data-el="{el[0]}"]').bounding_box()
        # drag it down-right
        pg.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);pg.mouse.down()
        for i in range(10):pg.mouse.move(box['x']+box['width']/2+i*4,box['y']+box['height']/2+i*12)
        pg.mouse.up();pg.wait_for_timeout(300)
        e=ev(f"FM.S.p.entities['{pid}']")
        R[name+'_free']=[e.get('layout'),all('box' in x for x in e['elements'])]
        R[name+'_link_kept']=ev(f"FM.outConns(FM.S.p,'{pid}','{el[0]}').map(c=>c.to)")==[el[2]]
        R[name+'_order']=[x['label'] for x in e['elements']]
        # resize with SE handle
        hb=pg.locator('#lay-stage .lh.se').bounding_box()
        w0=ev(f"FM.S.p.entities['{pid}'].elements.find(x=>x.id==='{el[0]}').box.w")
        pg.mouse.move(hb['x']+9,hb['y']+9);pg.mouse.down();pg.mouse.move(hb['x']-30,hb['y']+20,steps=6);pg.mouse.up();pg.wait_for_timeout(300)
        w1=ev(f"FM.S.p.entities['{pid}'].elements.find(x=>x.id==='{el[0]}').box.w")
        R[name+'_resized']=w1<w0
        # rename by double click
        pg.locator(f'#lay-stage .sp[data-el="{el[0]}"]').dblclick();pg.wait_for_timeout(200)
        pg.keyboard.press('Control+a');pg.keyboard.type('Renamed part');pg.keyboard.press('Enter');pg.wait_for_timeout(300)
        R[name+'_renamed']=ev(f"FM.S.p.entities['{pid}'].elements.find(x=>x.id==='{el[0]}').label")
        # change what it does via side select
        ev("document.querySelector('#lay-stage .sp.lay-sel')||0")
        pg.screenshot(path=f'out/lay_{name}_sel.png')
        tgt=ev(f"Object.values(FM.S.p.entities).find(e=>e.kind==='page'&&e.id!=='{pid}'&&e.id!=='{el[2]}').id")
        pg.select_option('#lay-go',tgt);pg.wait_for_timeout(300)
        R[name+'_relinked']=ev(f"FM.outConns(FM.S.p,'{pid}','{el[0]}')[0].to")==tgt
        # add part
        pg.click('[data-lay=done] >> nth=1') if False else None
        ev("FM.S.sel=null")
        # close, check canvas card + play render free layout
        pg.keyboard.press('Escape');pg.wait_for_timeout(300)
        ev("FM.setView('screens')");pg.wait_for_timeout(500)
        R[name+'_canvas_free']=ev(f"!!document.querySelector('.scard[data-id=\"{pid}\"] .scr-body.free .sp.fp')")
        ev(f"FM.openPlay('{pid}')");pg.wait_for_timeout(500)
        R[name+'_play_free']=ev("!!document.querySelector('#play .scr-body.free .sp.fp[data-pl]')")
        pg.screenshot(path=f'out/lay_{name}_play.png')
        ev("document.querySelector('#play [data-pact=close]').click()");pg.wait_for_timeout(200)
        # undo goes back
        n=ev("FM.S.undo.length");ev("FM.undo();FM.undo();FM.undo();FM.undo()");pg.wait_for_timeout(200)
        R[name+'_undo']=ev(f"FM.S.p.entities['{pid}'].layout||'auto'")
        pg.close()
    R['errs']=errs;b.close()
print(json.dumps(R,indent=1))
