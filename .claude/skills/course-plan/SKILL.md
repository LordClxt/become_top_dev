---
name: course-plan
description: Propose a course plan from a book that has already been read (workflow step 1) — tracks, chapters, lessons, exercise types, content format and MVP/v2/v3 features. Use it when the user asks for a course plan or a book breakdown, or adds a new book.
---

# course-plan

Prerequisite: the book has been read in full through `book-ingest` (notes in `.cache/books/<slug>/notes.md`).

## Deliverable (in the conversation, no files yet)
1. **Book profile**: practical (runnable code, e.g. Go) or conceptual (architecture). This sets the exercise type.
2. **Tracks**: 1 to 3 tracks (e.g. "Go Foundations", "Concurrency", "Go in Production"), each grouping chapters.
3. **Per-chapter plan** — a table:
   | Chapter (pages) | Lessons (title + one-line objective) | Labs | Assignment | Project | Hard concepts → visual format |
   - Merge or split the book's chapters if teaching requires it (say why).
   - Add "beyond the book" lessons where needed for the top 1 % (marked `extra: true`).
4. **Exercise types**:
   - Practical book → labs with automated tests (`go test`), boss fight = tested mini-project.
   - Conceptual book → architecture katas, ADR writing, style choices with trade-offs, diagrams; rubric grading + AI review; scenario quizzes.
5. **File format**: refer to the `content-format` skill and flag any proposed adjustment.
6. **MVP / v2 / v3 features**: prioritized list, MVP = the bare minimum for 1 chapter end to end (lesson, labs tested in the sandbox, quiz, XP).
7. **Recommended pilot chapter** for the MVP, with justification (rich enough to exercise every content type).

End with: "Do you approve this plan?" then **STOP**.

## After approval
- Write `content/<book>/course.yaml` (schema in `content-format/reference/schemas.md`).
- Generate no lesson before the architecture is approved (step 2).

## Definition of Done
- [ ] Every chapter of the book is covered or explicitly excluded (with a reason)
- [ ] Every lesson has a measurable objective ("be able to…")
- [ ] Hard concepts listed with the intended visual format
- [ ] Plan approved by the user before writing `course.yaml`
