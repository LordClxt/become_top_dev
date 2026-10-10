#!/usr/bin/env python3
"""Extract a PDF book into per-chapter text files + a TOC, for the agent to read.

Usage: python3 extract_book.py <book.pdf> [--slug learning-go] [--out .cache/books]

Output: <out>/<slug>/toc.md, <out>/<slug>/chNN-<title>.txt (each page prefixed by
"=== page N ===" so lessons can cite exact pages), and full.txt as fallback.
Requires PyMuPDF (`pip install pymupdf`).
"""
import argparse
import re
import sys
from pathlib import Path

try:
    import pymupdf
except ImportError:
    import fitz as pymupdf  # older PyMuPDF


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60] or "untitled"


def page_text(doc, start: int, end: int) -> str:
    """Pages are 1-based and inclusive."""
    parts = []
    for n in range(start, end + 1):
        parts.append(f"\n=== page {n} ===\n{doc[n - 1].get_text()}")
    return "".join(parts)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--slug")
    parser.add_argument("--out", type=Path, default=Path(".cache/books"))
    args = parser.parse_args()

    doc = pymupdf.open(args.pdf)
    slug = args.slug or slugify(args.pdf.stem)
    out = args.out / slug
    out.mkdir(parents=True, exist_ok=True)

    (out / "full.txt").write_text(page_text(doc, 1, doc.page_count), encoding="utf-8")

    # Split on "Chapter N" entries at any depth (chapters may be nested under "Part" entries);
    # the entry right after the last chapter (appendix/index) bounds it. Fallback: top-level entries.
    toc = [(lvl, " ".join(title.split()), page) for lvl, title, page in doc.get_toc()]
    # Only the first entry per chapter number counts (appendices often repeat "Chapter 1: ...").
    seen, is_chapter = set(), []
    for _, title, _ in toc:
        m = re.match(r"(?:chapter|chapitre)\s+(\d+)", title, re.I)
        is_chapter.append(bool(m) and m.group(1) not in seen)
        if m:
            seen.add(m.group(1))
    if any(is_chapter):
        first = is_chapter.index(True)
        last = len(is_chapter) - 1 - is_chapter[::-1].index(True)
        before = [e for e in toc[:first] if e[0] == 1]
        chapters = [toc[i] for i, c in enumerate(is_chapter) if c]
        after = [e for e in toc[last + 1:] if e[0] == 1]
        top = before + chapters + after
    else:
        top = [e for e in toc if e[0] == 1]

    lines = [f"# {args.pdf.name}", "", f"Pages: {doc.page_count}", "", "| # | Title | Pages | File |", "|---|---|---|---|"]
    for i, (_, title, start) in enumerate(top):
        if start < 1:
            continue
        end = (top[i + 1][2] - 1) if i + 1 < len(top) else doc.page_count
        end = max(start, end)
        fname = f"ch{i:02d}-{slugify(title)}.txt"
        (out / fname).write_text(page_text(doc, start, end), encoding="utf-8")
        lines.append(f"| {i:02d} | {title} | {start}-{end} | {fname} |")

    if not top:
        lines.append("| - | (no PDF outline — split full.txt manually) | - | full.txt |")

    lines += ["", "## Full outline", ""]
    lines += [f"{'  ' * (lvl - 1)}- {title} (p. {page})" for lvl, title, page in toc]
    (out / "toc.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Extracted {doc.page_count} pages, {len(top)} sections -> {out}/toc.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
