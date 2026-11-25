import os as _os, pathlib as _pl
_os.chdir(_os.path.dirname(_os.path.abspath(__file__)))
APP=_pl.Path('../app/index.html').resolve().as_uri()
import json,zipfile,io,os,base64
from playwright.sync_api import sync_playwright
res={};errs=[];notes={}
def T(name,fn):
    try:
        r=fn();res[name]=bool(r) if not isinstance(r,tuple) else bool(r[0])
        if isinstance(r,tuple):notes[name]=r[1]
    except Exception as e:res[name]=False;notes[name]='EXC '+str(e)[:300]
os.makedirs('out/dl',exist_ok=True)
with sync_playwright() as pw:
    b=pw.chromium.launch();ctx=b.new_context(viewport={'width':1440,'height':900},accept_downloads=True);pg=ctx.new_page()
    pg.on('pageerror',lambda e:errs.append('PAGE:'+str(e.stack)[:400]))
    pg.goto(APP);pg.wait_for_timeout(300)
    pg.evaluate("localStorage.clear()");pg.reload();pg.wait_for_timeout(1000)
    ev=lambda js:pg.evaluate(js)
    def dl(click_js):
        with pg.expect_download(timeout=15000) as d:
            ev(click_js)
        f=d.value;path='out/dl/'+f.suggested_filename;f.save_as(path);return path
    # ---- Test D: global setting with 3 functions, overrides, Play behaviour
    def tD():
        r=ev("""(()=>{const F=FM;let out={};F.commit('setup D',p=>{
          const m=Object.values(p.modules)[0].id;
          const s=F.addEntity(p,'setting',{name:'Allow tenant messaging2',key:'allowTenantMessaging2',valueType:'On / off',defaultValue:'On',scope:'Whole app',moduleId:m,x:2000,y:0});
          const pg=F.addEntity(p,'page',{name:'Msg page',pageType:'Detail',moduleId:m,x:2000,y:300});pg.elements=[{id:'el_msgbtn',label:'Message landlord',type:'button'}];
          const a=F.addEntity(p,'page',{name:'Chat open',pageType:'Messaging',moduleId:m,x:2600,y:300}),bb=F.addEntity(p,'page',{name:'Messaging off',pageType:'Error',moduleId:m,x:2600,y:600});
          const fns=[1,2,3].map(i=>F.addEntity(p,'function',{name:'Fn '+i,moduleId:m,x:2300,y:300+i*150,steps:'Check allowTenantMessaging2'}));
          const d=F.addEntity(p,'decision',{name:'Messaging allowed?',moduleId:m,x:2400,y:300});
          F.addConn(p,{entity:pg.id,element:'el_msgbtn'},fns[0].id,'trigger');F.addConn(p,{entity:fns[0].id,element:null},d.id,'workflow');F.addConn(p,{entity:d.id,element:null},s.id,'reference');
          F.addConn(p,{entity:d.id,element:null},a.id,'condition','Yes');F.addConn(p,{entity:d.id,element:null},bb.id,'condition','No');
          for(const f of fns)F.addConn(p,{entity:f.id,element:null},s.id,'reference');
          out={s:s.id,pg:pg.id,d:d.id,a:a.id,b:bb.id}});return out})()""")
        notes['D_ids']=r
        refs=ev(f"FM.settingRefs(FM.S.p,FM.S.p.entities['{r['s']}']).ids.length")
        sug1=ev(f"FM.suggestedAnswer(FM.S.p,FM.S.p.entities['{r['d']}'],FM.effectiveSetting(FM.S.p,FM.S.p.entities['{r['s']}'],'{r['pg']}'))")
        ev(f"FM.select({{t:'entity',id:'{r['s']}'}})");pg.wait_for_timeout(200)
        pg.select_option('#f-dv2','Off');pg.wait_for_timeout(300)
        modal=ev("document.querySelector('#modal:not(.hide) .cr-sum')?document.querySelector('#modal .cr-sum').textContent:''")
        pg.click('#modal .mfoot .btn.primary');pg.wait_for_timeout(300)
        dv=ev(f"FM.S.p.entities['{r['s']}'].defaultValue")
        sug2=ev(f"FM.suggestedAnswer(FM.S.p,FM.S.p.entities['{r['d']}'],FM.effectiveSetting(FM.S.p,FM.S.p.entities['{r['s']}'],'{r['pg']}'))")
        # override for one page → back to On there
        ev(f"FM.commit('ov',p=>{{p.entities['{r['s']}'].overrides.push({{id:'ov1',target:'page:{r['pg']}',value:'On'}})}})")
        ov=ev(f"FM.effectiveSetting(FM.S.p,FM.S.p.entities['{r['s']}'],'{r['pg']}')")
        other=ev(f"FM.effectiveSetting(FM.S.p,FM.S.p.entities['{r['s']}'],'{r['a']}')")
        # Play: open on the page and tap the button → decision sheet suggests Yes (override On)
        ev(f"FM.openPlay('{r['pg']}')");pg.wait_for_timeout(400)
        ev(f"FM.playTap('el_msgbtn')");pg.wait_for_timeout(400)
        sheet=ev("document.querySelector('.pl-sheet')?document.querySelector('.pl-sheet').innerText:''")
        ev("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))");ev("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))");pg.wait_for_timeout(200)
        ok=refs>=4 and sug1=='Yes' and 'may affect' in modal and dv=='Off' and sug2=='No' and ov=='On' and other=='Off' and 'suggested' in sheet.lower() and 'Yes' in sheet
        return ok,{'refs':refs,'sug1':sug1,'modal':modal,'dv':dv,'sug2':sug2,'ov':ov,'other':other,'sheet':sheet[:200]}
    T('D_global_setting_dependencies_and_simulation',tD)
    # ---- Change Radius on delete + rule impact simulator
    def tCR():
        r=notes['D_ids'];ev(f"FM.select({{t:'entity',id:'{r['s']}'}})");pg.wait_for_timeout(200)
        box=ev("document.querySelector('.cr-box').innerText")
        ev("document.querySelector('[data-act=rule-sim]').click()");pg.wait_for_timeout(300)
        sim=ev("document.querySelector('#modal .mbody').innerText");ev("FM.S&&document.querySelector('[data-act=modal-close]').click()")
        ev("document.querySelector('[data-act=del-entity]').click()");pg.wait_for_timeout(300)
        asks=ev("!!document.querySelector('#modal:not(.hide) .cr-sum')");ev("document.querySelector('[data-act=modal-close]').click()")
        still=ev(f"!!FM.S.p.entities['{r['s']}']")
        return ('may affect' in box and 'Routes that change' in sim and 'answers' in sim and asks and still),{'box':box[:150],'sim':sim[:300]}
    T('Change_radius_and_rule_simulator',tCR)
    # ---- Test L: shared component used by five pages
    def tL():
        cid=ev("""(()=>{let id;FM.commit('setup L',p=>{const m=Object.values(p.modules)[0].id;const c=FM.addEntity(p,'component',{name:'Rent card',parts:'Amount\\nDue date',moduleId:m,x:3200,y:0});id=c.id;for(let i=0;i<5;i++){const g=FM.addEntity(p,'page',{name:'Uses card '+i,pageType:'Detail',moduleId:m,x:3200+i*300,y:400});FM.addConn(p,{entity:g.id,element:null},c.id,'reference')}});return id})()""")
        ev(f"FM.select({{t:'entity',id:'{cid}'}})");pg.wait_for_timeout(200)
        ev("document.querySelector('[data-act=cmp-edit]').click()");pg.wait_for_timeout(200)
        pg.fill('#ce-n','Rent summary card');pg.fill('#ce-p','Amount\nDue date\nPaid badge');pg.wait_for_timeout(200)
        prev=ev("[...document.querySelectorAll('#ce-prev .li')].map(x=>x.innerText)");btn=ev("document.querySelector('#modal .mfoot .btn.primary').textContent")
        pg.click('#modal .mfoot .btn.primary');pg.wait_for_timeout(200)
        name=ev(f"FM.S.p.entities['{cid}'].name")
        return (len(prev)==5 and all('renamed' in x and 'Paid badge' in x for x in prev) and '5 pages' in btn and name=='Rent summary card'),{'prev':prev[:2],'btn':btn}
    T('L_shared_component_five_references_preview',tL)
    # ---- Function editor fields + plain-English logic + passport
    def tFn():
        fid=ev("Object.values(FM.S.p.entities).find(e=>e.kind==='function'&&e.name==='Fn 1').id")
        ev(f"FM.select({{t:'entity',id:'{fid}'}})");pg.wait_for_timeout(200)
        fields=ev("['#f-at','#f-in','#f-pre','#f-cond','#f-dops','#f-out','#f-purp'].every(s=>document.querySelector(s))")
        pg.select_option('#f-at','Save data');pg.wait_for_timeout(150)
        pg.fill('#f-in','message text');ev("document.querySelector('#f-in').dispatchEvent(new Event('change',{bubbles:true}))")
        ev("document.querySelector('[data-act=fn-perm]').click()");pg.wait_for_timeout(150)
        st=ev(f"[FM.S.p.entities['{fid}'].actionType,FM.S.p.entities['{fid}'].inputs,FM.S.p.entities['{fid}'].perms.length]")
        ev("document.querySelector('[data-act=passport]').click()");pg.wait_for_timeout(200)
        pp=ev("document.querySelector('#modal .mbody').innerText")
        ev("document.querySelector('[data-pp-tech=\"1\"]').click()");tech=ev("document.querySelector('#pp-b').innerText")
        p_path=dl("document.querySelector('#modal .mfoot .btn.primary').click()");md=open(p_path).read()
        ev("document.querySelector('[data-act=modal-close]')&&document.querySelector('[data-act=modal-close]').click()")
        return (fields and st==['Save data','message text',1] and 'Who can use it' in pp and 'What the developer needs' in pp and 'Function fn_' in tech.replace('Function '+fid,'Function fn_') and '# Feature Passport' in md),{'st':st,'md':md[:120]}
    T('Function_editor_fields_passport_logic',tFn)
    # ---- Planning: priority, acceptance checks, progress uses them
    def tPlan():
        pid=notes['D_ids']['pg'];ev(f"FM.select({{t:'entity',id:'{pid}'}})");pg.wait_for_timeout(200)
        ev("document.querySelector('details.plan').open=true");pg.select_option('#f-pri','High');pg.wait_for_timeout(100)
        ev("document.querySelector('[data-act=acc-add]').click()");pg.wait_for_timeout(100);ev("document.querySelector('[data-act=acc-add]').click()");pg.wait_for_timeout(100)
        before=ev("Math.round(FM.progressOf(FM.S.p).score(FM.S.p.entities['%s'])*100)"%pid)
        ev("document.querySelector('[data-act=acc-tick]').click()");pg.wait_for_timeout(100)
        after=ev("Math.round(FM.progressOf(FM.S.p).score(FM.S.p.entities['%s'])*100)"%pid)
        ev("document.querySelector('[data-act=panel][data-p=progress]').click()");pg.wait_for_timeout(200)
        ev("document.querySelector('[data-act=task-gen]').click()");pg.wait_for_timeout(200)
        n=ev("FM.S.p.tasks.length");pt=ev("document.querySelector('#panel').innerText")
        return (before==0 and after==50 and n>10 and 'overall' in pt and ev("FM.S.p.entities['%s'].priority"%pid)=='High'),{'b':before,'a':after,'tasks':n}
    T('Planning_acceptance_progress_tasks',tPlan)
    # ---- Test G: two photos + three hex → palettes, checks, apply to one page and whole app
    def tG():
        ev("document.querySelector('[data-act=panel][data-p=colours]').click()");pg.wait_for_timeout(200)
        import struct,zlib
        def png(c1,c2):
            w=h=40;raw=b''.join(b'\x00'+b''.join(bytes(c1 if x<20 else c2) for x in range(w)) for y in range(h))
            def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
            return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
        open('fixtures/ph1.png','wb').write(png((214,96,60),(250,236,220)));open('fixtures/ph2.png','wb').write(png((30,90,80),(240,220,120)))
        pg.set_input_files('#col-photo',['fixtures/ph1.png','fixtures/ph2.png']);pg.wait_for_timeout(1200)
        photos=ev("FM.COL.photos.length")
        pg.fill('#col-hex','#2D6A4F, #E2805F #1D3557');ev("document.querySelector('[data-act=col-hex]').click()");pg.wait_for_timeout(200)
        seeds=ev("FM.COL.seeds.length")
        ev("document.querySelector('[data-act=col-gen]').click()");pg.wait_for_timeout(300)
        opts=ev("document.querySelectorAll('.col-opt').length");checks=ev("document.querySelectorAll('.li.ck').length")
        allpass=ev("FM.COL.results.map(r=>FM.paletteChecks(r.light).filter(c=>!c.ok).length+FM.paletteChecks(r.dark).filter(c=>!c.ok).length)")
        pid=notes['D_ids']['pg']
        pg.select_option('#col-scope','ent:'+pid);ev("document.querySelector('[data-act=col-apply]').click()");pg.wait_for_timeout(200);pg.click('#modal .mfoot .btn.primary');pg.wait_for_timeout(300)
        pageLook=ev(f"!!(FM.S.p.entities['{pid}'].look&&FM.S.p.entities['{pid}'].look.palette)")
        appBefore=ev("JSON.stringify(FM.S.p.look||{})")
        ev("document.querySelector('[data-act=col-sel][data-i=\"2\"]').click()");pg.wait_for_timeout(200)
        pg.select_option('#col-scope','app:');ev("document.querySelector('[data-act=col-apply]').click()");pg.wait_for_timeout(200);pg.click('#modal .mfoot .btn.primary');pg.wait_for_timeout(300)
        appLook=ev("!!(FM.S.p.look&&FM.S.p.look.palette)");inh=ev(f"FM.lookFor(FM.S.p,'{pid}').paletteName!==FM.lookFor(FM.S.p,'{notes['D_ids']['a']}').paletteName")
        style=ev(f"FM.lookStyle(FM.lookFor(FM.S.p,'{pid}'),'light')")
        return (photos==2 and seeds>=5 and opts==7 and checks==12 and sum(allpass)==0 and pageLook and appLook and inh and '--ap-bg' in style),{'seeds':seeds,'fails':allpass}
    T('G_colour_scheme_photos_hex_apply',tG)
    def tColMore():
        ev("document.querySelector('[data-act=col-fav-save]').click()");pg.wait_for_timeout(150);pg.click('#modal .mfoot .btn.primary');pg.wait_for_timeout(200)
        fav=ev("FM.S.p.palettes.favourites.length");hist=ev("FM.S.p.palettes.history.length")
        ev("document.querySelector('[data-act=col-usage]').click()");pg.wait_for_timeout(150);use=ev("document.querySelectorAll('#modal .li').length");ev("document.querySelector('[data-act=modal-close]').click()")
        ev("document.querySelector('[data-act=col-mode][data-v=dark]').click()");pg.wait_for_timeout(100)
        pg.select_option('#col-cvd','deuteranopia');pg.wait_for_timeout(200);cvd=ev("FM.COL.cvd")
        p2=dl("document.querySelector('[data-act=col-tokens]').click();setTimeout(()=>document.querySelector('#modal .mfoot .btn.primary').click(),100)")
        tok=json.load(open(p2))
        return (fav==1 and hist==2 and use>3 and cvd=='deuteranopia' and 'color' in tok),{'fav':fav,'hist':hist}
    T('Colours_favourites_history_usage_cvd_tokens',tColMore)
    # ---- Health checks
    def tHealth():
        ev("""FM.commit('h',p=>{const m=Object.values(p.modules)[0].id;const g=FM.addEntity(p,'page',{name:'Sign in',pageType:'Login / registration',moduleId:m,x:5000,y:0});g.elements=[{id:'el_del1',label:'Delete account',type:'button'},{id:'el_clk',label:'Click here',type:'button'}];const f=FM.addEntity(p,'function',{name:'Wipe',moduleId:m,x:5300,y:0});FM.addConn(p,{entity:g.id,element:'el_del1'},f.id,'trigger');const api=FM.addEntity(p,'function',{name:'Call bank',moduleId:m,x:5300,y:300});const ext=FM.addEntity(p,'data',{name:'Bank feed',moduleId:m,x:5600,y:300});FM.addConn(p,{entity:api.id,element:null},ext.id,'api');g.notes='TODO: add two-factor sign in';const a=FM.addEntity(p,'page',{name:'Photos A',moduleId:m,x:5000,y:600,desc:'Photos are private'});const b=FM.addEntity(p,'page',{name:'Photos B',moduleId:m,x:5400,y:600,desc:'Everyone can see all photos'})})""")
        A=ev("(()=>{const A=FM.analyse(FM.S.p);return Object.fromEntries(Object.entries(A).map(([k,v])=>[k,v.map(x=>x.msg)]))})()")
        j=' '.join(A['journeys']);c=' '.join(A['contradictions']);f=' '.join(A['forgotten']);a=' '.join(A['a11y'])
        ev("document.querySelector('[data-act=panel][data-p=check]').click()");pg.wait_for_timeout(200);ev("document.querySelector('[data-act=htab][data-v=journeys]').click()");pg.wait_for_timeout(200)
        fixbtn=ev("!!document.querySelector('[data-act=h-fix]')")
        return ('recover a password' in j and 'Are you sure' in j and 'error path' in j and 'private' in c and 'two-factor' in f and 'Click here' in a and fixbtn),{k:len(v) for k,v in A.items()}
    T('Health_journeys_contradictions_forgotten_a11y',tHealth)
    # ---- Testing: scenario run, expected end, rule change effect
    def tTest():
        r=notes['D_ids']
        ev(f"""FM.commit('path',p=>{{p.paths.push({{id:'path_t1',name:'Message flow',role:null,expect:'',steps:[{{page:'{r['pg']}',kind:'start'}},{{page:'{r['a']}',kind:'tap',el:'el_msgbtn',choice:'Yes'}}]}})}})""")
        ok1=ev("FM.runScenario(FM.S.p,FM.S.p.paths.find(x=>x.id==='path_t1'))")
        ev(f"FM.commit('ov',p=>{{p.entities['{r['s']}'].overrides=[]}})")
        ok2=ev("FM.runScenario(FM.S.p,FM.S.p.paths.find(x=>x.id==='path_t1'))")
        ev("document.querySelector('[data-act=panel][data-p=testing]').click()");pg.wait_for_timeout(200);ev("document.querySelector('[data-act=test-run-all]').click()");pg.wait_for_timeout(200)
        txt=ev("document.querySelector('#panel').innerText")
        return (ok1['ok'] and not ok2['ok'] and 'would answer' in ok2['why'] and 'failed' in txt),{'ok1':ok1['why'],'ok2':ok2['why']}
    T('Testing_scenarios_and_setting_effect',tTest)
    # ---- Docs: review + needs review after change
    def tDocs():
        ev("document.querySelector('[data-act=panel][data-p=docs]').click()");pg.wait_for_timeout(200);ev("document.querySelector('[data-act=docs-review-all]').click()");pg.wait_for_timeout(200)
        ok0=ev("FM.docsFor(FM.S.p).every(d=>d.state==='ok')")
        pid=notes['D_ids']['pg'];ev(f"FM.commit('x',p=>{{p.entities['{pid}'].elements.push({{id:'el_new9',label:'Brand new button',type:'button'}})}})")
        d=ev(f"FM.docsFor(FM.S.p).find(x=>x.id==='{pid}').state")
        ev(f"document.querySelectorAll('[data-act=doc-open]')[FM.docsFor(FM.S.p).findIndex(x=>x.id==='{pid}')].click()");pg.wait_for_timeout(200)
        diff=ev("document.querySelector('#modal .mbody').innerText");ev("document.querySelector('[data-act=modal-close]').click()")
        return (ok0 and d=='review' and 'Brand new button' in diff),d
    T('Living_docs_review_flag',tDocs)
    # ---- Data journey + walkthrough
    def tDJ():
        did=ev("Object.values(FM.S.p.entities).find(e=>e.kind==='data'&&(FM.inConns(FM.S.p,e.id).length)).id")
        ev(f"FM.dataJourneyModal('{did}')");pg.wait_for_timeout(200);t=ev("document.querySelector('#modal .mbody').innerText");ev("document.querySelector('[data-act=modal-close]').click()")
        ev("document.querySelector('[data-act=walkthrough]').click()");pg.wait_for_timeout(200);pg.fill('#sa-in','show me what happens if a tenant reports a repair');pg.click('#modal .mfoot .btn.primary');pg.wait_for_timeout(600)
        w=ev("document.querySelector('#walk')?document.querySelector('#walk').innerText:''");n=ev("FM.WT.steps.length")
        ev("document.querySelector('[data-act=walk-next]').click()");pg.wait_for_timeout(300);w2=ev("document.querySelector('#walk').innerText");ev("document.querySelector('[data-act=walk-end]').click()")
        return ('Saved by' in t and 'Stored' in t and 'Step 1 of' in w and n>2 and 'Step 2 of' in w2),{'walk':w[:160],'n':n}
    T('Data_journey_and_walkthrough',tDJ)
    # ---- Versions + branch + merge
    def tVer():
        ev("document.querySelector('[data-act=panel][data-p=history]').click()");pg.wait_for_timeout(200)
        ev("document.querySelector('[data-act=ver-save]').click()");pg.wait_for_timeout(150);pg.click('#modal .mfoot .btn.primary');pg.wait_for_timeout(200)
        n=ev("FM.versionsOf(FM.S.p.id).length");main=ev("FM.S.p.id");cnt=ev("Object.keys(FM.S.p.entities).length")
        ev("FM.commit('add',p=>{FM.addEntity(p,'page',{name:'After version',x:9000,y:0})})")
        ev("document.querySelector('[data-act=ver-cmp]').click()");pg.wait_for_timeout(200);cmp=ev("document.querySelector('#modal .mbody').innerText");ev("document.querySelector('[data-act=modal-close]').click()")
        ev("document.querySelector('[data-act=br-new]').click()");pg.wait_for_timeout(150);pg.click('#modal .mfoot .btn.primary');pg.wait_for_timeout(400)
        br=ev("FM.S.p.branchOf");ev("FM.commit('b',p=>{FM.addEntity(p,'page',{name:'Branch only page',x:9500,y:0})})")
        ev("document.querySelector('[data-act=panel][data-p=history]').click()");pg.wait_for_timeout(200)
        ev("document.querySelector('[data-act=br-cmp]').click()");pg.wait_for_timeout(200);bc=ev("document.querySelector('#modal .mbody').innerText");ev("document.querySelector('[data-act=modal-close]').click()")
        ev("document.querySelector('[data-act=br-merge]').click()");pg.wait_for_timeout(200);pg.click('#modal .mfoot .btn.primary');pg.wait_for_timeout(400)
        merged=ev("FM.S.p.id===%r&&Object.values(FM.S.p.entities).some(e=>e.name==='Branch only page')"%main)
        ev("document.querySelector('[data-act=panel][data-p=history]').click()");pg.wait_for_timeout(200)
        vs=ev("FM.versionsOf(FM.S.p.id).map(v=>v.name)")
        ev("document.querySelector('[data-act=ver-restore]').click()");pg.wait_for_timeout(150);pg.click('#modal .mfoot .btn.danger');pg.wait_for_timeout(300)
        rest=ev("Object.values(FM.S.p.entities).some(e=>e.name==='Branch only page')")
        return (n==1 and 'After version' in cmp and br==main and 'Branch only page' in bc and 'Screens' in bc and merged and any('Before merging' in v for v in vs) and not rest),{'vs':vs,'rest':rest}
    T('Versions_branches_compare_merge_restore',tVer)
    # ---- Exports
    def tExp():
        ev("document.querySelector('[data-act=export]').click()");pg.wait_for_timeout(300)
        pv=ev("!!document.querySelector('#x2-pv img')")
        out={}
        for f in ['png','jpeg','svg','pdf']:
            ev(f"document.querySelector('#x2-f [data-v={f}]').click()")
            out[f]=dl("document.querySelector('#modal .mfoot .btn.primary').click()")
        ev("document.querySelector('[data-x2tab=handoff]').click()");z=dl("document.querySelector('#modal .mfoot .btn.primary').click()")
        ev("document.querySelector('[data-x2tab=share]').click()");h=dl("document.querySelector('#modal .mfoot .btn.primary').click()")
        ev("document.querySelector('[data-x2tab=data]').click()");y=dl("document.querySelector('[data-x2data=yaml]').click()");mm=dl("document.querySelector('[data-x2data=mermaid]').click()");js=dl("document.querySelector('[data-x2data=json]').click()")
        ev("document.querySelector('[data-act=modal-close]').click()")
        png=open(out['png'],'rb').read(8)==b'\x89PNG\r\n\x1a\n';jpg=open(out['jpeg'],'rb').read(2)==b'\xff\xd8';svg=open(out['svg']).read().startswith('<svg');pdf=open(out['pdf'],'rb').read(5)==b'%PDF-'
        zf=zipfile.ZipFile(z);names=zf.namelist();zok=zf.testzip() is None and 'README.md' in names and '05-functions.md' in names and any(n.startswith('passports/') for n in names)
        try:
            import pypdf;rd=pypdf.PdfReader(out['pdf']);pdfp=len(rd.pages)
        except Exception as e:pdfp=-1
        return (pv and png and jpg and svg and pdf and zok and '<svg' in open(h).read() and 'entities' in open(y).read() and 'mermaid' in open(mm).read() and json.load(open(js))['format']=='flowmate-project'),{'zip':len(names),'pdfpages':pdfp,'files':[os.path.basename(v) for v in out.values()]}
    T('Exports_png_jpg_svg_pdf_zip_html_yaml',tExp)
    # ---- Test I: JSON round trip keeps theme definitions, overrides, comments
    def tI():
        a=ev("JSON.parse(FM.exportJSON(FM.S.p))");p2=ev("(()=>{const q=FM.importJSON(FM.exportJSON(FM.S.p));return q})()")
        same=json.dumps(a['entities'],sort_keys=True)==json.dumps(p2['entities'],sort_keys=True) and json.dumps(a.get('look'),sort_keys=True)==json.dumps(p2.get('look'),sort_keys=True) and len(a['connections'])==len(p2['connections'])
        return same,(len(a['entities']),bool(a.get('look',{}).get('palette')))
    T('I_export_import_roundtrip_with_themes',tI)
    # ---- Comments + review request
    def tCm():
        pid=notes['D_ids']['pg'];ev(f"FM.select({{t:'entity',id:'{pid}'}})");pg.wait_for_timeout(200)
        ev("document.querySelectorAll('details.plan').forEach(d=>d.open=true)");pg.fill('#cm-new','Please check the wording');ev("document.querySelector('#cm-rev').checked=true");ev("document.querySelector('[data-act=cm-add]').click()");pg.wait_for_timeout(200)
        badge=ev(f"!!document.querySelector('.card[data-id=\"{pid}\"] .cbadge.cm')")
        ev("document.querySelector('[data-act=panel][data-p=team]').click()");pg.wait_for_timeout(200);t=ev("document.querySelector('#panel').innerText")
        ev(f"FM.select({{t:'entity',id:'{pid}'}})");pg.wait_for_timeout(200);ev("document.querySelectorAll('details.plan').forEach(d=>d.open=true)");ev("document.querySelector('[data-act=cm-resolve]').click()");pg.wait_for_timeout(200)
        res2=ev("FM.S.p.comments[0].resolved")
        return (badge and 'Review requests\n1' in t.replace(' ','\n') or ('Review requests' in t and 'Please check the wording' in t)) and res2,t[:200]
    T('Comments_reviews',tCm)
    # ---- Assets + screenshot to flow (no Claude here → manual review)
    def tAs():
        ev("document.querySelector('[data-act=panel][data-p=assets]').click()");pg.wait_for_timeout(200)
        pg.set_input_files('#as-up',['fixtures/ph1.png']);pg.wait_for_timeout(800)
        n=ev("FM.S.p.assets.length")
        pg.set_input_files('#as-shot',['fixtures/ph1.png','fixtures/ph2.png']);pg.wait_for_timeout(1200)
        modal=ev("document.querySelector('#modal .mbody')?document.querySelector('#modal .mbody').innerText:''")
        pg.fill('#ss-n0','Shot home');pg.fill('#ss-p0','Open list\nSettings');pg.click('#modal .mfoot .btn.primary');pg.wait_for_timeout(400)
        e=ev("Object.values(FM.S.p.entities).find(x=>x.name==='Shot home')")
        return (n==1 and 'Add as a page' in modal and e and e['unverified'] and len(e['elements'])==2 and ev("FM.S.p.assets.length")==3),{'n':n}
    T('Assets_and_screenshot_to_pages',tAs)
    # ---- Multi-select, align, copy/paste
    def tMulti():
        ev("FM.setView('blocks')");ev("FM.renderCanvas()");pg.wait_for_timeout(200)
        ids=ev("Object.keys(FM.S.geo).slice(0,3)")
        ev(f"FM.toggleMulti('{ids[0]}');FM.toggleMulti('{ids[1]}');FM.toggleMulti('{ids[2]}')");pg.wait_for_timeout(150)
        bar=ev("!!document.querySelector('#mbar')")
        ev("document.querySelector('[data-act=al-left]').click()");pg.wait_for_timeout(150)
        xs=ev(f"[{','.join(repr(i) for i in ids)}].map(i=>FM.S.p.entities[i].x)")
        n0=ev("Object.keys(FM.S.p.entities).length");ev("FM.copyCards([...FM.S.multi])");ev("FM.pasteCards()");pg.wait_for_timeout(300)
        n1=ev("Object.keys(FM.S.p.entities).length")
        ev("FM.undo()");pg.wait_for_timeout(150);n2=ev("Object.keys(FM.S.p.entities).length")
        m=ev('FM.S.multi.size');return (bar and len(set(xs))==1 and n1==n0+m and m>=3 and n2==n0),{'xs':xs,'n':[n0,n1,n2]}
    T('Multi_select_align_copy_paste_undo',tMulti)
    def tSearch():
        ev("document.querySelector('[data-act=panel][data-p=find]').click()");pg.wait_for_timeout(200)
        pg.fill('#sr-q',"buttons that don't do anything");pg.wait_for_timeout(500)
        t=ev("document.querySelector('#panel').innerText")
        r2=ev("FM.smartSearch(FM.S.p,'which pages use the allow tenant messaging2 setting',{})")
        ev("document.querySelector('[data-act=sr-save]').click()");pg.wait_for_timeout(150);pg.click('#modal .mfoot .btn.primary');pg.wait_for_timeout(150)
        return ("Buttons that don't do anything" in t and 'What uses' in r2['intent'] and len(r2['res'])>=3 and ev("FM.S.p.savedSearches.length")==1),r2['intent']
    T('Smart_search_saved',tSearch)
    def tPres():
        ev("FM.startPresent()");pg.wait_for_timeout(300);a=ev("document.body.classList.contains('presenting')&&!!document.querySelector('#pres')")
        pg.keyboard.press('ArrowRight');pg.wait_for_timeout(200);t=ev("document.querySelector('#pres').innerText");pg.keyboard.press('Escape');pg.wait_for_timeout(200)
        return (a and '2 /' in t and not ev("document.body.classList.contains('presenting')")),t[:80]
    T('Presentation_mode',tPres)
    def tTpl():
        out={}
        for k in ['booking','shop','social']:
            out[k]=ev(f"(()=>{{const p=FM.buildTemplate('{k}','T','',['Android']);return [Object.values(p.entities).filter(e=>e.kind==='page').length,Object.keys(p.connections).length,FM.checkProject(p).filter(i=>i.sev==='problem').length]}})()")
        return all(v[0]>=7 and v[1]>=5 for v in out.values()),out
    T('Templates',tTpl)
    def tStatus():
        ev("document.querySelector('[data-act=panel][data-p=settings]').click()");pg.wait_for_timeout(200)
        pg.fill('#cst','Waiting on client');ev("document.querySelector('#cst').dispatchEvent(new Event('change',{bubbles:true}))");pg.wait_for_timeout(200)
        pid=notes['D_ids']['pg'];ev(f"FM.select({{t:'entity',id:'{pid}'}})");pg.wait_for_timeout(200)
        b2=ev("!!document.querySelector('[data-act=status][data-v=\"Waiting on client\"]')")
        ev("document.querySelector('[data-act=pref][data-k=guide][data-v=direct]').click()");pg.wait_for_timeout(100);d=ev("document.documentElement.dataset.guide")
        ev("document.querySelector('[data-act=pref][data-k=guide][data-v=guided]').click()")
        return (b2 and d=='direct'),d
    T('Custom_statuses_and_guided_mode',tStatus)
    # reload persistence of everything
    def tPersist():
        before=ev("JSON.stringify([FM.S.p.comments.length,FM.S.p.tasks.length,FM.S.p.assets.length,FM.S.p.palettes.favourites.length,FM.S.p.savedSearches.length])")
        pg.reload();pg.wait_for_timeout(1200)
        after=ev("JSON.stringify([FM.S.p.comments.length,FM.S.p.tasks.length,FM.S.p.assets.length,FM.S.p.palettes.favourites.length,FM.S.p.savedSearches.length])")
        return before==after,after
    T('Everything_persists_after_reload',tPersist)
    # mobile quick check
    def tMob():
        m=b.new_page(viewport={'width':360,'height':780},has_touch=True);m.on('pageerror',lambda e:errs.append('MOB:'+str(e)[:200]))
        m.goto(APP);m.wait_for_timeout(1200)
        for k in ['find','colours','testing','progress','team','docs','assets']:
            m.evaluate(f"FM.S.panel='{k}';document.querySelector('[data-act=panel][data-p={k}]').click()");m.wait_for_timeout(200)
        ov=m.evaluate("document.documentElement.scrollWidth-innerWidth");m.screenshot(path='out/p5_mob.png');m.close()
        return ov<=0,ov
    T('Mobile_panels_no_overflow',tMob)
    res['no_page_errors']=not errs
    b.close()
print(json.dumps(res,indent=1));print(json.dumps(notes,indent=1,default=str)[:5000]);print(errs[:8])
