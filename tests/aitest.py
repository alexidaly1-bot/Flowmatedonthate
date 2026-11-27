"""AI with the user's own Anthropic key (src/js/platform.js makeSample + src/js/39-ai-key.js).
The Anthropic API is faked with Playwright routing, so nothing is sent or billed.
Checks: no key means AI stays hidden with an 'Add your Anthropic key' button; saving a
key turns Smart Action on; requests carry the right model, key header, browser header,
fallbacks and images; streaming text reaches onText; errors map to FlowMate's messages;
a full Smart Action run applies; the key never appears in project data or exports."""
import os as _os, pathlib as _pl
_os.chdir(_os.path.dirname(_os.path.abspath(__file__)))
APP=_pl.Path('../dist/index.html').resolve().as_uri()
import json
from playwright.sync_api import sync_playwright
exec(open('satest.py').read().split('INIT=')[0])   # brings in MOCK (a Smart Action answer) and bm
KEY='sk-ant-test-0000000000000000'
CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST, OPTIONS'}

def sse(text, stop='end_turn'):
    ev=[('message_start',{"type":"message_start","message":{"id":"msg_t","type":"message","role":"assistant","model":"claude-opus-5-5","content":[],"stop_reason":None,"stop_sequence":None,"usage":{"input_tokens":10,"output_tokens":1}}}),
        ('content_block_start',{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}})]
    for i in range(0,len(text),200):
        ev.append(('content_block_delta',{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":text[i:i+200]}}))
    ev+= [('content_block_stop',{"type":"content_block_stop","index":0}),
          ('message_delta',{"type":"message_delta","delta":{"stop_reason":stop,"stop_sequence":None},"usage":{"output_tokens":5}}),
          ('message_stop',{"type":"message_stop"})]
    return ''.join(f'event: {e}\ndata: {json.dumps(d)}\n\n' for e,d in ev)

R={};errs=[];reqs=[];mode={'v':'ok'}
def handle(route):
    rq=route.request
    if rq.method=='OPTIONS':return route.fulfill(status=204,headers=CORS)
    reqs.append({'headers':rq.all_headers(),'body':json.loads(rq.post_data or '{}')})
    m=mode['v']
    if m=='401':return route.fulfill(status=401,headers={**CORS,'content-type':'application/json'},body=json.dumps({"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}))
    if m=='credit':return route.fulfill(status=400,headers={**CORS,'content-type':'application/json'},body=json.dumps({"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API."}}))
    if m=='refusal':return route.fulfill(status=200,headers={**CORS,'content-type':'text/event-stream'},body=sse('',stop='refusal'))
    if m=='notjson':return route.fulfill(status=200,headers={**CORS,'content-type':'text/event-stream'},body=sse('Sorry, here is some prose.'))
    body=json.dumps(MOCK) if m=='ok' else json.dumps({"colours":["#112233"]})
    route.fulfill(status=200,headers={**CORS,'content-type':'text/event-stream'},body=sse('```json\n'+body+'\n```'))

with sync_playwright() as pw:
    b=pw.chromium.launch();pg=b.new_page(viewport={'width':1366,'height':768})
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
    pg.route('https://api.anthropic.com/**',handle)
    pg.goto(APP);pg.wait_for_timeout(300)
    pg.evaluate("j=>{localStorage.clear();const p=JSON.parse(j);localStorage.setItem('fm.p.'+p.id,j);localStorage.setItem('fm.index',JSON.stringify([p.id]));localStorage.setItem('fm.last',p.id)}",bm)
    pg.reload();pg.wait_for_function('window.AI&&AI.ready')

    # 1. No key: AI hidden, offer to add a key.
    R['no_key_ai_hidden']=pg.evaluate('AI.sample===null&&typeof window.FMAnthropic==="function"')
    pg.click('#saBtn');pg.wait_for_timeout(200)
    R['offers_add_key']=pg.locator('#sa [data-act=ai-key], [data-act=ai-key]').count()>0
    # 2. Add a key through the screen (bad key first).
    pg.locator('[data-act=ai-key]').first.click();pg.wait_for_timeout(150)
    R['key_field_is_password']=pg.evaluate("document.querySelector('#aik-key').type==='password'")
    pg.fill('#aik-key','not-a-key');pg.locator('.mfoot .btn.primary').click();pg.wait_for_timeout(150)
    R['rejects_bad_key']=pg.evaluate("!localStorage.getItem('fm.ai')&&!document.querySelector('#modal').classList.contains('hide')")
    pg.fill('#aik-key',KEY);pg.select_option('#aik-model','claude-opus-5-5')
    pg.locator('.mfoot .btn.primary').click();pg.wait_for_timeout(1200);pg.wait_for_function('window.AI&&AI.ready')
    R['key_saved_ai_on']=pg.evaluate("AI.sample!==null&&AI.sample.model==='claude-opus-5-5'")

    # 3. Full Smart Action run through the fake API.
    pg.click('[data-act=fit]');pg.wait_for_timeout(150)
    pg.locator('.card[data-id=pg_goodtogo] .hd').click();pg.wait_for_timeout(150)
    pg.click('#saBtn');pg.wait_for_timeout(150)
    R['shows_using_key']=pg.locator('text=Using your Anthropic key').count()>0
    pg.fill('#sa-in','add a running late button');pg.click('[data-act=sa-go]')
    pg.wait_for_function("AI.state==='result'||AI.err",timeout=8000)
    rq=reqs[-1];bd=rq['body']
    R['request_model']=bd.get('model')=='claude-opus-5-5'
    # SDK 1.x sends API keys as Authorization: Bearer (see node_modules/@anthropic-ai/sdk/client.js apiKeyAuth)
    R['request_key_header']=rq['headers'].get('authorization')=='Bearer '+KEY
    R['request_browser_header']=rq['headers'].get('anthropic-dangerous-direct-browser-access')=='true'
    R['request_fallbacks']=bd.get('fallbacks')=='default' and 'server-side-fallback-2026-07-01' in rq['headers'].get('anthropic-beta','')
    R['request_streams']=bd.get('stream') is True
    R['request_has_map']='pg_goodtogo' in bd['messages'][0]['content'][-1]['text']
    R['sa_result']=pg.evaluate("AI.state==='result'&&AI.res.options.length>0")
    pg.locator('input[name=sa-opt][value="0"]').check();pg.wait_for_timeout(150)
    pg.click('[data-act=sa-apply]');pg.wait_for_timeout(300)
    R['sa_applied']=pg.evaluate("Object.values(FM.S.p.entities).some(e=>e.name==='Push back prep')")

    # 4. onText progress, images, and error mapping, straight through the adapter.
    R['ontext_streams']=pg.evaluate("""(async()=>{let n=0;await AI.sample.json('x',{onText:({text})=>{n=Math.max(n,text.length)}});return n>200})()""")
    R['image_block_sent']=pg.evaluate("""(async()=>{const c=document.createElement('canvas');c.width=c.height=8;const bl=await new Promise(r=>c.toBlob(r,'image/png'));await AI.sample.json('look',{images:[bl]});return true})()""") and reqs[-1]['body']['messages'][0]['content'][0]['type']=='image' and reqs[-1]['body']['messages'][0]['content'][0]['source']['media_type']=='image/png'
    def code(m):
        mode['v']=m;return pg.evaluate("(async()=>{try{await AI.sample.json('x');return 'none'}catch(e){return e&&e.code}})()")
    R['err_bad_key']=code('401')=='bad_key'
    R['err_no_credit']=code('credit')=='no_credit'
    R['err_refused']=code('refusal')=='refused'
    R['err_invalid_json']=code('notjson')=='invalid_json'
    mode['v']='ok'
    R['err_cancelled']=pg.evaluate("(async()=>{const c=new AbortController();const p=AI.sample.json('x',{signal:c.signal});c.abort();try{await p;return false}catch(e){return e.code==='cancelled'}})()")
    R['messages_exist']=pg.evaluate("!!(AI_ERR.bad_key&&AI_ERR.no_credit)")

    # 5. The key stays out of project data and exports.
    R['key_not_in_project']=pg.evaluate(f"!JSON.stringify(FM.S.p).includes('{KEY}')&&!Object.keys(localStorage).filter(k=>k.startsWith('fm.p.')).some(k=>localStorage.getItem(k).includes('{KEY}'))")

    # 6. Remove the key: AI off again.
    pg.evaluate("closeModal&&closeModal()");pg.evaluate("aiKeyModal()");pg.wait_for_timeout(150)
    pg.locator('.mfoot .btn.danger').click();pg.wait_for_timeout(1200);pg.wait_for_function('window.AI&&AI.ready')
    R['remove_key']=pg.evaluate("!localStorage.getItem('fm.ai')&&AI.sample===null")
    b.close()
R['no_page_errors']=not errs
print(json.dumps(R,indent=1))
if errs:print('\n'.join(errs))
