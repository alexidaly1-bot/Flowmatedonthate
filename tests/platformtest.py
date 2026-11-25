"""Platform shim (src/js/platform.js): FlowMate outside Claude, free version.
Checks the shim only steps in when window.claude is missing, that paid or
online features report null (so the app hides them), that projects stay on
this device, and that voice input works through a fake SpeechRecognition."""
import os as _os, pathlib as _pl
_os.chdir(_os.path.dirname(_os.path.abspath(__file__)))
APP=_pl.Path('../dist/index.html').resolve().as_uri()
import json
from playwright.sync_api import sync_playwright

# A stand-in for the browser's speech recognition, driven from the test.
FAKE_SR = """
class FakeSR{constructor(){window.__sr=this;this.started=false}
  start(){this.started=true;setTimeout(()=>this.onstart&&this.onstart(),0)}
  stop(){setTimeout(()=>this.onend&&this.onend(),0)}
  say(text,isFinal){const r=[{transcript:text}];r.isFinal=isFinal;this.onresult({resultIndex:0,results:[r]})}
  fail(name){this.onerror&&this.onerror({error:name});setTimeout(()=>this.onend&&this.onend(),0)}}
window.webkitSpeechRecognition=FakeSR;window.SpeechRecognition=FakeSR;
"""
NO_SR = "delete window.webkitSpeechRecognition;delete window.SpeechRecognition;"
MOCK_CLAUDE = "window.claude={use:async n=>null};"

R={};errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch()
    def page(init):
        pg=b.new_page(viewport={'width':1280,'height':860})
        pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        if init:pg.add_init_script(init)
        pg.goto(APP);pg.wait_for_function('window.AI&&AI.ready');pg.wait_for_timeout(200)
        return pg

    pg=page(FAKE_SR)
    R['shim_installed']=pg.evaluate('window.claude.isShim===true')
    R['paid_and_online_are_null']=pg.evaluate("""(async()=>{for(const n of ['sample','db','user','room','assets','downloads','tts','nope'])if(await window.claude.use(n)!==null)return n;return true})()""")
    R['same_instance_each_call']=pg.evaluate("(async()=>await window.claude.use('dictation')===await window.claude.use('dictation'))()")
    R['saves_on_device']=pg.evaluate("Cloud.state==='device'&&!Cloud.db")
    R['ai_hidden']=pg.evaluate("AI.sample===null")
    R['dictation_ready']=pg.evaluate("!!AI.dict")
    # Talk: start, partial words, then a final phrase lands in the text box state.
    pg.evaluate("AI.text='';AI.dict.start()");pg.wait_for_timeout(50)
    R['listening']=pg.evaluate("AI.listening===true")
    pg.evaluate("__sr.say('add a',false)")
    R['partial_text']=pg.evaluate("AI.partial==='add a'")
    pg.evaluate("__sr.say('add a back button',true)")
    R['final_text']=pg.evaluate("AI.text==='add a back button'")
    pg.evaluate("__sr.say('on the ready page',true)")
    R['final_appends']=pg.evaluate("AI.text==='add a back button on the ready page'")
    pg.evaluate("AI.dict.stop()");pg.wait_for_timeout(50)
    R['stopped']=pg.evaluate("AI.listening===false&&AI.partial===''")
    # Microphone blocked: the app drops the mic button, as it does inside Claude.
    pg.evaluate("AI.dict.start()");pg.wait_for_timeout(50);pg.evaluate("__sr.fail('not-allowed')");pg.wait_for_timeout(50)
    R['blocked_mic_hidden']=pg.evaluate("AI.dict===null")
    # Walkthrough shows the mic when dictation exists.
    pg2=page(FAKE_SR)
    pg2.evaluate("walkthroughModal()");pg2.wait_for_timeout(100)
    R['walkthrough_has_mic']=pg2.evaluate("!!document.querySelector('#modal #sa-mic')")
    pg2.close()

    pg=page(NO_SR)
    R['no_speech_api_no_mic']=pg.evaluate("window.claude.isShim===true&&AI.dict===null")

    pg=page(MOCK_CLAUDE)
    R['real_claude_untouched']=pg.evaluate("window.claude.isShim===undefined")
    b.close()
R['no_page_errors']=not errs
print(json.dumps(R,indent=1))
if errs:print('\n'.join(errs))
