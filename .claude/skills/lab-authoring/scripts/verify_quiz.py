#!/usr/bin/env python3
"""Run every `code-output` quiz question of a chapter and compare with its answer.

Usage: python3 verify_quiz.py <chapter_dir> [--image golang:1]

The language is read from the course.yaml next to the chapter folder (default: go).
Go: each snippet is wrapped in `func main()` with the imports it uses. Groovy: each
snippet is a script run with `groovy` (image btd-runner-groovy). Executed in a
throwaway Docker container (no network); stdout is compared to `answer`
(trailing whitespace ignored). Exit code 1 if any answer is wrong.
"""
import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml

KNOWN_IMPORTS = {
    "fmt.": "fmt",
    "slices.": "slices",
    "maps.": "maps",
    "strings.": "strings",
    "strconv.": "strconv",
    "utf8.": "unicode/utf8",
    "unicode.": "unicode",
    "errors.": "errors",
    "sort.": "sort",
    "math.": "math",
    "sync.": "sync",
    "atomic.": "sync/atomic",
    "time.": "time",
    "context.": "context",
}


def wrap(code: str) -> str:
    imports = sorted({pkg for prefix, pkg in KNOWN_IMPORTS.items() if re.search(r"\b" + re.escape(prefix), code)})
    body = "\n".join("\t" + line for line in code.rstrip().splitlines())
    imp = "\n".join(f'\t"{p}"' for p in imports)
    return f"package main\n\nimport (\n{imp}\n)\n\nfunc main() {{\n{body}\n}}\n"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("chapter", type=Path)
    ap.add_argument("--image")
    args = ap.parse_args()
    course = args.chapter.resolve().parent / "course.yaml"
    language = (yaml.safe_load(course.read_text()).get("language") if course.exists() else None) or "go"
    if language == "groovy":
        args.image = args.image or "btd-runner-groovy"
    else:
        args.image = args.image or "golang:1"

    questions = []
    for quiz in sorted(args.chapter.glob("*/quiz.yaml")):
        for q in yaml.safe_load(quiz.read_text())["questions"]:
            if q.get("type") == "code-output":
                questions.append((quiz.parent.name, q))

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        for i, (_, q) in enumerate(questions):
            d = root / f"q{i}"
            d.mkdir()
            if language == "groovy":
                (d / "main.groovy").write_text(q["code"].rstrip() + "\n")
            else:
                (d / "go.mod").write_text("module q\n\ngo 1.23\n")
                (d / "main.go").write_text(wrap(q["code"]))
        run = "groovy main.groovy 2>&1" if language == "groovy" else "go run . 2>&1"
        script = f"for d in /work/q*; do printf \"\\n=== %s\\n\" $(basename $d); (cd $d && {run}); done"
        out = subprocess.run(
            ["docker", "run", "--rm", "--network", "none", "-e", "GOTOOLCHAIN=local", "-e", "HOME=/tmp",
             "-v", f"{root}:/work", args.image, "sh", "-c", script],
            capture_output=True, text=True,
        ).stdout

    results = dict(re.findall(r"=== (q\d+)\n(.*?)(?=\n=== q\d+\n|\Z)", out, re.S))
    failures = 0
    for i, (lesson, q) in enumerate(questions):
        got = results.get(f"q{i}", "").rstrip()
        want = str(q["answer"]).rstrip()
        ok = got == want
        failures += not ok
        print(f"{'✅' if ok else '❌'} {lesson}/{q['id']}" + ("" if ok else f"\n   expected: {want!r}\n   got     : {got!r}"))
    print(f"\n{len(questions) - failures}/{len(questions)} correct answers")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
