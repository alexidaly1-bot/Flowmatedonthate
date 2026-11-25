# CLAUDE.md: FlowMate

Read `HANDOFF.md` for the full brief. This file covers how to work.

## Talking to Alex

- Alex has **dyslexia**, limited attention and is **colourblind**. He reads on a phone.
- Put the main answer in the first 1–3 lines. Use short headings and bullets, and bold only the key words. Keep it to about one phone screen.
- Alex uses **speech-to-text**, so expect wrong words. Work out what he meant and say what you guessed.
- Ask at most **one short question**, and only when you truly can't guess.
- Use Australian spelling, AUD and Sydney time.
- Finish each task with what came out, the link or file, and one next step.
- Documents for Alex to read: Montserrat font, bold used sparingly, wide line spacing.

## Never without Alex's OK

- Never create accounts, pay, spend money, publish (web or Play Store), post or message anyone.
- Alex does all ID checks and payments himself. Never enter cards, IDs or passwords.
- Never commit secrets: API keys, the signing keystore, `.env` files.
- Sanitise any link before opening it.

## Working rules

- `app/index.html` is the source of truth until the build is set up.
- Keep every existing feature. Don't redesign anything nobody asked for.
- Run the test suites before and after every change batch. See section 9 of HANDOFF.md.
- Every edit inside the app goes through `commit()`, so undo and the Activity log keep working.
- Colour must never be the only cue. Link types have dash patterns and glyphs, so keep them.
- Escape all user and AI text with `esc()` before it goes into HTML.
- Alex's devices are a **Chromebook** and a **Galaxy Z Fold6**. Test at about 372 px (folded), about 700 px (unfolded) and 1366×768.
