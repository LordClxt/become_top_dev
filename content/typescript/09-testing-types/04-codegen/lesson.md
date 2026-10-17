---
id: ts-ch09-l04
title: "La génération de code plutôt que des types complexes"
source: { chapter: 6, pages: "256-260" }
duration_min: 25
concepts:
  - id: ts-type-level-tarpit
    label: "Le système de types est Turing-complet, mais analyser un langage (SQL) en types est un piège : lent, fragile, messages obscurs"
  - id: ts-codegen
    label: "Générer des types TypeScript à partir d'une source de vérité (requêtes SQL, schéma de base, OpenAPI) produit des types simples et exacts"
  - id: ts-codegen-ci
    label: "Le code généré est versionné et la CI vérifie qu'il est à jour (régénérer puis comparer, git diff)"
glossary:
  - term: "génération de code (codegen)"
    definition: "Production automatique de code source (ici des types) à partir d'une description : schéma, requêtes, spécification."
  - term: "Turing-complet"
    definition: "Capable d'exprimer n'importe quel calcul : c'est le cas du système de types de TypeScript, ce qui ne veut pas dire qu'il faut s'en servir pour tout."
visuals: []
labs: [ts-ch09-l04-lab-codegen]
extra: false
xp: 25
---

## Pourquoi c'est important

Les modules 08 et 09 ont montré tout ce que le système de types sait calculer. La tentation devient grande de **tout** calculer en types : analyser une requête SQL pour en déduire le type des lignes, par exemple. C'est possible… et c'est souvent une mauvaise idée. Il existe une autre voie : **générer** les types.

## Le concept

### Le piège du tout-en-types

On peut écrire des types qui lisent une chaîne `'SELECT id, title FROM docs WHERE created_by = $1'`, la découpent, retrouvent les colonnes dans une description du schéma et produisent `{ id: string; title: string }`. Des bibliothèques l'ont fait. Les problèmes :

- il faut réimplémenter un analyseur SQL **en types**, sans débogueur, avec des limites de récursion (leçon précédente) ;
- chaque subtilité du langage (alias, jointures, fonctions) demande plus de types, et le résultat reste incomplet ;
- les messages d'erreur deviennent illisibles, la compilation ralentit.

C'est le « *Turing tar-pit* » : tout est possible, rien n'est simple.

### Générer les types

L'alternative : un outil lit la **source de vérité** (les requêtes et la base réelle) et **écrit** un fichier `.ts` ordinaire.

```ts
// généré par PgTyped à partir de la requête et du schéma de la base
export interface IGetDocsParams { userId: string }
export interface IGetDocsResult { id: string; title: string; created_at: Date }
```

Des types simples, exacts (ils viennent de la base elle-même), rapides à vérifier, avec des messages clairs. C'est la même idée que générer des types depuis un schéma OpenAPI ou JSON Schema (module 06).

### Le coût : un processus

Le code généré doit rester synchronisé avec sa source :

- on le **versionne** (il fait partie du code revu) ;
- la **CI** le régénère et échoue s'il diffère (`git diff --exit-code`) ;
- on n'édite jamais un fichier généré à la main (un en-tête le rappelle).

Les types complexes ont leur place (modules 06-08) ; mais quand une source de vérité externe existe, générer est souvent plus simple et plus juste.

## Pièges fréquents

- **Réécrire un analyseur de langage en types** : lent, incomplet, illisible.
- **Éditer un fichier généré** : la prochaine génération écrase la modification.
- **Ne pas vérifier en CI** que le code généré est à jour.

## À retenir

- Ce n'est pas parce que le système de types peut tout calculer qu'il le doit.
- Quand une source de vérité existe, génère des types simples à partir d'elle.
- Versionne le code généré et vérifie en CI qu'il est à jour.
