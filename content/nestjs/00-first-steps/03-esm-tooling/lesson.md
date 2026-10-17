---
id: nest-ch00-l03
title: "ESM, compilateurs et tests : l'outillage de Nest 12"
source: { chapter: 145, pages: "#moving-your-own-code-to-esm", url: "https://docs.nestjs.com/migration-guide#moving-your-own-code-to-esm" }
duration_min: 25
concepts:
  - id: nest-esm-imports
    label: "En ESM (module nodenext), un import relatif porte l'extension du fichier émis : './books.service.js', même depuis un .ts"
  - id: nest-esm-globals
    label: "__dirname, __filename et require n'existent pas en ESM : import.meta.dirname et createRequire les remplacent"
  - id: nest-cjs-interop
    label: "Un paquet CommonJS qui exporte une fonction (supertest) s'importe par défaut : import request from 'supertest'"
  - id: nest-build-tools
    label: "tsc vérifie les types et émet les métadonnées ; SWC compile beaucoup plus vite mais ne vérifie pas les types sans --type-check"
glossary:
  - term: "ESM"
    definition: "ECMAScript Modules : le système de modules standard (import/export), activé par \"type\": \"module\" dans package.json. Les paquets de Nest 12 sont ESM uniquement."
  - term: "require(esm)"
    definition: "Capacité de Node (20.19+, 22.12+) à charger un module ESM depuis du CommonJS : c'est ce qui permet à une application CommonJS d'utiliser Nest 12."
  - term: "SWC"
    definition: "Compilateur TypeScript écrit en Rust, environ vingt fois plus rapide que tsc, qui sait émettre les métadonnées de décorateurs mais ne vérifie pas les types."
  - term: "Vitest"
    definition: "Lanceur de tests natif ESM, choisi par défaut par `nest new` pour les projets ESM (Jest reste le défaut en CommonJS)."
visuals: []
labs: [nest-ch00-l03-lab-fix-esm]
extra: false
xp: 25
---

> **En une phrase :** en ESM, Node charge exactement le fichier que tu nommes : extensions `.js`, pas de `__dirname`, et une interop CommonJS à connaître.

## Le problème

Le service de catalogue marche dans l'éditeur, compile sans erreur, et plante au démarrage : `ERR_MODULE_NOT_FOUND: Cannot find module '/app/dist/catalog.service'`. Le fichier existe pourtant, il s'appelle `catalog.service.js`.

Nest 12 publie tous ses paquets en ESM, et `nest new` génère un projet ESM testé avec Vitest. La transition laisse des pièges qui ne viennent pas de ta logique et coûtent des heures quand on ne les reconnaît pas.

## Le concept

### Ce qui fait d'un projet un projet ESM

Le basculement se fait dans `package.json`, avec `"type": "module"`. Côté TypeScript, `"module": "nodenext"` et `"moduleResolution": "nodenext"` déduisent le format de chaque fichier du `package.json` le plus proche. Un projet généré par `nest new` (ESM) contient aussi les deux options indispensables à Nest :

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "strictPropertyInitialization": false,
    "target": "ES2023"
  }
}
```

`strictPropertyInitialization` est désactivé parce que Nest remplit certaines propriétés après la construction (les DTO, par exemple). Tout le reste de `strict` reste actif.

Passer ton application en ESM n'est **pas** obligatoire pour adopter Nest 12 : grâce à `require(esm)`, une application CommonJS peut charger ses paquets ESM depuis Node 20.19 ou 22.12. `nest upgrade` ne touche pas au format de ton code.

### Trois réflexes ESM

**1. L'extension est celle du fichier émis.** Un import relatif doit nommer le fichier tel qu'il existera après compilation :

```ts
import { BooksService } from './books.service.js';   // oui, .js, même si le source est .ts
```

Sans extension, tsc refuse (« Cannot find module », ou `TS2835` qui propose l'extension) et Node lève `ERR_MODULE_NOT_FOUND`.

**2. Les globales CommonJS ont disparu.** `__dirname`, `__filename` et `require` n'existent pas dans un module ESM. Remplace-les par :

```ts
const protoPath = join(import.meta.dirname, 'hero.proto');
const require = createRequire(import.meta.url);   // import { createRequire } from 'node:module'
```

Attention, `@types/node` déclare `__dirname` partout : **tsc ne te prévient pas**, l'erreur n'arrive qu'à l'exécution (`ReferenceError: __dirname is not defined`).

**3. L'interop CommonJS passe par l'import par défaut.** `supertest` est un module CommonJS qui exporte une fonction. En ESM, `import * as request from 'supertest'` donne un *namespace*, un objet qui ne s'appelle pas. Il faut `import request from 'supertest'`.

### Compiler : tsc ou SWC

| | tsc | SWC (`nest start -b swc`) |
|---|---|---|
| Vitesse | référence | environ 20 fois plus rapide |
| Vérifie les types | oui | non, sauf avec `--type-check` (tsc en parallèle) |
| Métadonnées de décorateurs | oui | oui (`legacyDecorator` + `decoratorMetadata`) |
| Plugins CLI (Swagger, GraphQL) | oui | avec `--type-check` seulement |

En développement, SWC raccourcit la boucle d'édition. En CI, il faut **toujours** une vérification de types (`tsc --noEmit`), sans quoi une erreur de type part en production. Dans un projet Vitest, le plugin `unplugin-swc` compile les tests avec les bonnes options de décorateurs.

### Les tests

`@nestjs/testing` ne dépend d'aucun lanceur : Vitest et Jest l'utilisent de la même manière. Seul piège à connaître : Jest ne charge les paquets ESM de Nest 12 qu'à partir de Node 24.9. En dessous, il échoue avec `ERR_REQUIRE_ASYNC_MODULE`.

## Sous le capot

Pourquoi l'extension est-elle obligatoire ? En CommonJS, `require('./catalog.service')` essayait plusieurs fichiers (`.js`, `.json`, `/index.js`). Le chargeur ESM de Node, lui, résout une URL : il charge **exactement** le fichier nommé, sans rien deviner. Et tsc, avec `module: NodeNext`, ne réécrit jamais tes chemins : il laisse `./catalog.service.js` tel quel, ce qui pointe vers le fichier **compilé**. C'est pour ça qu'on écrit `.js` dans un fichier `.ts`.

`__dirname` n'existe pas en ESM parce qu'un module ESM n'est pas enveloppé dans la fonction `(exports, require, module, __filename, __dirname) => …` de CommonJS. Son équivalent est `import.meta.dirname`, calculé à partir de l'URL du module.

## En production

- Teste toujours le code **compilé** (le `dist/` que tu déploies), pas seulement l'exécution à la volée de l'éditeur : c'est là que les extensions manquantes apparaissent.
- SWC compile beaucoup plus vite que tsc mais ne vérifie pas les types : garde un `tsc --noEmit` dans la CI.

## Pièges fréquents

- **Laisser l'éditeur compléter les imports sans extension.** Configure l'auto-import de ton éditeur pour qu'il ajoute `.js`.
- **`__dirname` en ESM.** Aucune erreur de type, un plantage à l'exécution.
- **`import * as request from 'supertest'`.** « This expression is not callable » : utilise l'import par défaut.
- **`import type` sur une classe injectée.** Vu à la leçon précédente : c'est un piège ESM aussi, car les outils qui imposent `verbatimModuleSyntax` poussent à ajouter `type` partout.
- **SWC sans vérification de types en CI.** Le build réussit, la production casse.

## À retenir

- `"type": "module"` + `nodenext` : imports relatifs en `.js`, `import.meta.dirname`, `createRequire`.
- Les paquets CommonJS qui exportent une fonction s'importent par défaut.
- tsc vérifie et émet ; SWC émet vite sans vérifier. La CI doit toujours vérifier les types.
- Une application CommonJS peut rester CommonJS avec Nest 12, grâce à `require(esm)`.
