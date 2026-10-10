---
name: chapter-content
description: Générer tout le contenu d'un chapitre de cours (leçons, TP testés, devoir, quiz, flashcards, projet, boss fight, idées de visuels et simulations) à partir du livre source. À utiliser pour le chapitre pilote du MVP et pour chaque chapitre suivant.
---

# chapter-content

Pré-requis : plan validé (`content/<book>/course.yaml` existe), livre extrait (`.cache/books/<slug>/`). Format : skill `content-format`.

## Procédure
1. Relire le chapitre source **en entier** (`.cache/books/<slug>/chNN-*.txt`) et `notes.md`.
2. `chapter.yaml` : objectifs, seuil de maîtrise, prérequis.
3. **Leçons** (`lesson.md`), pour chacune :
   - Pourquoi c'est important → concept expliqué avec **ses propres exemples** → pièges fréquents → à retenir.
   - Aller plus loin que le livre quand utile (perf, internals, idiomes pro) — marqué clairement.
   - Rappels vers les concepts des chapitres précédents (révision espacée).
   - Glossaire + `concepts` avec IDs stables.
4. **TP** : via le skill `lab-authoring` (obligatoire — c'est lui qui valide les tests).
5. **Devoir** (`assignment/`) : problème plus ouvert que les TP, `rubric.yaml` mêlant critères `tests` et `ai`.
6. **Quiz** : 5–10 questions par leçon, mélange de types, chacune liée à un `concept`, explication pour chaque réponse. Inclure des `code-output` pour les livres pratiques et des scénarios de trade-off pour les livres conceptuels.
7. **Flashcards** : 5–15 par leçon, une idée par carte.
8. **Projet** de fin de chapitre : 2–4 jalons testés, réutilise les concepts de plusieurs leçons.
9. **Boss fight** (`boss/`) : lab plus dur combinant tout le chapitre, via `lab-authoring`.
10. **Visuels** : pour chaque concept difficile, un `visual.yaml` (`status: idea` au minimum) via `concept-visual`. Idées de simulations via `simulation-design`.

## Récap à présenter à l'utilisateur
```
Chapitre NN — <titre>
Leçons : n | TP : n (tous vérifiés ✅) | Quiz : n questions | Flashcards : n
Devoir : <titre> | Projet : <titre> (n jalons) | Boss : <titre>
Visuels : <id> (format — justification) …
Points d'attention / écarts par rapport au livre : …
```
Puis **STOP** et attendre la validation avant le chapitre suivant.

## Definition of Done
- [ ] Tous les objectifs de `chapter.yaml` sont couverts par au moins une leçon et un exercice
- [ ] Tous les labs/devoir/boss ont `verified` renseigné par `verify_lab.sh` (ou rubrique si `kind: design`)
- [ ] `verify_quiz.py` : toutes les réponses `code-output` sont correctes
- [ ] Aucun long passage recopié ; `source.pages` sur chaque leçon
- [ ] Tous les concepts du quiz existent dans les `concepts` des leçons
- [ ] Contenu conforme à `content-format`
