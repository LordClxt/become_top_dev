---
name: book-ingest
description: Extract and read a whole book (PDF) from the books/ folder before planning or generating a course. Use it whenever you need to read, analyze, summarize or find a page in a source book (Learning Go, Fundamentals of Software Architecture, or any newly added book).
---

# book-ingest

The PDF is never read directly page by page: extract it to text once, then read the per-chapter files.

## Procedure
1. Extract (idempotent, fast):
   ```bash
   python3 .claude/skills/book-ingest/scripts/extract_book.py "books/<file>.pdf" --slug <slug>
   ```
   Existing slugs: `learning-go`, `software-architecture`. Output: `.cache/books/<slug>/`.
2. Open `toc.md`: check that the chapter ↔ page split is consistent (front matter, preface, index to ignore).
   If the PDF outline is missing or wrong, split from `full.txt` by locating the "Chapter N" headings.
3. Read **all** chapters in full (`chNN-*.txt` files), in order. Never plan from the table of contents alone.
4. While reading, keep notes in `.cache/books/<slug>/notes.md`:
   - per chapter: key ideas, hard concepts (candidates for visuals/simulations), code examples usable for labs, prerequisites pointing to other chapters, reference pages.
5. The `=== page N ===` markers give the PDF page; also note the printed page if different (for `source.pages`).

## Rules
- `.cache/` and `books/` are never committed (copyright).
- Never copy long passages into `content/`: rephrase.
- If `pymupdf` is missing: `uv pip install pymupdf` (or `pip install pymupdf`).

## Definition of Done
- [ ] `toc.md` exists and the split is verified
- [ ] All chapters have been read
- [ ] `notes.md` covers every chapter (hard concepts + lab ideas)
