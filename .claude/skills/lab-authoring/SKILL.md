---
name: lab-authoring
description: Créer, modifier ou réparer un TP, un devoir ou un boss fight avec code de départ, tests automatiques, solution de référence et indices progressifs, puis le valider en sandbox Docker. À utiliser pour tout exercice de code ou de conception dans content/.
---

# lab-authoring

Règle absolue : **un TP n'est livré que si la solution passe ses tests ET le starter les échoue.**

## Exercice de code (`kind: code`)
1. **Concevoir** : un objectif précis lié à 1–3 `concepts` de la leçon. Un TP = 10–30 min. Préférer des problèmes réalistes (parser, cache, API, worker) aux exercices scolaires.
2. **`solution/`** : code idiomatique de référence, celui qu'un senior écrirait. Pour Go : `go.mod` (module `lab`, sans dépendance externe — la sandbox n'a pas de réseau), `gofmt`-é.
3. **`tests/`** : fichiers copiés à côté du code avant exécution (`*_test.go`, même package).
   - Tester le comportement, pas l'implémentation. Inclure cas limites et cas d'erreur.
   - Messages d'échec pédagogiques en français : `t.Errorf("Sum(%v) = %d, attendu %d — pense au cas de la slice vide", ...)`.
   - Table-driven tests en Go ; `-race` si concurrence (nécessite une image avec cgo).
4. **`starter/`** : même structure que `solution/`, signatures présentes, corps à compléter (`// TODO: …` + `panic("à implémenter")` ou valeur zéro). Doit **compiler**.
5. **`hints.md`** : `## Hint 1` (direction), `## Hint 2` (approche), `## Hint 3` (quasi-solution, sans code complet).
6. **`instructions.md`** (FR) : contexte, tâche, exemples entrée/sortie, contraintes.
7. **Vérifier** :
   ```bash
   .claude/skills/lab-authoring/scripts/verify_lab.sh content/<book>/<chapter>/<lesson>/labs/<lab>
   ```
   Si ✅, écrire `verified: { at: <date>, solution: pass, starter: fail }` dans `lab.yaml`. Sinon corriger et relancer — ne jamais livrer en échec.

## Exercice conceptuel (`kind: design`, livre d'architecture)
- Pas de faux tests. Livrables possibles : ADR, choix de style architectural justifié, identification des caractéristiques d'architecture, diagramme C4/Mermaid, analyse de trade-offs sur un kata.
- `rubric.yaml` détaillée (niveaux décrits) + `solution/` = réponse modèle commentée + `checks` structurels éventuels (sections présentes, nombre de caractéristiques citées).
- `verified` : `{ at: <date>, rubric_reviewed: true }` après avoir noté soi-même la réponse modèle avec la rubrique (doit obtenir ≥ 90 %).

## Quiz « Qu'affiche ce programme ? »
Chaque question `code-output` est exécutée pour de vrai :
```bash
python3 .claude/skills/lab-authoring/scripts/verify_quiz.py content/<book>/<chapter>
```
Une réponse fausse bloque la livraison du chapitre, comme un TP en échec.

## Boss fight
Même format qu'un lab, dans `boss/`, difficulté 4–5, combine tout le chapitre, `timeout_s` plus large, XP élevé.

## Definition of Done
- [ ] `verify_lab.sh` ✅ (ou rubrique auto-notée pour `design`)
- [ ] Le starter compile ; les messages d'échec guident sans donner la réponse
- [ ] 3 niveaux d'indices
- [ ] Solution idiomatique, sans dépendance réseau
- [ ] `verify_quiz.py` ✅ sur le chapitre
