---
name: lab-authoring
description: Create, modify or fix a lab, assignment or boss fight with starter code, automated tests, a reference solution and progressive hints, then validate it in the Docker sandbox. Use it for every coding or design exercise in content/.
---

# lab-authoring

Absolute rule: **a lab ships only if the solution passes its tests AND the starter fails them.**

## Coding exercise (`kind: code`)
1. **Design**: a precise objective tied to 1–3 of the lesson's `concepts`. One lab = 10–30 min. Prefer realistic problems (parser, cache, API, worker) over textbook exercises.
2. **`solution/`**: idiomatic reference code, what a senior would write. For Go: `go.mod` (module `lab`, no external dependency — the sandbox has no network), `gofmt`-ed.
3. **`tests/`**: files copied next to the code before running (`*_test.go`, same package).
   - Test behavior, not implementation. Include edge cases and error cases.
   - Teaching failure messages in French: `t.Errorf("Sum(%v) = %d, attendu %d — pense au cas de la slice vide", ...)`.
   - Table-driven tests in Go; `-race` for concurrency (requires an image with cgo).
4. **`starter/`**: same structure as `solution/`, signatures present, bodies to fill in (`// TODO: …` + `panic("à implémenter")` or zero value). Must **compile**.
5. **`hints.md`**: `## Hint 1` (direction), `## Hint 2` (approach), `## Hint 3` (near-solution, without complete code).
6. **`instructions.md`** (FR): context, task, input/output examples, constraints.
7. **Verify**:
   ```bash
   .claude/skills/lab-authoring/scripts/verify_lab.sh content/<book>/<chapter>/<lesson>/labs/<lab>
   ```
   If ✅, write `verified: { at: <date>, solution: pass, starter: fail }` in `lab.yaml`. Otherwise fix and rerun — never ship a failing lab.

## Design exercise (`kind: diagram` or `kind: worksheet`, no code)
For every conceptual book, and for practical courses whose lesson is a **decision** (choose a model, size a system, compare), the lab is not code. Two tools, graded deterministically by the backend (no Docker): formats in `content-format/reference/schemas.md`.
- **`diagram`**: the learner draws an architecture or a structure (catalog components, typed arrows, zones, trees); graph rules highlight the mistakes.
- **`worksheet`**: a sheet of blocks (`number`, `choice`, `multi`, `order`, `match`, `table`, `tuner`) graded field by field.
Formula: **predict → check → debrief**. A small numeric or judgment scenario, never a recall question; every wrong answer has its explanation (`feedback.yaml`), and `debrief.md` gives the why once solved.
Verify: `verify_lab.sh <dir>` (solution passes, starter fails), then write `verified`. No fake tests, no AI review.

## "What does this program print?" quizzes
Every `code-output` question is actually run:
```bash
python3 .claude/skills/lab-authoring/scripts/verify_quiz.py content/<book>/<chapter>
```
A wrong answer blocks the chapter from shipping, just like a failing lab.

## Boss fight
Same format as a lab, in `boss/`, difficulty 4–5, combines the whole chapter, larger `timeout_s`, high XP.

## Definition of Done
- [ ] `verify_lab.sh` ✅ (code, diagram or worksheet)
- [ ] The starter compiles (code); failure messages guide without giving away the answer
- [ ] 3 hint levels
- [ ] Idiomatic solution, no network dependency
- [ ] `verify_quiz.py` ✅ on the chapter
