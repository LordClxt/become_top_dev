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

## Exercice de conception (`kind: diagram` ou `kind: worksheet`, sans code)
Pour tout livre conceptuel, et pour les cours pratiques dont la leçon est une **décision** (choisir un modèle, dimensionner, comparer), le TP n'est pas du code. Deux outils, corrigés de façon déterministe par le backend (aucun Docker) : formats dans `content-format/reference/schemas.md`.
- **`diagram`** : l'élève dessine une architecture ou une structure (composants du catalogue, flèches typées, zones, arbres) ; règles de graphe qui surlignent les fautes.
- **`worksheet`** : fiche de blocs (`number`, `choice`, `multi`, `order`, `match`, `table`, `tuner`) corrigés champ par champ.
Formule : **prédire → vérifier → debriefer**. Une mini-situation chiffrée ou à trancher, jamais une question de cours ; chaque mauvaise réponse a son explication (`feedback.yaml`), `debrief.md` donne le pourquoi une fois réussi.
Vérifier : `verify_lab.sh <dir>` (la solution passe, le starter échoue) puis écrire `verified`. Pas de faux tests, pas de revue IA.

## Quiz « Qu'affiche ce programme ? »
Chaque question `code-output` est exécutée pour de vrai :
```bash
python3 .claude/skills/lab-authoring/scripts/verify_quiz.py content/<book>/<chapter>
```
Une réponse fausse bloque la livraison du chapitre, comme un TP en échec.

## Boss fight
Même format qu'un lab, dans `boss/`, difficulté 4–5, combine tout le chapitre, `timeout_s` plus large, XP élevé.

## Definition of Done
- [ ] `verify_lab.sh` ✅ (code, diagram ou worksheet)
- [ ] Le starter compile (code) ; les messages d'échec guident sans donner la réponse
- [ ] 3 niveaux d'indices
- [ ] Solution idiomatique, sans dépendance réseau
- [ ] `verify_quiz.py` ✅ sur le chapitre
