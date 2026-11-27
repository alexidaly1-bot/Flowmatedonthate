/* =========================================================
   FlowMate platform shim (free, this-device-only version)
   Inside Claude, window.claude.use(name) gives FlowMate its platform
   features. Outside Claude this file stands in, with the same API.
   Each feature returns null when it isn't available here, and the app
   already hides that feature (see HANDOFF.md section 4).

   Available here:  dictation  (the browser's own speech recognition)
                    sample     (AI, only once the user adds their own
                                Anthropic API key; see makeSample below)
   Not here (null): db, user, room, assets, downloads, tts
     - downloads and tts have built-in fallbacks in the app
       (<a download> and speechSynthesis).
     - Cloud copies and team features need a backend. Not set up yet.
   Inside Claude, or when a test supplies window.claude, this does nothing.
   ========================================================= */
(function () {
  'use strict';
  if (window.claude && typeof window.claude.use === 'function') return;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  // Same shape as Claude's dictation: onFinal/onPartial/onState, start(), stop().
  function makeDictation() {
    if (typeof SR !== 'function') return null;
    const subs = { final: [], partial: [], state: [] };
    const emit = (kind, value) => subs[kind].forEach(fn => { try { fn(value); } catch (e) {} });
    const fail = code => ({ code, message: code });
    // Web Speech error names -> the reasons FlowMate already understands.
    const reasonFor = name =>
      name === 'not-allowed' || name === 'service-not-allowed' ? 'not_granted'
      : name === 'audio-capture' || name === 'language-not-supported' ? 'unavailable'
      : name === 'no-speech' || name === 'aborted' ? null
      : 'upstream_error';
    let rec = null;

    return {
      onFinal(fn) { subs.final.push(fn); },
      onPartial(fn) { subs.partial.push(fn); },
      onState(fn) { subs.state.push(fn); },
      start() {
        return new Promise((resolve, reject) => {
          if (rec) { resolve(); return; }
          let started = false, reason = null;
          const r = new SR();
          r.lang = 'en-AU';
          r.continuous = true;
          r.interimResults = true;
          r.onstart = () => { started = true; emit('state', { state: 'listening' }); resolve(); };
          r.onresult = ev => {
            let interim = '';
            for (let i = ev.resultIndex; i < ev.results.length; i++) {
              const res = ev.results[i], text = res[0] ? res[0].transcript : '';
              if (res.isFinal) { if (text.trim()) emit('final', { text: ' ' + text.trim() }); }
              else interim += text;
            }
            emit('partial', { text: interim });
          };
          r.onerror = ev => {
            reason = reasonFor(ev && ev.error);
            if (!started) reject(fail(reason || 'stopped'));
          };
          r.onend = () => {
            if (rec === r) rec = null;
            emit('partial', { text: '' });
            emit('state', reason ? { state: 'idle', reason } : { state: 'idle' });
          };
          rec = r;
          try { r.start(); } catch (e) { rec = null; reject(fail('unavailable')); }
        });
      },
      stop() {
        if (rec) { try { rec.stop(); } catch (e) {} }
        return Promise.resolve();
      },
    };
  }

  // ---------- AI (sample) with the user's own Anthropic API key ----------
  // The key is typed in by the user (Smart Action > Add your Anthropic key) and
  // kept only in this device's localStorage under fm.ai. It is never part of a
  // project, an export or the app's code. Without a key, sample is null and the
  // app hides AI, as before.
  const AI_STORE = 'fm.ai';
  const AI_MODELS = {
    'claude-opus-5-5': { fallbacks: 'default' },
    'claude-sonnet-5-5': { fallbacks: 'default' },
    'claude-haiku-5-5': {},              // no server-side fallback on Haiku
  };
  const AI_DEFAULT = 'claude-opus-5-5';
  const MAX_IMAGES = 6;

  function readAiSettings() {
    try {
      const r = JSON.parse(localStorage.getItem(AI_STORE) || 'null');
      if (r && r.v === 1 && typeof r.key === 'string' && /^sk-ant-\S{10,}$/.test(r.key)) {
        return { key: r.key, model: AI_MODELS[r.model] ? r.model : AI_DEFAULT };
      }
    } catch (e) {}
    return null;
  }

  async function imageBlock(blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    const type = /^image\/(jpeg|png|gif|webp)$/.test(blob.type) ? blob.type : 'image/jpeg';
    return { type: 'image', source: { type: 'base64', media_type: type, data: btoa(bin) } };
  }

  // Map SDK errors to the codes FlowMate already shows messages for (AI_ERR).
  function aiError(e, A) {
    if (e && typeof e.code === 'string' && !(e instanceof A.APIError)) return e;
    const f = code => ({ code, message: code });
    if (e instanceof A.APIUserAbortError || (e && e.name === 'AbortError')) return f('cancelled');
    if (e instanceof A.AuthenticationError || e instanceof A.PermissionDeniedError) return f('bad_key');
    if (e instanceof A.RateLimitError) return f('rate_limited');
    if (e instanceof A.BadRequestError) {
      // No typed class for these two, so read the API's own error text.
      const msg = String((e.error && e.error.error && e.error.error.message) || e.message || '');
      if (/credit balance/i.test(msg)) return f('no_credit');
      if (/prompt is too long|too many tokens|context window/i.test(msg)) return f('prompt_too_large');
      return f('upstream_error');
    }
    return f('upstream_error');  // APIConnectionError, 5xx, overloaded, anything else
  }

  function makeSample() {
    const cfg = readAiSettings();
    const A = window.FMAnthropic;
    if (!cfg || typeof A !== 'function') return null;
    const client = new A({ apiKey: cfg.key, dangerouslyAllowBrowser: true, maxRetries: 2 });

    async function sample(input, opts) {
      opts = opts || {};
      const content = [];
      for (const b of (opts.images || []).slice(0, MAX_IMAGES)) content.push(await imageBlock(b));
      content.push({ type: 'text', text: String(input) });
      const params = {
        model: cfg.model,
        max_tokens: 64000,
        output_config: { effort: 'medium' },
        messages: [{ role: 'user', content }],
      };
      const fb = AI_MODELS[cfg.model].fallbacks;
      if (fb) { params.betas = ['server-side-fallback-2026-07-01']; params.fallbacks = fb; }
      try {
        const stream = client.beta.messages.stream(params, { signal: opts.signal });
        if (typeof opts.onText === 'function') {
          stream.on('text', (delta, snapshot) => { try { opts.onText({ text: snapshot }); } catch (e) {} });
        }
        const msg = await stream.finalMessage();
        if (msg.stop_reason === 'refusal') throw { code: 'refused', message: 'refused' };
        const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
        if (!text.trim()) throw { code: 'empty_completion', message: 'empty_completion' };
        return { text };
      } catch (e) {
        throw aiError(e, A);
      }
    }
    sample.json = async (prompt, opts) => {
      const { text } = await sample(prompt, opts);
      const t = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
      const a = t.search(/[[{]/), z = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
      try { return JSON.parse(a >= 0 && z > a ? t.slice(a, z + 1) : t); }
      catch (e) { throw { code: 'invalid_json', message: 'invalid_json' }; }
    };
    sample.limits = async () => ({ images: MAX_IMAGES });
    sample.model = cfg.model;
    return sample;
  }

  const makers = { dictation: makeDictation, sample: makeSample };
  const made = {};
  window.claude = Object.freeze({
    isShim: true,
    async use(name) {
      if (!(name in made)) made[name] = makers[name] ? makers[name]() : null;
      return made[name];
    },
  });
})();
