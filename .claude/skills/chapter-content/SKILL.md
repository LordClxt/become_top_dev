---
name: chapter-content
description: Generate all the content for a course chapter (lessons, tested labs, assignment, quiz, flashcards, project, boss fight, visual and simulation ideas) from the source book. Use it for the MVP pilot chapter and for every following chapter.
---

# chapter-content

Prerequisites: approved plan (`content/<book>/course.yaml` exists), book extracted (`.cache/books/<slug>/`). Format: `content-format` skill.

## Procedure
Goal: excellence, not competence — apply the « Courses aim at excellence » rules of AGENTS.md at every step.
1. Re-read the source chapter **in full** (`.cache/books/<slug>/chNN-*.txt`) and `notes.md`.
2. `chapter.yaml`: objectives, mastery threshold, prerequisites.
3. **Lessons** (`lesson.md`), for each one:
   - Why it matters → concept explained with **your own examples** → common pitfalls → key takeaways.
   - Go beyond the book when useful (performance, internals, professional idioms) — clearly marked.
   - Callbacks to concepts from earlier chapters (spaced repetition).
   - Glossary + `concepts` with stable IDs.
4. **Labs**: through the `lab-authoring` skill (mandatory — it is what validates the tests). Practical language course (Go): code labs. Design or systems course (DDIA, architecture): **lesson lab = `diagram` or `worksheet`** (the book's Go code goes in the Workshop). **Assignment and boss are `diagram` or `worksheet` too**; only the running project (Tinybase) stays tested Go code.
5. **Assignment** (`assignment/`): a more open-ended problem than the labs, `rubric.yaml` mixing `tests` and `ai` criteria.
6. **Quiz**: 5–10 questions per lesson, mixed types, each tied to a `concept`, an explanation for every answer. Include `code-output` questions for practical books and trade-off scenarios for conceptual books.
7. **Flashcards**: 5–15 per lesson, one idea per card.
8. End-of-chapter **project**: 2–4 tested milestones, reusing concepts from several lessons.
9. **Boss fight** (`boss/`): a harder lab combining the whole chapter, through `lab-authoring`.
10. **Visuals**: for each hard concept, a `visual.yaml` (`status: idea` at minimum) through `concept-visual`. Simulation ideas through `simulation-design`.
    **Never a text diagram** (ASCII, box-drawing, arrows in a fenced block) in a lesson: every architecture, flow, memory or structure diagram becomes a `hyperframes` visual (`hyperframes-animation` skill, see `concept-visual`), referenced by `::visual{id}`. Formulas and code stay as text.

## Summary to present to the user
```
Chapter NN — <title>
Lessons: n | Labs: n (all verified ✅) | Quiz: n questions | Flashcards: n
Assignment: <title> | Project: <title> (n milestones) | Boss: <title>
Visuals: <id> (format — justification) …
Points of attention / deviations from the book: …
```
Then **STOP** and wait for approval before the next chapter.

## Definition of Done
- [ ] Excellence rules (AGENTS.md): scenario-first lessons, no taught-nowhere notion, warm-up exercise, debugging lab, boss without hints, an « under the hood » section, production trade-offs
- [ ] Every objective in `chapter.yaml` is covered by at least one lesson and one exercise
- [ ] Every lab/assignment/boss has `verified` filled in by `verify_lab.sh` (or a rubric if `kind: design`)
- [ ] `verify_quiz.py`: every `code-output` answer is correct
- [ ] No long copied passages; `source.pages` on every lesson
- [ ] Every quiz concept exists in the lessons' `concepts`
- [ ] No text diagram in `lesson.md` (fenced blocks with no language containing `│ ─ ▶ ┌`, `+--+`, arrows): each is replaced by a visual
- [ ] Content complies with `content-format`
