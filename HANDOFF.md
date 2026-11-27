# FlowMate: handoff to Claude Code

Written 25 Nov 2026 (Sydney) by Claude in the Claude app, for Claude Code.

## 1. The goal

Ship **FlowMate** as two things, with every current feature kept:

1. **A website app.** It opens in any browser and can be installed from the browser (a PWA). It works offline.
2. **An Android app on Google Play.** Built from the same code. It must work well on a **Galaxy Z Fold6**, both folded and unfolded.

Then add the finishing touches in section 8.

**Owner:** Alex, a sole trader in Concord, Sydney. Read `CLAUDE.md` first. It covers how to talk to Alex and what needs Alex's OK.

## 2. What FlowMate is

FlowMate is a visual planner for app architecture. You map an app's pages, buttons, functions, decisions, settings and data as cards on a canvas, then link them. It has two views:

- **Blocks:** a network of cards.
- **Screens:** real phone or tablet screens drawn in the project's colours.

**Play** runs the app as a clickable prototype. **Smart Action** (AI) suggests changes from text, images, or both.

The full list of features is in section 6.

## 3. What you're getting

```
app/index.html     The whole app: one 578 KB file of vanilla JS, HTML and CSS. No build step.
                   THIS IS THE SOURCE OF TRUTH. It matches the live version 1795559293-d495.
tests/             Python Playwright test suites, plus fixtures. All of them pass on app/index.html.
tests/out/         perf_before_v5.json and perf_after_v6.json (measured performance), plus logs.
reference/         The modules that were patched into index.html, in order (fmtheme, fm5, fm6).
                   This is history to help you understand the code. Don't rebuild from these.
```

The app currently runs as a **Claude artifact** at https://claude.ai/artifact/BUTN2VK7uvfcnSeFTkGG2w. It already runs outside Claude, for example opened as a local file. When it does, the platform features in section 4 are simply hidden.

## 4. Platform features you need to replace

Inside Claude, the app calls `await window.claude.use(name)` for eight features. Each call returns either an object or `null`. When the result is `null`, the app hides that feature. Every call site already handles `null`.

**Recommended approach: build a shim.** Make `platform.js`, loaded before the app. When `window.claude` is missing, it defines `window.claude = { use: async name => adapters[name] || null }`, with the same API shapes as below. That way the app code barely changes.

| Name | What FlowMate uses it for | API shape used | Suggested replacement |
|---|---|---|---|
| `sample` | Smart Action, AI Assistant, screenshot import, image reading | `sample(input, opts)` returns `{text}`. `sample.json(prompt, opts)` returns a parsed value. `sample.limits()` returns `{images}`. `opts` can contain `signal`, `onText({text})`, `images: Blob[]`, `modelTier`, `cache`. Errors look like `{code, message}` | A small **server proxy** to the Anthropic Messages API. The key lives only on the server. Add per-user rate limits and streaming. **Never put an API key in the client.** |
| `db` | Cloud copy of projects and versions, and shared team docs | Firestore-like: `db.collection(path).doc(id).set/get/delete/onSnapshot` and `collection(path).get()`. Paths are `data/users/<uid>` (docs `proj-<id>`, `ver-<id>`) and `shared` (docs `p-<id>`) | Firebase Firestore (same shape), Supabase or Appwrite. Local-first must stay: projects always save to the device first. |
| `user` | The signed-in person (name, id) for team features and comments | `{id, name, ...}` | Auth from the same backend. |
| `room` | Live presence (who else is viewing) | `room.presence(...)`, `room.onPeers(...)` | A realtime channel from the backend, or leave it out of v1. It's optional. |
| `assets` | Image library | upload, list, url | A storage bucket. A local thumbnail fallback already exists. |
| `downloads` | Export files (PDF, ZIP, SVG, PNG, JSON, MD, CSV and others) | download(name, blob) | Web: `<a download>`. Android: Capacitor Filesystem plus Share. |
| `dictation` | Voice input in Smart Action | start, stop, events | Web Speech API (Chrome and Android support it), or a native speech plugin. Hide it when unsupported. |
| `tts` | Walkthrough narration | speak | A `speechSynthesis` fallback already exists. |

**Ask Alex before going further:** which backend to use, creating any accounts, and any spending. The AI API costs money per request. Present the options with rough monthly costs in AUD and wait for his OK.

## 5. How the code works

Read this before you edit anything.

**Script setup**
- It is one classic script in `'use strict'`. There is also a small head script (FMT) that applies the theme before first paint.

**State and edits**
- **State** lives in `S`:
  - `S.p` is the open project, `S.sel` the selection, `S.view` the view `{x, y, z}`, and `S.prefs` the preferences.
  - `S.undo` and `S.redo` hold JSON snapshots.
- **Every edit** goes through `commit(label, p => {...})`. It snapshots for undo, logs to the Activity log, saves, and calls `renderAll()`.

**Buttons, hooks and the FM object**
- **Buttons** use `data-act="name"`. One click listener calls `ACT[name](el.dataset, el)`.
- **Hooks:** later modules extend features by reassigning global function declarations. For example, `renderCanvas = function(){...}` and `pushUndo = (f => function(){...})(pushUndo)`.
  - **Load order matters.** Splitting the file without keeping this order will break features.
  - Watch for references captured by value, like `ACT = {undo, redo}`. Those need re-pointing; see the end of `log.js`.
- **`window.FM`** exposes many internals. The tests depend on it, so keep it, or keep a test-only equivalent.

**Canvas (fm6 engine)**
- **Layers** are, from back to front: `#world` holds `#frames` (groups), then `svg#edges`, then `#elabels`, then `#cards`.
- **Cards are keyed.** Only changed cards are rebuilt (`CE.nodes`).
- **Port positions are cached** (`CE.g`).
- **Culling:** with more than 90 cards, only cards near the viewport are mounted.
- **GPU layer:** `will-change: transform` is set only while moving, through the class `#world.moving`. This fixes cards being cut off on the Fold.
- `applyView()` must stay cheap. Don't set inherited CSS variables on `#viewport`.

**Layout**
- `flowLayout(p, 'blocks' | 'screens')`:
  - Columns are journey steps inside each group.
  - Groups are packed in rows.
  - Rows are ordered by the barycentre method to reduce crossing lines.
  - Run it through Tidy up, which is undoable. **Never move cards without asking.**
- If a card sits inside another group's area, a "Groups overlap" chip offers Tidy up.

**Storage (localStorage)**

| Key | Holds |
|---|---|
| `fm.p.<id>` | Each project |
| `fm.index` | The list of projects |
| `fm.last` | The last project opened |
| `fm.prefs` | Preferences |
| `fm.view.<id>` | The saved view for each project |
| `fm.v.<id>` | Versions |

- Move these to IndexedDB if size becomes a problem. Keep the import of old keys.

**Data model**
- A project holds:
  - basics: `schema, format, id, name, description, platforms, createdAt, updatedAt, rev, startPageId`
  - the map: `roles[], modules{}, entities{}, connections{}`
  - the log: `activity[], objectives[], objActive`
- **Entity kinds:** `page, function, decision, setting, data, component`.
- Pages have `elements[{id, label, type, box?}]`.
- `layout: 'free'` means the parts are positioned by `box`: fractions of device width.
- **Connections:** `{id, from:{entity, element}, to, type, label, condition}`.
- `normalizeProject()` upgrades old data. Add migrations there.

**Themes**
- There are 5 themes, each with light and dark modes.
- Theme tokens come from `FMT` (the head script) and are written to `style#fm-tv`.
- Link types each have a colour, a **dash pattern and a glyph**, because Alex is colourblind. Never rely on colour alone.

## 6. Features to keep (all working now)

**Canvas and layout**
- Blocks and Screens views; detail levels by zoom; minimap; search.
- Multi-select, align, copy and paste; snap; collapse branches.
- Tidy up (flow layout); overlap warning.

**Screens and Play**
- Screens drawn in the project's colours; "Not designed yet" and "Needs a name" markers.
- **Edit screen layout:** drag, resize, rename, and set what a part does. Links stay attached.
- **Play** follows the configured navigation.
- Parts bar: dock top, bottom, left or right; fold away; scroll or swipe.

**AI (Smart Action)**
- Works from text, labelled images, or both; image-only requests are allowed.
- Images are shrunk to 1280 px JPEG before sending.
- Identical requests are reused; double requests are blocked.

**Project tools**
- **Activity & reasons** log with optional objectives. Logging happens even when the panel is hidden. Reasons are only what was stated, never invented.
- Checks and health; testing (rule scenarios); progress and tasks; living docs; passport.
- Walkthrough with voice; presentation mode.
- Colours: palette from image, contrast and colourblind checks, tokens.
- Assets; History and versions, branches and merge.
- Exports: SVG, PNG, PDF, ZIP, YAML, JSON, Mermaid, CSV, handoff files, view-only HTML.

**Team and setup**
- Team: share, comments, mentions, reviews, presence.
- Templates (booking, shop, social); guided mode; custom statuses.
- 5 themes in light and dark, plus increased contrast.

## 7. Suggested plan (pause for Alex's OK at each ✋)

1. **Repo.**
   - ✋ Ask Alex for OK to create a GitHub repo called `flowmate`.
   - Commit `app/index.html` unchanged, plus `tests/`.
   - Set up CI (GitHub Actions) to run the test suites on every push.
2. **Build without changing behaviour.**
   - Add Vite, or a simple concatenation build, that outputs the same single page.
   - Optionally split into files in the same load order.
   - All tests must still pass.
3. **Platform shim** (section 4), with local-first storage.
   - ✋ Choose the backend and AI proxy with Alex.
   - Deploy the AI proxy, for example as a serverless function.
4. **PWA.**
   - Add `manifest.webmanifest` with maskable icons.
   - Add a service worker for an offline app shell, with an "Update available" prompt.
   - Show an install prompt.
   - Handle opening and saving `.flowmate.json` files.
   - ✋ Get Alex's OK before hosting publicly (GitHub Pages, Netlify or similar).
5. **Android.**
   - Use Capacitor; it's better than a TWA here because of files, share and speech.
   - Build the AAB in GitHub Actions. Keep the signing key as a CI secret and never commit it.
   - **Back button:** close the dialog, layout editor, Play or panel before leaving the app.
   - Edge-to-edge display with safe-area insets.
   - Match the status bar to the theme.
   - **Fold6:** keep state across fold and unfold (continuity). Test at the folded width of about 372 px and the unfolded width of about 690 to 760 px.
   - Send test APKs to Alex.
6. **Finishing touches** (section 8).
7. **Store launch.**
   - ✋ Alex does all payments, ID checks and publishing himself.
   - Draft the listing, screenshots, privacy policy and data safety answers for him to review.

## 8. Finishing touches backlog (most important first)

1. **Test on real devices.**
   - Fold6 folded and unfolded: the cut-off fix and the GPU layer only while moving.
   - A low-power Chromebook: smooth pan and zoom with 300+ cards.
2. **First run.**
   - A short welcome.
   - A choice between a template, a blank project or the demo.
   - Clear empty states.
3. **Offline and sync.**
   - An offline badge.
   - Sync status.
   - A conflict prompt when the cloud copy is newer (use `rev` and `updatedAt`). Never overwrite silently.
4. **Accessibility pass** (WCAG 2.2 AA).
   - Focus order, screen reader labels on canvas cards and the layout editor, and reduced motion.
   - Tap targets of 44 px or more.
   - Keep the shape and glyph cues for colourblind users.
5. **Security.**
   - A Content Security Policy.
   - Keep escaping all user and AI text with `esc()`.
   - Rate-limit the AI proxy.
   - No secrets in the client or the repo.
6. **Performance gate.**
   - Run `tests/perf.py` in CI and fail on regressions. Current numbers are below.
7. **Privacy-safe crash reporting.**
   - Opt-in only, and no project content.
8. **Small gaps.**
   - Components used on a page aren't drawn inside its screen.
   - Tab and menu-item styling in free layout is approximate.
   - Projects have no font setting. **Ask Alex** before adding one.
9. **Limits to keep in mind.**
   - The activity log keeps 400 entries per project.
   - Undo keeps about 12 MB of snapshots.
   - Smart Action takes up to 6 images.
10. **Minify in the build step only.**
    - The source stays readable. A trial saved about 9%.
11. **Monetisation is not decided.**
    - Ask Alex. If he wants paid tiers, follow honest-pricing rules: real prices shown up front, an easy cancel, and a useful free tier.

## 9. Tests

```
pip install playwright && python -m playwright install chromium
cd tests
python3 test.py        # core: canvas, editing, links, undo, export, reload
python3 satest.py      # Smart Action (AI mocked)
python3 saimg.py       # Smart Action images: labels, preview, image-only, reuse, disable
python3 lptest.py      # Live Preview / Screens / Play
python3 p5test.py      # fm5 features (24 checks)
python3 themetest.py   # 5 themes x light/dark, contrast 4.5:1, link symbols, colourblind
python3 logtest.py     # Activity & reasons, objectives, undo keeps log
python3 laytest.py     # screen layout editor (desktop + phone)
python3 tray6.py       # parts bar at phone / Fold / Chromebook / desktop sizes
python3 perf.py        # performance on a 334-card map -> out/perf.json
```

A check returning `false` means it failed. `"rest": false` and `"scrolls": false` are notes, not failures. The AI is mocked through an init script that fakes `window.claude`.

**Performance (334 cards, headless Chrome), before → now:**
- Drawing the map: Blocks 91 → 16 ms; Screens 48 → 12 ms.
- Pan: 32 ms → under 0.1 ms per move.
- Slowest pan frames (95th percentile): 33 → 17 ms.
- Selecting a card: 117 → 36 ms.
- Making a change: 151 → 60 ms.
- Zooming through all detail levels: 478 → 138 ms.

## 10. Done means

- Every test suite passes in CI.
- The website installs and works offline.
- The Android app is signed and tested on Alex's Fold6.
- Smart Action works through the proxy.
- Projects from the Claude version import with nothing lost. Test with `tests/fixtures/bm_final.json`.
- Alex has approved the listing.
