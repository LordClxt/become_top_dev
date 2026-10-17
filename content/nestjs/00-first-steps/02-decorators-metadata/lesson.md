---
id: nest-ch00-l02
title: "Décorateurs et métadonnées : comment Nest sait quoi injecter"
source: { chapter: 4, pages: "#dependency-injection", url: "https://docs.nestjs.com/providers#dependency-injection" }
duration_min: 30
concepts:
  - id: nest-decorator-metadata
    label: "Un décorateur Nest n'exécute rien : il attache des métadonnées à une classe ou une méthode, que le framework relit au démarrage"
  - id: nest-design-paramtypes
    label: "emitDecoratorMetadata fait émettre au compilateur design:paramtypes, la liste des classes des paramètres du constructeur"
  - id: nest-injection-token
    label: "Le jeton d'injection est une valeur qui existe à l'exécution (une classe) : une interface ou un import type ne laisse que Object ou undefined"
glossary:
  - term: "décorateur"
    definition: "Fonction appliquée à une classe, une méthode ou un paramètre au moment où la classe est définie. Nest utilise les décorateurs « legacy » de TypeScript (experimentalDecorators)."
  - term: "reflect-metadata"
    definition: "Bibliothèque qui ajoute Reflect.defineMetadata / getMetadata : un dictionnaire de métadonnées attaché à chaque cible."
  - term: "design:paramtypes"
    definition: "Clé de métadonnée émise par tsc (option emitDecoratorMetadata) : le tableau des constructeurs des paramètres d'une classe décorée."
  - term: "jeton d'injection"
    definition: "La clé sous laquelle le conteneur range un provider : une classe, une chaîne ou un symbole."
visuals: [nest-ch00-di-resolution]
labs: [nest-ch00-l02-lab-mini-injector, nest-ch00-l02-lab-silent-undefined]
extra: true
xp: 30
---

> **En une phrase :** un décorateur n'exécute rien, il **attache** des métadonnées ; tsc écrit pour toi les types du constructeur, et c'est tout ce que Nest lit pour injecter.

## Le problème

Un service fonctionne en local, puis un collègue accepte une « correction automatique » de son éditeur, et l'application refuse de démarrer : « Nest can't resolve dependencies of BooksController (?) ». Le code n'a pas changé de logique ; un seul mot a changé dans un `import`. Pour comprendre ce genre d'erreur, il faut savoir ce que Nest lit réellement.

## Le concept

### Un décorateur attache, il n'exécute pas

Les décorateurs de Nest sont les décorateurs « legacy » de TypeScript (`experimentalDecorators`), pas ceux de la norme ECMAScript. Ce sont de simples fonctions appelées **une fois**, quand la classe est définie. Ils n'enveloppent pas tes méthodes : ils posent des étiquettes.

```ts
import 'reflect-metadata';

function Controller(prefix: string): ClassDecorator {
  return (target) => Reflect.defineMetadata('path', prefix, target);
}

@Controller('books')
class BooksController {}

Reflect.getMetadata('path', BooksController);   // 'books'
```

Les vrais `@Controller`, `@Get` ou `@Injectable` de Nest font la même chose avec d'autres clés. Au démarrage, Nest parcourt les classes déclarées dans tes modules et relit ces étiquettes pour construire les routes et le graphe d'injection. C'est pourquoi une classe non déclarée dans un module n'existe pas : personne ne vient lire ses étiquettes.

### La métadonnée que le compilateur écrit pour toi

Le constructeur annoncé plus haut ne contient que des **types**, et la leçon d'effacement du cours TypeScript l'a montré : les types disparaissent à l'exécution. Comment Nest sait-il alors qu'il faut un `BooksService` ?

Avec l'option `emitDecoratorMetadata`, `tsc` ajoute à chaque classe **décorée** une métadonnée `design:paramtypes` : le tableau des **valeurs** qui correspondent aux types des paramètres du constructeur.

```ts
@Injectable()
class BooksController {
  constructor(private books: BooksService, private clock: Clock) {}
}
// tsc émet en plus, en substance :
// Reflect.metadata('design:paramtypes', [BooksService, Clock])
```

Le conteneur fait alors un travail simple et récursif. Il lit `design:paramtypes`, résout chaque classe (en résolvant d'abord ses propres dépendances), garde chaque instance créée pour la réutiliser, puis appelle `new BooksController(books, clock)`.

::visual{id="nest-ch00-di-resolution"}

Deux conséquences pratiques :

- la classe doit porter **un décorateur**, sinon tsc n'émet rien ; c'est le vrai rôle de `@Injectable()` ;
- l'outil de compilation doit savoir émettre ces métadonnées. `tsc` et SWC le font. La simple suppression de types de Node 24 (`node fichier.ts`) **ne le fait pas** : elle retire les types sans rien générer, et elle refuse en plus la syntaxe des décorateurs. C'est pour cette raison que les labs de ce cours compilent avec `tsc`.

### Le jeton doit exister à l'exécution

Le compilateur ne peut émettre que ce qui existe à l'exécution. Trois cas cassent l'injection :

| Tu écris | tsc émet | Résultat |
|---|---|---|
| `constructor(repo: BooksRepository)` avec une **interface** | `Object` | Nest cherche un provider `Object` : introuvable |
| `import type { BooksService }` puis `constructor(s: BooksService)` | `Object` | même échec, la classe n'est pas importée comme valeur |
| deux fichiers qui s'importent mutuellement | `undefined` | « the argument at index [0] … appears to be undefined at runtime » |

Pour injecter une abstraction, il faut donc un jeton qui existe à l'exécution : une classe abstraite, ou un `@Inject('BOOKS_REPOSITORY')` avec une chaîne ou un symbole (module 02).

## Sous le capot

Ce que tsc génère pour `@Injectable() class Shop { constructor(clock: Clock) {} }` avec `emitDecoratorMetadata` : un appel `__decorate([Injectable(), __metadata("design:paramtypes", [Clock])], Shop)`. Deux choses en découlent :

- `@Injectable()` pose la marque `__injectable__` sur la classe ; mais surtout, sa **présence** fait écrire `design:paramtypes`. Une classe sans aucun décorateur n'a pas de `design:paramtypes` : Nest croit son constructeur sans paramètre, l'appelle sans argument, et les dépendances valent `undefined`, **sans erreur au démarrage**. C'est le TP de débogage de cette leçon.
- `[Clock]` est évalué au chargement du fichier. Si `Clock` vient d'un `import type`, tsc écrit `Object` ; si `Clock` n'est pas encore défini (import circulaire), la valeur est `undefined`. Dans les deux cas, l'injecteur ne trouve pas de jeton utilisable.

## En production

- Ces erreurs ne viennent jamais de la logique : quand une dépendance vaut `undefined`, vérifie d'abord le décorateur, puis l'`import`, puis les cycles.
- Configure le linter pour qu'il **ne transforme pas** en `import type` les imports utilisés comme types de paramètres de constructeur dans les classes décorées (`consistent-type-imports` avec les options adaptées, ou `verbatimModuleSyntax` + revue).

## Pièges fréquents

- **`import type` sur une classe injectée.** Certains linters le proposent automatiquement (« ce symbole n'est utilisé que comme type ») : pour Nest, c'est faux, la classe sert de jeton.
- **Injecter une interface.** TypeScript accepte, Nest échoue au démarrage. Le message parle d'`Object`.
- **Oublier `@Injectable()` sur une classe qui a des dépendances.** Sans décorateur, pas de `design:paramtypes`, et Nest ne sait pas quoi passer au constructeur.
- **Oublier `import 'reflect-metadata'`.** Nest l'importe lui-même, mais un script qui lit des métadonnées avant de charger Nest doit l'importer en premier.

## À retenir

- Un décorateur pose des métadonnées ; Nest les relit au démarrage pour construire routes et dépendances.
- `emitDecoratorMetadata` traduit les **types** des paramètres en **valeurs** (`design:paramtypes`), ce qui rend l'injection par type possible.
- Un jeton d'injection doit exister à l'exécution : interfaces et `import type` donnent `Object`, un import circulaire donne `undefined`.
- La suppression de types de Node ne suffit pas pour Nest : il faut un compilateur qui émet ces métadonnées (tsc, SWC).
