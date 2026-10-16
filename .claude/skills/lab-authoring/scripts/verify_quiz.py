#!/usr/bin/env python3
"""Run every `code-output` quiz question of a chapter and compare with its answer.

Usage: python3 verify_quiz.py <chapter_dir> [--image golang:1]

The language is read from the course.yaml next to the chapter folder (default: go).
Go: each snippet is wrapped in `func main()` with the imports it uses. Groovy: each
snippet is a script run with `groovy` (image btd-runner-groovy). Java: a snippet that
declares its own `main` is a complete source file; otherwise it is wrapped in
`Main.main`. Common java.util / java.math imports are added; run with `java Main.java`
(image btd-runner-java). TypeScript: the snippet is a module run with `node main.ts`
(type stripping, image btd-runner-typescript). NestJS: the snippet is a complete module
compiled with tsc (legacy decorators + emitDecoratorMetadata) then run with node, against the
preinstalled packages of btd-runner-nestjs. Executed in a
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


JAVA_IMPORTS = "".join(f"import {p}.*;\n" for p in (
    "java.util", "java.util.function", "java.util.stream", "java.util.concurrent", "java.math", "java.io", "java.time"))


def wrap_java(code: str) -> str:
    if "void main(" in code:
        return JAVA_IMPORTS + "\n" + code.rstrip() + "\n"
    body = "\n".join("        " + line for line in code.rstrip().splitlines())
    return (JAVA_IMPORTS + "\npublic class Main {\n    public static void main(String[] args) throws Exception {\n"
            + body + "\n    }\n}\n")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("chapter", type=Path)
    ap.add_argument("--image")
    args = ap.parse_args()
    course = args.chapter.resolve().parent / "course.yaml"
    language = (yaml.safe_load(course.read_text()).get("language") if course.exists() else None) or "go"
    if language == "groovy":
        args.image = args.image or "btd-runner-groovy"
    elif language == "java":
        args.image = args.image or "btd-runner-java"
    elif language == "typescript":
        args.image = args.image or "btd-runner-typescript"
    elif language == "nestjs":
        args.image = args.image or "btd-runner-nestjs"
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
            elif language == "java":
                (d / "Main.java").write_text(wrap_java(q["code"]))
            elif language in ("typescript", "nestjs"):
                (d / "package.json").write_text('{"type":"module"}\n')
                (d / "main.ts").write_text(q["code"].rstrip() + "\n")
            else:
                (d / "go.mod").write_text("module q\n\ngo 1.23\n")
                (d / "main.go").write_text(wrap(q["code"]))
        run = {"groovy": "groovy main.groovy 2>&1", "java": "java -XX:TieredStopAtLevel=1 Main.java 2>&1",
               "typescript": "node main.ts 2>&1",
               "nestjs": "ln -s /opt/nest/node_modules node_modules && /opt/nest/node_modules/.bin/tsc main.ts"
                         " --experimentalDecorators --emitDecoratorMetadata --module nodenext --target es2023"
                         " --skipLibCheck --outDir /tmp/$(basename $d) >/dev/null 2>&1;"
                         " cp package.json /tmp/$(basename $d)/ && ln -s /opt/nest/node_modules /tmp/$(basename $d)/node_modules"
                         " && node /tmp/$(basename $d)/main.js 2>&1"}.get(language, "go run . 2>&1")
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
