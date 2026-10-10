---
name: simulation-design
description: Concevoir une simulation façon jeu vidéo où l'utilisateur programme un comportement (bot, agent, scheduler, load balancer, file d'attente, cache, circuit breaker…) et voit le résultat s'animer, avec niveaux, score et XP. À utiliser pour proposer des idées de simulations par chapitre ou spécifier/implémenter une simulation.
---

# simulation-design

## Principe d'architecture
```
code utilisateur ──► sandbox (moteur de simulation déterministe) ──► trace JSON d'états ──► front anime la trace
```
- Le moteur tourne **dans la sandbox** avec le code utilisateur (même langage que le cours, ex. Go). Le front n'exécute rien : il rejoue la trace.
- Déterministe : graine aléatoire fixe par niveau → résultats reproductibles et comparables.

## Spec à produire (`content/<book>/<chapter>/simulations/<slug>/simulation.yaml` + `README.md`)
1. **Pitch** : une phrase, le concept enseigné (ex. « équilibrer la charge entre workers sans perdre de requêtes » → goroutines + channels + select).
2. **API joueur** : la seule fonction/interface que l'utilisateur implémente, ex.
   ```go
   type Scheduler interface { Next(state State) Action }
   ```
3. **Monde** : entités, règles, tick.
4. **Niveaux** (3–5) : chacun introduit **une** contrainte nouvelle (charge ↑, pannes, latence variable…).
5. **Score** : métriques mesurables (débit, latence p99, requêtes perdues) + seuils 1/2/3 étoiles → XP.
6. **Trace** : format JSON des frames (`{tick, entities:[…], events:[…]}`) consommé par le renderer.
7. **Rendu** : canvas/SVG avec les tokens `design-system/`, contrôles lecture/pause/vitesse/pas-à-pas.
8. **Solution de référence** qui obtient 3 étoiles à chaque niveau + solution naïve qui échoue au niveau 2+ (même principe que `lab-authoring`).

## Bonnes idées par domaine
- Go : scheduler de goroutines, pipeline de workers, rate limiter, cache LRU sous charge, graceful shutdown.
- Architecture : load balancer, circuit breaker, event-driven vs request/reply, scaling d'un microservice, saga.

## Definition of Done
- [ ] API joueur minimale (1 fonction/interface)
- [ ] Niveaux progressifs avec seuils d'étoiles
- [ ] Solutions référence (3★) et naïve (échoue) vérifiées dans la sandbox
