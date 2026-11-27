import os as _os, pathlib as _pl
_os.chdir(_os.path.dirname(_os.path.abspath(__file__)))
APP=_pl.Path('../dist/index.html').resolve().as_uri()
from playwright.sync_api import sync_playwright
bm=open('fixtures/bm_final.json').read()
with sync_playwright() as pw:
    b=pw.chromium.launch()
    pg=b.new_page(viewport={'width':690,'height':800},device_scale_factor=2.6,has_touch=True,is_mobile=True)
    pg.goto(APP);pg.wait_for_timeout(300)
    pg.evaluate("j=>{localStorage.clear();const p=JSON.parse(j);localStorage.setItem('fm.p.'+p.id,j);localStorage.setItem('fm.index',JSON.stringify([p.id]));localStorage.setItem('fm.last',p.id)}",bm)
    pg.reload();pg.wait_for_timeout(900)
    pg.evaluate("""FM.commit('x',p=>{const ms=Object.values(p.modules);const people=ms.find(m=>m.name==='People').id;const set=ms.find(m=>m.name==='Settings').id;const av=FM.addModule(p,'Avatar studio','oak').id;
      const mk=(n,m,sx,sy,parts)=>{const e=FM.addEntity(p,'page',{name:n,moduleId:m,x:1200,y:6000+sy,pageType:'Custom'});e.sx=sx;e.sy=sy;e.elements=parts.map((l,i)=>({id:'el_'+n.replace(/\\W/g,'')+i,label:l,type:'button'}));return e};
      mk('Photo album',people,2320,0,['Images','Make avatar']);mk('Avatar maker',av,2320,800,['Draw','Describe','Use covered photos','Ask AI','Save avatar','Upload']);mk('Custom feature',av,2320,1600,['Describe','Save for','Create']);mk('Insights',people,2320,2400,['Pick','Results']);mk('Appearance',set,2900,0,['Theme','Previews','Style'])})""")
    for v,z,x,y,n in [('screens',.3,-2100,-200,'s30'),('screens',.25,-1700,-300,'s25'),('blocks',.21,0,-100,'b21')]:
        pg.evaluate(f"FM.setView('{v}');FM.renderCanvas()");pg.wait_for_timeout(300)
        pg.evaluate(f"(()=>{{const id=Object.values(FM.S.p.entities).find(e=>e.name==='Photo album').id;FM.centreOn(id,{z});FM.renderCanvas()}})()");pg.wait_for_timeout(1200)
        pg.screenshot(path=f'out/bug2_{n}.png')
        print(n,pg.evaluate("[FM.S.frameOverlap&&FM.S.frameOverlap.length, !!document.querySelector('#ovwarn:not([hidden])')]"))
    # tidy
    pg.evaluate("FM.setView('screens')");pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('#ovwarn [data-act=tidy]').click()");pg.wait_for_timeout(1200)
    print('after tidy',pg.evaluate("[FM.S.frameOverlap.length, !!document.querySelector('#ovwarn:not([hidden])')]"))
    pg.screenshot(path='out/bug2_tidy_s.png')
    pg.evaluate("FM.setView('blocks')");pg.wait_for_timeout(500)
    print('blocks overlap',pg.evaluate("FM.S.frameOverlap.length"))
    pg.evaluate("document.querySelector('#ovwarn [data-act=tidy]')&&document.querySelector('#ovwarn [data-act=tidy]').click()");pg.wait_for_timeout(1200)
    print('blocks after',pg.evaluate("FM.S.frameOverlap.length"))
    pg.screenshot(path='out/bug2_tidy_b.png')
    b.close()
