---
name: content-format
description: Reference format for course files in content/ (Markdown + YAML) — directory tree, IDs, schemas for lessons, labs, assignments, quizzes, flashcards, projects and visuals. Consult it before creating, modifying or reading any course content, and for the backend loader.
---

# content-format

> Status: **provisional** until step 1 is approved. Any format change happens here first, then in the backend loader.

## Directory tree
```
content/<book>/
  course.yaml                          # tracks, chapter order, book metadata
  <NN>-<chapter-slug>/
    chapter.yaml                       # objectives, mastery threshold, boss fight
    <NN>-<lesson-slug>/
      lesson.md                        # YAML front matter + Markdown body (FR)
      quiz.yaml
      flashcards.yaml
      labs/<lab-slug>/
        lab.yaml
        instructions.md
        hints.md                       # 3 levels, separated by "## Hint 1/2/3"
        starter/                       # code given to the user
        solution/                      # reference solution
        tests/                         # tests run in the sandbox
        mutants/                       # kind: tests — buggy versions the learner's tests must make fail
      visuals/<concept-slug>/
        visual.yaml
        ...                            # Remotion composition, interactive component or SVG
    assignment/                        # chapter assignment
      assignment.yaml  instructions.md  rubric.yaml  starter/  solution/  tests/
    project/                           # end-of-chapter project
      project.yaml  milestones.yaml  starter/
    boss/                              # boss fight = timed lab, same format as labs/
```

## Rules
- `NN` = 2-digit order. The slug may change, **the `id` never** (progress key in the DB).
- ID format: `<book-short>-ch<NN>-l<NN>[-<suffix>]`, e.g. `go-ch02-l03`, `go-ch02-l03-lab-iota`, `arch-ch09-assignment`.
- All user-facing text is in French; YAML keys, code and file names in English.
- Every lesson cites `source.chapter` and `source.pages`.
- Code in Markdown: fenced blocks with a language (` ```go `).
- Inline visuals in a lesson: `::visual{id="go-ch10-goroutine-scheduler"}` directive.
- No text diagram (ASCII/box-drawing) in the Markdown: use a visual (`hyperframes` by default for an 8–15 s flow or structure, see `concept-visual`) and list its id in the lesson's `visuals:`.

## Schemas
See [reference/schemas.md](reference/schemas.md) for every YAML/front-matter file with a complete example.

## Definition of Done
- [ ] All files follow the schemas (required fields present, unique IDs)
- [ ] Every `lab.yaml` / `assignment.yaml` points to existing folders
- [ ] Every `::visual{id}` references an existing visual
