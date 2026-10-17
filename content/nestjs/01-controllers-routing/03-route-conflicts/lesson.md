---
id: nest-ch01-l03
title: "L'ordre des routes et les conflits"
source: { chapter: 3, pages: "#route-conflicts-and-resolution-order", url: "https://docs.nestjs.com/controllers#route-conflicts-and-resolution-order" }
duration_min: 25
concepts:
  - id: nest-route-order
    label: "Sur Express, la première route enregistrée qui correspond gagne : ':id' déclaré avant 'featured' le masque"
  - id: nest-route-conflict-policy
    label: "routeConflictPolicy signale (warn) ou refuse (error) au démarrage les routes en double et les routes masquées"
  - id: nest-route-specificity
    label: "routeResolutionStrategy: 'specificity' enregistre les segments littéraux avant les paramètres, puis les wildcards"
glossary:
  - term: "route masquée (shadowed)"
    definition: "Route qui ne peut jamais répondre, parce qu'une route enregistrée avant elle correspond à toutes ses requêtes."
  - term: "wildcard"
    definition: "Segment qui correspond au reste du chemin. Nest 12 suit Express 5 : `*path` (nommé), ou `{*path}` pour accepter aussi le chemin vide."
  - term: "find-my-way"
    definition: "Routeur de Fastify : il classe les routes par spécificité, quel que soit l'ordre de déclaration."
visuals: [nest-ch01-route-matcher]
labs: [nest-ch01-l03-lab-shadowed-route]
extra: false
xp: 25
---

> **En une phrase :** Express essaie les routes dans l'ordre où elles sont enregistrées ; une route paramétrée déclarée trop tôt avale les autres, sans erreur.

## Le problème

Tu ajoutes `GET /books/featured`. Les tests unitaires du service passent, la revue de code aussi. En production, `/books/featured` répond « Livre featured introuvable ». Le bug n'est ni dans le service ni dans le contrôleur : il est dans **l'ordre** des méthodes. Il ne casse rien au démarrage, ne lève aucune exception, et peut survivre des mois. Nest 12 sait le détecter, encore faut-il le lui demander.

## Le concept

### La première route qui correspond gagne

Nest enregistre les routes dans l'ordre de déclaration. Express, lui, parcourt sa liste dans l'ordre et s'arrête à la **première** correspondance :

```ts
@Controller('books')
export class BooksController {
  @Get(':isbn')    findOne() {}     // enregistrée en premier
  @Get('featured') featured() {}    // ne répondra jamais
}
```

`GET /books/featured` correspond à `:isbn` (avec `isbn = 'featured'`). La seconde route est **masquée**. Tu peux le vérifier dans l'atelier ci-dessous.

::visual{id="nest-ch01-route-matcher"}

Fastify ne connaît pas ce problème : son routeur (find-my-way) classe toujours les routes de la plus précise à la plus générale. Un même contrôleur peut donc se comporter différemment selon l'adaptateur, ce qui est une autre raison de rendre le comportement explicite.

### Détecter : `routeConflictPolicy`

```ts
const app = await NestFactory.create(AppModule, {
  routeConflictPolicy: { duplicate: 'error', shadow: 'error' },
});
```

Deux familles de conflits, chacune réglable à `'off'` (défaut), `'warn'` (un log) ou `'error'` (le démarrage échoue) :

- **duplicate** : la même méthode et le même chemin, déclarés deux fois (souvent dans deux contrôleurs différents) ;
- **shadow** : une route que la précédente rend inaccessible.

Le message est explicite : `Route GET /books/featured (BooksController#featured) is shadowed by GET /books/:isbn (BooksController#findOne)`. En mode `'error'`, l'erreur part **au démarrage** : un test e2e qui démarre l'application suffit à protéger la CI.

### Corriger : `routeResolutionStrategy`

Réordonner les méthodes à la main fonctionne, mais le premier refactoring venu (un tri alphabétique, un déplacement de code) peut recasser l'ordre. La stratégie `'specificity'` règle le problème une fois pour toutes :

```ts
NestFactory.create(AppModule, { routeResolutionStrategy: 'specificity' });
```

Sur Express, Nest enregistre alors d'abord les segments **littéraux** (`featured`), puis les **paramètres** (`:isbn`), puis les **wildcards** (`*path`). L'ordre de déclaration ne compte plus.

Une nuance à connaître : un wildcard recouvre **par nature** les routes plus précises. Même placé en dernier, `GET /books/*path` reste signalé comme partiellement masqué par `featured` et `:isbn`. Si tu en as un (un fallback, une page 404 personnalisée), garde `shadow: 'warn'` plutôt que `'error'`.

### Les wildcards en Nest 12

Nest suit la syntaxe d'Express 5 : un wildcard **porte un nom**, `*path`, et ne correspond qu'à au moins un segment. `{*path}` accepte en plus le chemin vide. L'astérisque nu `*` est déprécié.

## Sous le capot

Nest parcourt les méthodes d'un contrôleur dans l'ordre de déclaration et les enregistre une à une auprès d'Express, qui les essaie dans ce même ordre. D'où « la première qui correspond gagne ».

Avec `routeResolutionStrategy: 'specificity'`, Nest trie d'abord les routes (`router/route-specificity-sorter.js`). Il compare les chemins segment par segment : un segment littéral (`featured`) est plus spécifique qu'un paramètre (`:isbn`), lui-même plus spécifique qu'un wildcard (`*path`), et un segment absent l'est encore moins. À égalité, l'ordre de déclaration est conservé. Les routes sont ensuite enregistrées dans ce nouvel ordre.

`routeConflictPolicy`, lui, s'appuie sur un détecteur (`route-conflict-detector.js`) qui découpe chaque chemin en segments et cherche les doublons exacts et les routes masquées. Quand le tri par spécificité est actif, il retire de la liste les masquages que le tri a déjà résolus.

## En production

- Active `routeConflictPolicy` en **erreur** dans les tests et en CI : un conflit doit casser le build, pas apparaître en production.
- Le tri par spécificité rend l'ordre des méthodes sans importance, ce qui évite qu'une simple réorganisation du fichier change le comportement de l'API.

## Pièges fréquents

- **Une route paramétrée déclarée trop tôt.** Le symptôme : un 404 « ressource introuvable » sur une route littérale qui existe.
- **Un doublon entre deux contrôleurs.** Un `AdminController` qui redéclare `GET /books/stats` : la seconde ne répond jamais.
- **Laisser la politique à `'off'`.** C'est le défaut, pour la compatibilité. Pour un nouveau projet, active au moins `duplicate: 'error'`.
- **Tester les routes une par une avec un module minimal.** Le conflit n'apparaît que quand tous les contrôleurs sont chargés : teste l'application complète.

## À retenir

- Express prend la première route qui correspond ; l'ordre de déclaration compte.
- `routeConflictPolicy` rend les doublons et les masquages visibles au démarrage (`warn` ou `error`).
- `routeResolutionStrategy: 'specificity'` : littéraux, puis paramètres, puis wildcards.
- Un test qui démarre l'application complète avec la politique en `error` protège la CI.
