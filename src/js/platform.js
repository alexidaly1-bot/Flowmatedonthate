/* =========================================================
   FlowMate platform shim (free, this-device-only version)
   Inside Claude, window.claude.use(name) gives FlowMate its platform
   features. Outside Claude this file stands in, with the same API.
   Each feature returns null when it isn't available here, and the app
   already hides that feature (see HANDOFF.md section 4).

   Available here:  dictation  (the browser's own speech recognition)
   Not here (null): sample (AI), db, user, room, assets, downloads, tts
     - downloads and tts have built-in fallbacks in the app
       (<a download> and speechSynthesis).
     - AI, cloud copies and team features need a backend. Not set up yet.
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

  const makers = { dictation: makeDictation };
  const made = {};
  window.claude = Object.freeze({
    isShim: true,
    async use(name) {
      if (!(name in made)) made[name] = makers[name] ? makers[name]() : null;
      return made[name];
    },
  });
})();
