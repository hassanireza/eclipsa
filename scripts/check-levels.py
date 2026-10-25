"""Runs every answer key through the real Django workshop (src/runtime/workshop.py) and checks the level contract.

    npx tsx scripts/dump-levels.ts levels > /tmp/levels.json && python scripts/check-levels.py /tmp/levels.json
    npx tsx scripts/dump-levels.ts samples 12 > /tmp/samples.json && python scripts/check-levels.py /tmp/samples.json

Needs Django 5.2 (pip install django==5.2.*). Exits non-zero on the first kind of failure found.
"""
import contextlib
import io
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src", "runtime"))
import workshop  # noqa: E402


def run(code, setup="", test=""):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        err = workshop.run(code, setup or "", test or "")
    return buf.getvalue().rstrip(), err


def main(path):
    items = json.load(open(path))
    bad, seen = [], {}
    for i, q in enumerate(items):
        tag = q.get("id") or f"t{q['tier']}f{q['family']}s{q['seed']}"
        out, err = run(q["target"], q.get("setup"), q.get("test"))
        again, _ = run(q["target"], q.get("setup"), q.get("test"))
        problems = []
        if err: problems.append("ERROR " + err.splitlines()[-1])
        elif not out: problems.append("empty output")
        if out != again: problems.append("not deterministic")
        if len(q["target"].split("\n")) > 20: problems.append("target over 20 lines")
        if not err and out:
            s_out, s_err = run(q.get("starter") or "", q.get("setup"), q.get("test"))
            if s_out == out and not s_err: problems.append("starter already passes")
        if q["prompt"] in seen and "id" in q: problems.append(f"duplicate prompt of {seen[q['prompt']]}")
        seen[q["prompt"]] = tag
        if problems:
            bad.append((tag, problems, q["prompt"][:110]))
    for tag, p, prompt in bad[:60]:
        print(tag, "|", "; ".join(p), "|", prompt)
    print(f"{len(items)} checked, {len(bad)} problems")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
