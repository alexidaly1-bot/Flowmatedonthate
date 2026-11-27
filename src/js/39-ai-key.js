// =========================================================
// AI KEY — use Smart Action outside Claude with your own Anthropic API key
// Only when FlowMate runs outside Claude (window.claude.isShim). The key stays
// in this device's storage (fm.ai), never in a project, export or the code.
// =========================================================
Object.assign(AI_ERR,{
  bad_key:'Your Anthropic key didn\'t work. Check it in Smart Action > AI key.',
  no_credit:'Your Anthropic account is out of credit. Top it up at console.anthropic.com, then try again.',
});
const AIKEY={store:'fm.ai',models:[
  ['claude-opus-5-5','Claude Opus 5.5','Best answers. About 20 to 30 cents a big request.'],
  ['claude-sonnet-5-5','Claude Sonnet 5.5','Good and cheaper. About 10 to 15 cents a big request.'],
  ['claude-haiku-5-5','Claude Haiku 5.5','Fastest and cheapest. About 1 cent a big request.'],
]};
function aiKeyOutsideClaude(){return !!(window.claude&&window.claude.isShim)}
function aiKeyRead(){try{const r=JSON.parse(localStorage.getItem(AIKEY.store)||'null');return r&&r.v===1?r:null}catch(e){return null}}
function aiKeyModal(){
  const cur=aiKeyRead();const model=(cur&&cur.model)||AIKEY.models[0][0];
  openModal({title:'AI key',sub:'Use Smart Action with your own Anthropic account.',ic:'lock',
    body:`<div class="field"><label for="aik-key">Anthropic API key</label><input id="aik-key" class="inp" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${cur?'Saved. Paste a new key to replace it.':'sk-ant-…'}"><p class="help">Make one at console.anthropic.com. It is saved only on this device. It is never put in your projects or exports.</p></div>
      <div class="field"><label for="aik-model">Model</label><select id="aik-model" class="inp">${AIKEY.models.map(([id,n])=>`<option value="${id}" ${id===model?'selected':''}>${esc(n)}</option>`).join('')}</select><p class="help" id="aik-cost">${esc((AIKEY.models.find(m=>m[0]===model)||AIKEY.models[0])[2])} Rough guide in AUD. Set a monthly spending limit in your Anthropic account.</p></div>`,
    onOpen:m=>{const s=m.querySelector('#aik-model');s.addEventListener('change',()=>{const x=AIKEY.models.find(r=>r[0]===s.value);m.querySelector('#aik-cost').textContent=x[2]+' Rough guide in AUD. Set a monthly spending limit in your Anthropic account.'})},
    actions:[
      ...(cur?[{label:'Remove key',danger:true,run:()=>{try{localStorage.removeItem(AIKEY.store)}catch(e){}closeModal();toast('Key removed. Restarting…');setTimeout(()=>location.reload(),600)}}]:[]),
      {label:'Cancel',run:closeModal},
      {label:'Save',primary:true,icon:'check',run:()=>{
        const k=$('#aik-key').value.trim(),mdl=$('#aik-model').value;const key=k||(cur&&cur.key)||'';
        if(!/^sk-ant-\S{10,}$/.test(key)){toast('That doesn\'t look like an Anthropic key. It starts with sk-ant-');return}
        try{localStorage.setItem(AIKEY.store,JSON.stringify({v:1,key,model:mdl}))}catch(e){toast('Couldn\'t save the key on this device.');return}
        closeModal();toast('Saved. Restarting so Smart Action can use it…');setTimeout(()=>location.reload(),600)}},
    ]});
}
Object.assign(ACT,{'ai-key':()=>aiKeyModal()});
