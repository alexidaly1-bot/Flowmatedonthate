"""Run every FlowMate test suite and fail if any check is false.

Usage:  python3 tests/run_all.py [suite ...]
Builds dist/index.html from src/ first.
A check printed as `"name": false` is a failure, except the notes listed in
NOTES (HANDOFF.md section 9 says these are information, not failures).
"""
import os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
SUITES = ['test', 'satest', 'saimg', 'lptest', 'p5test', 'themetest',
          'logtest', 'laytest', 'tray6', 'bug2', 'platformtest']
NOTES = {'rest', 'scrolls'}
FALSE = re.compile(r'"([^"]+)"\s*:\s*false')

def run(name):
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    t = time.time()
    p = subprocess.run([sys.executable, name + '.py'], cwd=HERE,
                       capture_output=True, text=True, timeout=600)
    out = p.stdout + p.stderr
    with open(os.path.join(HERE, 'out', name + '.log'), 'w') as f:
        f.write(out)
    bad = [k for k in FALSE.findall(out) if k not in NOTES]
    if p.returncode != 0 or 'Traceback' in out:
        bad.append('exit code %d' % p.returncode)
    print('%-10s %-4s %5.1fs %s' % (name, 'FAIL' if bad else 'ok',
                                    time.time() - t, ', '.join(bad)))
    return not bad

def build():
    # Always test a fresh build of src/, never a stale dist/index.html.
    subprocess.run(['node', os.path.join(HERE, '..', 'tools', 'build.mjs')], check=True)

if __name__ == '__main__':
    build()
    names = sys.argv[1:] or SUITES
    results = [run(n) for n in names]
    print('\n%d/%d suites passed' % (sum(results), len(results)))
    sys.exit(0 if all(results) else 1)
