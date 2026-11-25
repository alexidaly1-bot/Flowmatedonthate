import os as _os, pathlib as _pl
_os.chdir(_os.path.dirname(_os.path.abspath(__file__)))
APP=_pl.Path('../app/index.html').resolve().as_uri()
import json,base64
from playwright.sync_api import sync_playwright
exec(open('satest.py').read().split('INIT=')[0])  # MOCK, bm
INIT="""window.__calls=[];window.__imgs=[];window.claude={use:async n=>{if(n==='sample'){const f=async()=>({text:''});f.limits=async()=>({images:true});f.json=async(prompt,opts)=>{window.__calls.push(prompt);window.__imgs.push(opts&&opts.images?opts.images.map(b=>b.type+':'+b.size):[]);await new Promise(r=>setTimeout(r,200));return %s};return f}return null}};""" % json.dumps(MOCK)
R={};errs=[]
# a 2000x1200 png made in page
with sync_playwright() as pw:
    b=pw.chromium.launch();pg=b.new_page(viewport={'width':1280,'height':860})
    pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
    pg.add_init_script(INIT)
    pg.goto(APP);pg.wait_for_timeout(200)
    pg.evaluate("j=>{localStorage.clear();const p=JSON.parse(j);localStorage.setItem('fm.p.'+p.id,j);localStorage.setItem('fm.index',JSON.stringify([p.id]));localStorage.setItem('fm.last',p.id)}",bm)
    pg.reload();pg.wait_for_timeout(1500)
    ev=pg.evaluate
    ev("FM.openSmartAction()");pg.wait_for_timeout(500)
    R['add_btn']=ev("!!document.querySelector('[data-act=sa-img-add]:not([disabled])')")
    # add two images via file chooser
    def mk(w,h,c):
        return ev(f"""(async()=>{{const cv=document.createElement('canvas');cv.width={w};cv.height={h};const x=cv.getContext('2d');x.fillStyle='{c}';x.fillRect(0,0,{w},{h});const b=await new Promise(r=>cv.toBlob(r,'image/png'));const a=new Uint8Array(await b.arrayBuffer());let s='';for(const v of a)s+=String.fromCharCode(v);return btoa(s)}})()""")
    p1=mk(2400,1600,'#e2805f');p2=mk(400,300,'#3355aa')
    open('/tmp/i1.png','wb').write(base64.b64decode(p1));open('/tmp/i2.png','wb').write(base64.b64decode(p2))
    with pg.expect_file_chooser() as fc:
        pg.click('[data-act=sa-img-add]')
    fc.value.set_files(['/tmp/i1.png','/tmp/i2.png']);pg.wait_for_timeout(800)
    R['labels']=ev("[...document.querySelectorAll('.sa-il')].map(i=>i.value)")
    pg.fill('.sa-il >> nth=1','Navigation reference');pg.wait_for_timeout(100)
    pg.click('.sa-thumb >> nth=0');pg.wait_for_timeout(200)
    R['preview']=ev("!document.querySelector('#sa-view').hidden&&document.querySelector('#sa-view figcaption').innerText")
    pg.keyboard.press('Escape');ev("document.querySelector('#sa-view').hidden=true")
    pg.screenshot(path='out/sa_imgs.png')
    # image-only request
    ev("document.querySelector('#sa-in').value='';FM.AI.text=''")
    pg.click('[data-act=sa-go]');pg.wait_for_timeout(900)
    R['img_only_sent']=ev("[window.__calls.length,window.__imgs[0]]")
    R['prompt_has_labels']=ev("window.__calls[0].includes('Navigation reference')&&window.__calls[0].includes('Image A')&&window.__calls[0].includes('only images')")
    R['resized_jpeg']=ev("window.__imgs[0][0].startsWith('image/jpeg')")
    R['result']=ev("FM.AI.state")
    # same again -> reused, no new call
    pg.click('[data-act=modal-close]');ev("FM.openSmartAction()");pg.wait_for_timeout(300)
    pg.click('[data-act=sa-go]');pg.wait_for_timeout(500)
    R['reused']=ev("window.__calls.length")==1
    # remove one, text+image
    pg.click('[data-act=sa-img-del] >> nth=0');pg.wait_for_timeout(200)
    R['after_remove']=ev("FM.AI.imgs.map(x=>x.label)")
    pg.fill('#sa-in','make it look like Navigation reference');pg.click('[data-act=sa-go]');pg.wait_for_timeout(700)
    R['text_img']=ev("[window.__calls.length,window.__imgs[1].length]")
    # apply -> images cleared
    pg.click('label.saopt >> nth=0');pg.click('[data-act=sa-apply]');pg.wait_for_timeout(500)
    R['cleared_after_apply']=ev("FM.AI.imgs.length")
    # disable setting
    ev("FM.S.prefs.saImages=false");ev("FM.openSmartAction()");pg.wait_for_timeout(300)
    R['hidden_when_off']=ev("!document.querySelector('.sa-att')")
    pg.click('[data-act=modal-close]')
    # double click → one request
    ev("FM.S.prefs.saImages=true");ev("FM.openSmartAction('add a help page')");pg.wait_for_timeout(200)
    n0=ev("window.__calls.length");ev("FM.AI.state='ask'");ev("document.querySelector('[data-act=sa-go]').click();document.querySelector('[data-act=sa-go]')&&document.querySelector('[data-act=sa-go]').click()");pg.wait_for_timeout(700)
    R['no_double']=ev("window.__calls.length")-n0
    R['errs']=errs
    b.close()
print(json.dumps(R,indent=1))
