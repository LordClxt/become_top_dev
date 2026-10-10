---
name: course-plan
description: Proposer le plan d'un cours à partir d'un livre déjà lu (étape 1 du workflow) — parcours, chapitres, leçons, type d'exercices, format de contenu et features MVP/v2/v3. À utiliser quand l'utilisateur demande un plan de cours, un découpage de livre, ou ajoute un nouveau livre.
---

# course-plan

Pré-requis : le livre a été lu en entier via `book-ingest` (notes dans `.cache/books/<slug>/notes.md`).

## Livrable (dans la conversation, pas encore de fichiers)
1. **Profil du livre** : pratique (code exécutable, ex. Go) ou conceptuel (architecture). Cela fixe le type d'exercices.
2. **Parcours** : 1 à 3 parcours (ex. « Fondations Go », « Concurrence », « Go en production »), chacun regroupant des chapitres.
3. **Plan par chapitre** — un tableau :
   | Chapitre (pages) | Leçons (titre + objectif en 1 ligne) | TP | Devoir | Projet | Concepts difficiles → format visuel |
   - Regrouper ou scinder les chapitres du livre si la pédagogie l'exige (dire pourquoi).
   - Ajouter des leçons « au-delà du livre » si nécessaire pour le top 1 % (marquées `extra: true`).
4. **Type d'exercices** :
   - Livre pratique → TP avec tests auto (`go test`), boss fight = mini-projet testé.
   - Livre conceptuel → katas d'architecture, rédaction d'ADR, choix de style avec trade-offs, diagrammes ; notation par rubrique + revue IA ; quiz de scénarios.
5. **Format des fichiers** : renvoyer au skill `content-format` et signaler tout ajustement proposé.
6. **Features MVP / v2 / v3** : liste priorisée, MVP = le strict nécessaire pour 1 chapitre de bout en bout (leçon, TP testés en sandbox, quiz, XP).
7. **Chapitre pilote recommandé** pour le MVP, avec justification (assez riche pour exercer tous les types de contenu).

Terminer par : « Valides-tu ce plan ? » puis **STOP**.

## Après accord
- Écrire `content/<book>/course.yaml` (schéma dans `content-format/reference/schemas.md`).
- Ne générer aucune leçon avant l'accord sur l'architecture (étape 2).

## Definition of Done
- [ ] Chaque chapitre du livre est couvert ou explicitement exclu (avec raison)
- [ ] Chaque leçon a un objectif mesurable (« être capable de… »)
- [ ] Concepts difficiles listés avec format visuel envisagé
- [ ] Plan validé par l'utilisateur avant d'écrire `course.yaml`
