# FlowMate

Visual planner for app architecture. See `HANDOFF.md` for the full brief and `CLAUDE.md` for working rules.

- `app/index.html` — the whole app (source of truth). Open it in a browser.
- `tests/` — Playwright test suites. Run all: `python3 tests/run_all.py`
- `reference/` — history of patched modules. Don't rebuild from these.

## Run the tests

```
pip install playwright==1.63.0 && python -m playwright install chromium
python3 tests/run_all.py
```
