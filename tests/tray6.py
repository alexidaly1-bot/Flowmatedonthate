import os as _os, pathlib as _pl
_os.chdir(_os.path.dirname(_os.path.abspath(__file__)))
APP=_pl.Path('../app/index.html').resolve().as_uri()
from playwright.sync_api import sync_playwright
bm=open('fixtures/bm_final.json').read()
R={}
with sync_playwright() as pw:
    b=pw.chromium.launch()
    for name,w,h,mob in [('phone',360,780,True),('foldc',372,820,True),('foldo',690,800,True),('chromebook',1366,768,False),('desk',1440,900,False)]:
        pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=2 if mob else 1,has_touch=mob,is_mobile=mob)
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
        pg.goto(APP);pg.wait_for_timeout(200)
        pg.evaluate("j=>{localStorage.clear();const p=JSON.parse(j);localStorage.setItem('fm.p.'+p.id,j);localStorage.setItem('fm.index',JSON.stringify([p.id]));localStorage.setItem('fm.last',p.id)}",bm)
        pg.reload();pg.wait_for_timeout(800);pg.evaluate("FM.setView('screens')");pg.wait_for_timeout(600)
        r=pg.evaluate("""(()=>{const t=document.querySelector('#tray');const r=t.getBoundingClientRect();const sc=t.querySelector('.tray-scroll');
          const ov=[...document.querySelectorAll('.overlay,.fab,#minimap')].filter(o=>o.offsetParent).map(o=>{const q=o.getBoundingClientRect();return [o.className||o.id,q.left<r.right&&q.right>r.left&&q.top<r.bottom&&q.bottom>r.top]}).filter(x=>x[1]).map(x=>x[0]);
          return {rect:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],scrolls:t.classList.contains('scrolls'),overlaps:ov,dock:[...t.classList].join(' ')}})()""")
        pg.screenshot(path=f'out/tray_{name}.png')
        # scroll to end via arrows then check last part visible
        for i in range(8):pg.evaluate("document.querySelector('#tray .next').disabled||document.querySelector('#tray .next').click()");pg.wait_for_timeout(250)
        r['last_visible']=pg.evaluate("(()=>{const t=document.querySelector('#tray .tray-scroll');const l=t.lastElementChild.getBoundingClientRect(),q=t.getBoundingClientRect();return l.bottom<=q.bottom+1&&l.right<=q.right+1})()")
        pg.evaluate("document.querySelector('#tray .tray-fold').click()");pg.wait_for_timeout(200)
        r['folded']=pg.evaluate("[document.querySelector('#tray').classList.contains('folded'),Math.round(document.querySelector('#tray').getBoundingClientRect().height)]")
        pg.screenshot(path=f'out/tray_{name}_fold.png')
        pg.evaluate("document.querySelector('#tray .tray-fold').click()")
        pg.evaluate("document.querySelector('#tray .tray-move').click()");pg.wait_for_timeout(200)
        r['moved']=pg.evaluate("document.querySelector('#tray').className")
        r['errs']=errs;R[name]=r;pg.close()
    b.close()
import json;print(json.dumps(R,indent=1))
