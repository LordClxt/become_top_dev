---
name: book-ingest
description: Extraire et lire en entier un livre (PDF) du dossier books/ avant de planifier ou générer un cours. À utiliser dès qu'il faut lire, analyser, résumer ou retrouver une page d'un livre source (Learning Go, Fundamentals of Software Architecture, ou tout nouveau livre ajouté).
---

# book-ingest

Le PDF n'est jamais lu directement page par page : on l'extrait une fois en texte, puis on lit les fichiers par chapitre.

## Procédure
1. Extraire (idempotent, rapide) :
   ```bash
   python3 .claude/skills/book-ingest/scripts/extract_book.py "books/<fichier>.pdf" --slug <slug>
   ```
   Slugs existants : `learning-go`, `software-architecture`. Sortie : `.cache/books/<slug>/`.
2. Ouvrir `toc.md` : vérifier que le découpage chapitres ↔ pages est cohérent (front matter, préface, index à ignorer).
   Si l'outline PDF est absent ou faux, découper à partir de `full.txt` en repérant les titres « Chapter N ».
3. Lire **tous** les chapitres en entier (fichiers `chNN-*.txt`), dans l'ordre. Ne pas planifier sur la seule table des matières.
4. Pendant la lecture, tenir des notes dans `.cache/books/<slug>/notes.md` :
   - par chapitre : idées clés, concepts difficiles (candidats visuels/simulations), exemples de code exploitables pour des TP, pré-requis vers d'autres chapitres, pages de référence.
5. Les marqueurs `=== page N ===` donnent la page PDF ; noter aussi la page imprimée si différente (pour `source.pages`).

## Règles
- `.cache/` et `books/` ne sont jamais committés (droits d'auteur).
- Ne jamais copier de longs passages dans `content/` : reformuler.
- Si `pymupdf` manque : `uv pip install pymupdf` (ou `pip install pymupdf`).

## Definition of Done
- [ ] `toc.md` existe et le découpage est vérifié
- [ ] Tous les chapitres ont été lus
- [ ] `notes.md` couvre chaque chapitre (concepts difficiles + idées de TP)
