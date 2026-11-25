import os as _os, pathlib as _pl
_os.chdir(_os.path.dirname(_os.path.abspath(__file__)))
APP=_pl.Path('../app/index.html').resolve().as_uri()
import json, sys
from playwright.sync_api import sync_playwright
URL=APP
errs=[]
res={}
with sync_playwright() as pw:
    b=pw.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':1440,'height':900})
    pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
    pg.on('console',lambda m: errs.append('CONSOLE '+m.text) if m.type=='error' else None)
    pg.goto(URL); pg.wait_for_timeout(800)
    pg.screenshot(path='out/desk.png')
    # Test A: add page via UI
    pg.click('.topbar [data-act=add-page]'); pg.fill('#ap-name','Rent history'); pg.click('.mfoot .btn.primary')
    pg.wait_for_timeout(200)
    res['A']=pg.evaluate("Object.values(FM.S.p.entities).some(e=>e.name==='Rent history') && !!document.querySelector('.card .ttl') && localStorage.getItem('fm.p.'+FM.S.p.id).includes('Rent history')")
    # Test K: Save button with no action is flagged
    pg.click('[data-act=add-el]'); pg.wait_for_timeout(100)
    elid=pg.evaluate("FM.S.sel.el")
    pg.fill(f'#el-l-{elid}','Save'); pg.press(f'#el-l-{elid}','Tab')
    res['K']=pg.evaluate("FM.checkProject(FM.S.p).some(i=>i.msg.includes('“Save”')&&i.msg.includes('doesn'))")
    # Test B: branch new page from that button
    pg.select_option(f'#el-g-{elid}','new:page'); pg.wait_for_timeout(200)
    res['B']=pg.evaluate(f"""(()=>{{const p=FM.S.p;const c=Object.values(p.connections).find(c=>c.from.element==='{elid}');return !!c && p.entities[c.to].kind==='page' && p.entities[c.to].name==='Save' && c.type==='navigate'}})()""")
    # moving the target keeps the connection attached (path redraws)
    res['B_attached']=pg.evaluate(f"""(()=>{{const p=FM.S.p;const c=Object.values(p.connections).find(c=>c.from.element==='{elid}');return !!document.querySelector('.ln[data-c="'+c.id+'"]')}})()""")
    # Test C: link to existing reuses page
    n_before=pg.evaluate("Object.keys(FM.S.p.entities).length")
    pg.click('[data-act=add-el]'); pg.wait_for_timeout(100)
    el2=pg.evaluate("FM.S.sel.el")
    pg.select_option(f'#el-g-{el2}','pg_home'); pg.wait_for_timeout(150)
    res['C']=pg.evaluate(f"Object.keys(FM.S.p.entities).length==={n_before} && Object.values(FM.S.p.connections).some(c=>c.from.element==='{el2}'&&c.to==='pg_home')")
    # Test H: undo last transaction
    before=pg.evaluate("Object.keys(FM.S.p.connections).length")
    pg.keyboard.press('Escape'); pg.evaluate('FM.select(null)'); 
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(150)
    res['H']=pg.evaluate(f"Object.keys(FM.S.p.connections).length==={before}-1 && !!FM.S.p.entities.pg_home")
    # Test I: export JSON → import reconstructs
    res['I']=pg.evaluate("""(()=>{const p=FM.S.p;const j=FM.exportJSON(p);const q=FM.importJSON(j);return JSON.stringify(Object.keys(q.entities).sort())===JSON.stringify(Object.keys(p.entities).sort()) && JSON.stringify(q.connections)===JSON.stringify(p.connections) && q.startPageId===p.startPageId})()""")
    # Mermaid/CSV non-empty
    res['exports']=pg.evaluate("FM.toMermaid(FM.S.p).length>200 && FM.toCSV(FM.S.p).split('\\n').length>30")
    # Test F: zoom levels
    lv=[]
    for z in [0.2,0.4,0.6,1.0,1.5,2.2]:
        pg.evaluate(f"FM.S.view.z={z};(()=>{{const r=document.querySelector('#viewport');}})()")
        pg.click('[data-act=zoom-in]'); pg.click('[data-act=zoom-out]')
        lv.append(pg.evaluate("FM.S.zl"))
    res['F_levels']=lv
    # trace
    pg.evaluate("FM.S.sel={t:'entity',id:'pg_profile'}")
    r=pg.evaluate("FM.trace(FM.S.p,{id:'pg_profile',el:'pg_profile_e1'},'fwd').order")
    res['trace']=r
    # reverse trace data
    res['trace_back']=pg.evaluate("FM.trace(FM.S.p,{id:'dat_repair'},'back').order.length")
    # drag a card via mouse and check undo entry
    pg.click('[data-act=fit]'); pg.wait_for_timeout(200)
    box=pg.locator('.card[data-id=pg_docs] .hd').bounding_box()
    pg.mouse.move(box['x']+40,box['y']+15); pg.mouse.down(); pg.mouse.move(box['x']+140,box['y']+95,steps=6); pg.mouse.up()
    res['drag']=pg.evaluate("FM.S.undo[FM.S.undo.length-1].label")
    # link by dragging port from Documents Upload document to Done page
    pg.click('[data-act=zoom-reset]'); pg.wait_for_timeout(100)
    pg.evaluate("document.querySelector('.card[data-id=pg_docs]').scrollIntoView()")
    # centre on docs
    pg.evaluate("FM.S.sel=null")
    issues=pg.evaluate("FM.checkProject(FM.S.p).map(i=>i.sev+': '+i.msg)")
    res['issues']=issues
    pg.screenshot(path='out/desk2.png')
    # editor screenshot
    pg.click('[data-act=fit]'); pg.wait_for_timeout(200)
    pg.locator('.card[data-id=pg_prop] .hd').click(); pg.wait_for_timeout(200)
    pg.screenshot(path='out/desk_editor.png')
    # dark
    pg.evaluate("document.documentElement.setAttribute('data-theme','dark')"); pg.wait_for_timeout(200)
    pg.screenshot(path='out/desk_dark.png')
    # export modal
    pg.click('.topbar [data-act=export]'); pg.wait_for_timeout(200)
    pg.screenshot(path='out/export.png')
    pg.keyboard.press('Escape')
    # persistence reload
    pid=pg.evaluate("FM.S.p.id"); nent=pg.evaluate("Object.keys(FM.S.p.entities).length")
    pg.reload(); pg.wait_for_timeout(600)
    res['reload']=pg.evaluate(f"FM.S.p.id==='{pid}' && Object.keys(FM.S.p.entities).length==={nent}")
    # Mobile
    m=b.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
    m.on('pageerror',lambda e: errs.append('M PAGEERR '+str(e)))
    m.goto(URL); m.wait_for_timeout(700)
    m.screenshot(path='out/mob.png')
    m.locator('.card[data-id=pg_home] .hd').tap(); m.wait_for_timeout(300)
    m.screenshot(path='out/mob_edit.png')
    m.click('[data-act=menu]'); m.wait_for_timeout(300)
    m.screenshot(path='out/mob_menu.png')
    # Unfolded fold ~ 884 wide
    f=b.new_page(viewport={'width':884,'height':1000})
    f.on('pageerror',lambda e: errs.append('F PAGEERR '+str(e)))
    f.goto(URL); f.wait_for_timeout(600)
    f.locator('.card[data-id=pg_room] .hd').click(); f.wait_for_timeout(200)
    f.screenshot(path='out/fold.png')
    b.close()
print(json.dumps(res,indent=1))
print('\n'.join(errs) or 'no errors')
