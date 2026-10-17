---
id: nest-ch01-l01
title: "Routes et réponses"
source: { chapter: 3, pages: "#routing", url: "https://docs.nestjs.com/controllers#routing" }
duration_min: 30
concepts:
  - id: nest-route-decorators
    label: "Le chemin d'une route = préfixe du contrôleur + chemin du décorateur de méthode (@Get, @Post, @Put, @Patch, @Delete…)"
  - id: nest-status-codes
    label: "Statut par défaut : 200 (201 pour POST) ; @HttpCode le change, une HttpException (NotFoundException…) produit l'erreur"
  - id: nest-standard-response
    label: "Réponse standard : Nest sérialise la valeur renvoyée ; @Res() la désactive, sauf avec passthrough: true"
  - id: nest-rest-semantics
    label: "Sémantique REST : créer = 201 + Location, supprimer = 204 sans corps, ressource absente = 404"
glossary:
  - term: "réponse standard"
    definition: "Mode par défaut : tu renvoies une valeur (objet, tableau, promesse, Observable), Nest l'envoie en JSON avec le bon statut."
  - term: "passthrough"
    definition: "Option de @Res() qui te donne l'objet réponse de la plateforme (pour un en-tête, un cookie) tout en laissant Nest envoyer la valeur renvoyée."
  - term: "HttpException"
    definition: "Exception que Nest transforme en réponse HTTP. Ses sous-classes (NotFoundException, ConflictException…) fixent le statut."
visuals: []
labs: [nest-ch01-l01-lab-warmup-404, nest-ch01-l01-lab-catalog-crud]
extra: false
xp: 30
---

> **En une phrase :** un handler **renvoie** une valeur et **lève** une exception ; Nest en fait la réponse HTTP, à condition de ne pas reprendre la main avec `@Res()`.

## Le problème

L'application mobile de la librairie affiche « Livre ajouté ! » même quand l'ajout a échoué, et une fiche vide quand on ouvre un livre supprimé. Le développeur mobile explique : « Votre API répond 200 dans tous les cas. Pour un livre absent, je reçois 200 et un corps vide ; je ne peux pas savoir. »

Le contrat d'une API, ce sont d'abord ses routes et ses **codes de statut**. Nest rend la bonne réponse facile à écrire ; il reste à savoir laquelle est bonne, et à éviter le raccourci `@Res()`, qui casse silencieusement une partie du framework.

## Le concept

### Préfixe + chemin = route

```ts
@Controller('books')                    // préfixe
export class BooksController {
  @Get()           findAll() {}         // GET    /books
  @Get(':isbn')    findOne() {}         // GET    /books/:isbn
  @Post()          create() {}          // POST   /books
  @Put(':isbn')    replace() {}         // PUT    /books/:isbn
  @Patch(':isbn')  update() {}          // PATCH  /books/:isbn
  @Delete(':isbn') remove() {}          // DELETE /books/:isbn
}
```

Le nom de la méthode n'a aucune importance pour le routage : seul compte le décorateur. Il existe aussi `@All()`, `@Options()`, `@Head()`, ainsi que `@Search()` et `@QueryMethod()` pour la méthode HTTP QUERY, une requête de lecture qui accepte un corps.

### La réponse standard

Tu **renvoies** une valeur, Nest l'envoie :

- objet ou tableau → JSON ; chaîne ou nombre → envoyé tel quel ;
- `Promise` → Nest attend sa résolution ; `Observable` → Nest envoie la dernière valeur émise quand le flux se termine ;
- statut 200, sauf POST qui donne 201 ; `@HttpCode(204)` le remplace.

```ts
@Delete(':isbn')
@HttpCode(204)
remove(@Param('isbn') isbn: string): void {
  this.books.remove(isbn);              // 204 : pas de corps
}
```

`@Header('Cache-Control', 'no-store')` ajoute un en-tête **fixe**. `@Redirect(url, code)` redirige ; si la méthode renvoie `{ url, statusCode }`, ces valeurs écrasent celles du décorateur.

### Les erreurs : lever, pas renvoyer

Pour une ressource absente, lève une `HttpException` :

```ts
@Get(':isbn')
findOne(@Param('isbn') isbn: string) {
  const book = this.books.find(isbn);
  if (!book) throw new NotFoundException(`Livre ${isbn} introuvable`);
  return book;
}
```

Nest intercepte l'exception et répond `404` avec un corps `{ statusCode, message, error }`. Renvoyer `undefined` donnerait un 200 au corps vide : le pire des contrats. Le module 03 montre comment uniformiser ces erreurs (filtres, codes d'erreur machine).

### Le piège `@Res()`

Tu peux injecter l'objet réponse d'Express avec `@Res()` et tout faire à la main :

```ts
@Post()
create(@Body() dto: CreateBookDto, @Res() res: Response) {
  res.status(201).json(this.books.create(dto));   // style Express
}
```

Mais dès que `@Res()` apparaît, **Nest désactive la réponse standard pour cette route**. Ce que tu renvoies est ignoré, les intercepteurs qui transforment la réponse ne voient plus rien, et si tu oublies `res.json()`, la requête reste pendante jusqu'au timeout. Le code devient aussi lié à Express : il ne fonctionnera plus avec Fastify.

Quand tu as seulement besoin de toucher la réponse (un en-tête **dynamique**, un cookie), utilise `passthrough` :

```ts
@Post()
create(@Body() dto: CreateBookDto, @Res({ passthrough: true }) res: Response) {
  const book = this.books.create(dto);
  res.location(`/books/${book.isbn}`);   // en-tête Location calculé
  return book;                           // Nest envoie toujours la réponse : 201 + JSON
}
```

### Un contrat REST minimal

| Opération | Succès | Échec typique |
|---|---|---|
| lister `GET /books` | 200 + tableau (vide si aucun) | — |
| lire `GET /books/:id` | 200 + ressource | 404 |
| créer `POST /books` | 201 + ressource + `Location` | 400 (invalide), 409 (existe déjà) |
| remplacer `PUT /books/:id` | 200 + ressource | 404 |
| supprimer `DELETE /books/:id` | 204 sans corps | 404 |

## Sous le capot

Ce que Nest fait de ta valeur de retour (`@nestjs/core`, `router/router-execution-context.js` et `router-response-controller.js`) :

1. Au démarrage, il regarde les paramètres du handler. S'il y trouve `@Res()` ou `@Next()` **sans** `passthrough`, il marque la route « réponse gérée à la main » (`isResponseHandled`).
2. À chaque requête, il appelle ta méthode. Si le résultat est un `Observable`, il attend sa **dernière** valeur (`lastValueFrom`) ; si c'est une promesse, il l'attend.
3. Si la route n'est pas « gérée à la main », il envoie le résultat avec le statut prévu : celui de `@HttpCode`, sinon `201` pour `POST` et `200` pour le reste (`getStatusByMethod`).

Tout le comportement de `@Res()` découle de l'étape 1 : Nest ne regarde même plus ce que tu renvoies. Et comme les intercepteurs travaillent sur la valeur renvoyée, ils n'ont plus rien à transformer.

## En production

- Les clients (applications, partenaires) codent contre tes statuts. Changer un 200 en 201 est une **rupture de contrat** : documente-le et versionne si besoin (leçon 4).
- Un 404 sur une ressource absente permet aussi au cache HTTP et aux outils de supervision de faire leur travail : un 200 vide est compté comme un succès dans tes tableaux de bord.

## Pièges fréquents

- **Renvoyer `undefined` pour « introuvable ».** Le client reçoit 200 ; lève `NotFoundException`.
- **`@Res()` sans `passthrough`.** La valeur renvoyée est ignorée, et un oubli de `send` laisse la requête pendante.
- **Oublier `@HttpCode(204)` sur une suppression.** Tu renvoies 200 avec un corps vide ; ce n'est pas faux, mais le contrat n'est plus explicite.
- **Un en-tête dynamique avec `@Header`.** `@Header` est évalué une seule fois, à la définition de la classe : sa valeur est fixe. Pour une valeur calculée, il faut `passthrough`.

## À retenir

- Route = préfixe du contrôleur + chemin du décorateur ; le nom de la méthode ne compte pas.
- Renvoie des valeurs ; lève des `HttpException` pour les erreurs.
- POST = 201 par défaut ; `@HttpCode` pour 204 et les autres cas.
- `@Res({ passthrough: true })` pour un en-tête ou un cookie ; jamais `@Res()` seul sans raison forte.
