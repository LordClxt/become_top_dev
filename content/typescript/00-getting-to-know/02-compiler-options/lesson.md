---
id: ts-ch00-l02
title: "Savoir quelles options de TypeScript tu utilises"
source: { chapter: 1, pages: "8-11" }
duration_min: 20
concepts:
  - id: ts-tsconfig
    label: "Les options se règlent dans tsconfig.json (pas en ligne de commande) pour que tout le monde et tous les outils voient la même chose"
  - id: ts-no-implicit-any
    label: "noImplicitAny : un paramètre ou une variable dont le type ne peut pas être déduit devient une erreur au lieu d'un any silencieux"
  - id: ts-strict-null-checks
    label: "strictNullChecks : null et undefined ne sont plus des valeurs de tous les types ; il faut les écrire (T | null) et les traiter"
  - id: ts-strict-flag
    label: "strict active toute la famille de contrôles sur le langage ; c'est le réglage cible"
  - id: ts-unchecked-indexed
    label: "noUncheckedIndexedAccess (hors strict) : arr[i] devient T | undefined, au prix de faux positifs"
glossary:
  - term: "tsconfig.json"
    definition: "Fichier de configuration du compilateur : options de langage (strict…), fichiers inclus, dossier de sortie."
  - term: "any implicite"
    definition: "Type any attribué par défaut quand TypeScript ne sait pas déduire un type et que noImplicitAny est désactivé."
  - term: "narrowing (affinage)"
    definition: "Réduction du type d'une valeur par un test (if, typeof, ===…) : après `if (x !== null)`, x n'est plus null."
visuals: []
labs: [ts-ch00-l02-lab-strict-helpers]
extra: false
xp: 25
---

## Pourquoi c'est important

Ce code passe-t-il le vérificateur ?

```ts
function add(a, b) {
  return a + b;
}
add(10, null);
```

Impossible de répondre sans connaître les options. Avec `noImplicitAny` désactivé : oui. Avec `strict` : non, pour deux raisons. TypeScript est le seul langage courant dont **le comportement du vérificateur dépend autant de la configuration**. Un exemple copié d'un blog qui « marche chez l'auteur » peut donner d'autres erreurs chez toi : vérifie d'abord que vos options sont les mêmes.

## Le concept

### Une configuration partagée : tsconfig.json

Les options peuvent venir de la ligne de commande (`tsc --noImplicitAny programme.ts`) ou d'un fichier. **Préfère toujours le fichier** : tes collègues, l'éditeur et la CI lisent le même `tsconfig.json`, et `tsc --init` en crée un déjà strict.

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

Beaucoup d'options décident *où* chercher les sources et *quoi* produire. Quelques-unes changent le langage lui-même, et ce sont les seules qui comptent ici.

### noImplicitAny

Quand TypeScript ne peut pas déduire un type, il met `any` : la valeur échappe à toute vérification. Sans l'option, tu obtiens ceci sans même le voir :

```ts
function add(a, b) {          // function add(a: any, b: any): any
  return a + b;
}
```

Avec `noImplicitAny`, c'est une erreur (`Parameter 'a' implicitly has an 'any' type`) et tu dois choisir : `any` explicite, ou mieux, un vrai type.

```ts
function add(a: number, b: number) {
  return a + b;
}
```

Pour un projet neuf, démarre avec l'option activée : tu écris les types en même temps que le code, ce qui améliore aussi la lisibilité et l'éditeur. La désactiver n'est défendable que pendant une migration depuis JavaScript, et temporairement (module 13).

### strictNullChecks

Sans cette option, `null` et `undefined` sont des valeurs acceptables **pour tous les types** :

```ts
const x: number = null;   // OK sans l'option
```

Avec elle, c'est une erreur, et il faut l'écrire explicitement si c'est voulu :

```ts
const x: number | null = null;
```

Le gain est considérable : plus de `undefined is not an object` à l'exécution, car chaque valeur potentiellement absente doit être traitée.

```ts
const statusEl = document.getElementById('status');
statusEl.textContent = 'Prêt';              // 'statusEl' is possibly 'null'

if (statusEl) {                             // narrowing : ici statusEl n'est plus null
  statusEl.textContent = 'Prêt';
}
statusEl!.textContent = 'Prêt';             // assertion : tu promets que ce n'est pas null
```

Le `if` est un **affinage** (module 03) ; le `!` est une assertion de non-nullité, qui peut mentir (leçon 3 et module 01). Active d'abord `noImplicitAny`, puis `strictNullChecks`. Plus tu attends pour l'activer, plus il y a d'erreurs à corriger.

### strict, et plus strict que strict

`strict: true` regroupe `noImplicitAny`, `strictNullChecks`, `noImplicitThis`, `strictFunctionTypes`, etc. C'est le réglage à viser, et celui des labs de cette plateforme.

Certaines options vont **au-delà** de `strict`. La plus connue est `noUncheckedIndexedAccess` :

```ts
const tenses = ['past', 'present', 'future'];
tenses[3].toUpperCase();   // aucune erreur sous strict, TypeError à l'exécution
```

Avec l'option, `tenses[3]` vaut `string | undefined` et l'erreur apparaît. Contrepartie : `tenses[0].toUpperCase()` est aussi refusé, car TypeScript ne sait pas que l'indice 0 existe. Certains projets l'activent, d'autres non ; sache qu'elle existe (item 48, module 07).

> **Au-delà du livre :** TypeScript 5.x a ajouté des options de plus pour le runtime moderne. `erasableSyntaxOnly` (utilisée par cette plateforme) interdit la syntaxe TypeScript qui produit du code (`enum`, propriétés de paramètres, `namespace`) afin que le code reste exécutable par simple retrait des types, comme le fait `node main.ts`. L'item 72 explique pourquoi cette syntaxe pose problème.

## Pièges fréquents

- **Copier du code sans copier la configuration** : une erreur qui n'apparaît pas chez toi peut venir d'un `strict` manquant.
- **Activer `strictNullChecks` avant `noImplicitAny`** : dans cet ordre, tu corriges des erreurs sur des `any` qui ne protègent de toute façon rien.
- **Répondre à chaque `possibly null` par un `!`** : tu retrouves le crash à l'exécution, mais en l'ayant promis au compilateur.
- **Configurer en ligne de commande** : tes outils (éditeur, CI) ne verront pas les mêmes règles.

## À retenir

- Configure TypeScript avec `tsconfig.json`, pas avec la ligne de commande.
- Active `noImplicitAny` (sauf migration en cours) : un `any` implicite désactive silencieusement le vérificateur.
- Active `strictNullChecks` pour traiter les valeurs absentes dès la compilation.
- Vise `strict` ; connais `noUncheckedIndexedAccess` et son prix.
- Si l'on ne reproduit pas ton erreur, compare d'abord les options.
