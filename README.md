# FlowMate

Visual planner for app architecture. See `HANDOFF.md` for the full brief and `CLAUDE.md` for working rules.

- `src/` — the app source, split into parts. `src/shell.html` sets the load order.
- `src/js/platform.js` — stands in for Claude's platform features outside Claude (free version: no AI, no cloud).
- `npm run build` — joins `src/` into `dist/index.html`. Open that in a browser.
- `tests/` — Playwright test suites. Run all: `python3 tests/run_all.py`
- `reference/` — history of patched modules. Don't rebuild from these.

## Run the tests

```
pip install playwright==1.63.0 && python -m playwright install chromium
python3 tests/run_all.py   # builds first, then runs all suites
```
