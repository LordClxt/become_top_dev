---
id: nest-ch01-l02
title: "Paramètres, conversion et validation à l'entrée"
source: { chapter: 3, pages: "#route-parameters", url: "https://docs.nestjs.com/controllers#route-parameters" }
duration_min: 30
concepts:
  - id: nest-param-decorators
    label: "@Param, @Query, @Body et @Headers extraient une partie de la requête ; avec un nom, ils n'en extraient qu'une clé"
  - id: nest-strings-from-url
    label: "Tout ce qui vient de l'URL (paramètres, query) est une chaîne : le type TypeScript annoncé ne convertit rien"
  - id: nest-parse-pipes
    label: "Les pipes ParseIntPipe, DefaultValuePipe, ParseUUIDPipe… convertissent ou rejettent (400) avant que le handler ne s'exécute"
  - id: nest-schema-validation
    label: "@Body({ schema }) attache un schéma Standard Schema (Zod…) ; StandardSchemaValidationPipe le fait respecter"
glossary:
  - term: "pipe"
    definition: "Classe qui transforme ou valide un argument de handler avant son exécution. Elle lève une exception (400 par défaut) si l'entrée est invalide."
  - term: "DTO"
    definition: "Data Transfer Object : la forme attendue d'un corps ou d'une query. Dans Nest, une classe ou un schéma, jamais une simple interface."
  - term: "Standard Schema"
    definition: "Interface commune (~standard) implémentée par Zod, Valibot, ArkType… Nest 12 sait valider n'importe quel schéma qui la respecte."
visuals: []
labs: [nest-ch01-l02-lab-search-params]
extra: false
xp: 30
---

## Pourquoi c'est important

Le contrôleur est la frontière de ton système. Tout ce qui la traverse est **hostile jusqu'à preuve du contraire** : des chaînes là où tu attends des nombres, des champs en trop, des champs manquants, des valeurs absurdes. Un `limit=1000000` mal contrôlé, et c'est ta base de données qui tombe. Valider tôt, au bord, permet au reste du code de faire confiance à ses arguments.

## Le concept

### Extraire

```ts
@Get(':isbn/reviews')
findReviews(
  @Param('isbn') isbn: string,                 // /books/:isbn/reviews
  @Query('sort') sort: string | undefined,     // ?sort=recent
  @Headers('accept-language') lang?: string,
) {}

@Post()
create(@Body() body: CreateBookDto) {}         // tout le corps JSON
```

Sans argument, `@Param()`, `@Query()` et `@Body()` renvoient l'objet entier ; avec un nom, une seule clé. Il existe aussi `@Ip()`, `@HostParam()` et `@Cookies()`, ainsi que `@Req()` pour l'objet requête brut, à éviter tant qu'un décorateur précis existe.

### Le piège : tout est chaîne

```ts
@Get()
list(@Query('page') page: number) {
  return page + 1;        // ?page=2 → "21"
}
```

L'annotation `number` est un **type**, et les types sont effacés. Express te donne `'2'`, une chaîne, et TypeScript ne le sait pas. La concaténation `'2' + 1` donne `'21'`. C'est une erreur que le compilateur ne peut pas voir, puisque l'information n'existe qu'à l'exécution.

### Convertir avec des pipes

Un **pipe** s'exécute juste avant le handler. Il transforme l'argument ou le rejette :

```ts
@Get()
list(
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,   // absent → 1 ; 'abc' → 400
  @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
) {}

@Get(':id')
findOne(@Param('id', ParseUUIDPipe) id: string) {}                       // pas un UUID → 400
```

Les pipes s'appliquent dans l'ordre : `DefaultValuePipe` remplace `undefined`, puis `ParseIntPipe` convertit. Nest fournit aussi `ParseFloatPipe`, `ParseBoolPipe`, `ParseArrayPipe` et `ParseEnumPipe`. En cas d'échec, le client reçoit `400 Bad Request`. Un pipe vérifie le **format**. Une règle métier comme « `limit` ≤ 50 » reste dans ton code, sous la forme d'une `BadRequestException`.

### Valider un corps avec un schéma

Un corps JSON est plus riche qu'un paramètre : plusieurs champs, des types, des contraintes. Nest 12 accepte directement un schéma **Standard Schema** (Zod ici) :

```ts
const CreateBook = z.object({
  isbn: z.string().regex(/^97[89]-\d{10}$/),
  title: z.string().min(1),
  year: z.number().int().min(1450),
});
type CreateBook = z.infer<typeof CreateBook>;   // le type se déduit du schéma

@Post()
create(@Body({ schema: CreateBook }) body: CreateBook) {}
```

Le décorateur se contente d'**attacher** le schéma. C'est `StandardSchemaValidationPipe`, enregistré globalement, qui l'applique :

```ts
app.useGlobalPipes(new StandardSchemaValidationPipe());
```

Un corps invalide reçoit alors `400` avec la liste des problèmes (`"title: Too small…"`). Un corps valide arrive **déjà typé et nettoyé** : par défaut, la valeur transmise est celle que produit le schéma, sans les champs inconnus. L'ancienne approche (`ValidationPipe` + classes décorées par `class-validator`) reste supportée ; le module 05 compare les deux.

### Pourquoi pas une interface ?

Les DTO sont des classes ou des schémas, **jamais** des interfaces, pour la même raison qu'à l'injection : une interface n'existe pas à l'exécution, donc aucun pipe ne peut s'en servir pour valider.

## Pièges fréquents

- **Croire que `page: number` convertit.** C'est une chaîne tant qu'aucun pipe ne la convertit.
- **Accepter n'importe quel `limit`.** Plafonne-le : c'est ta base qui paie les requêtes énormes.
- **Attacher un schéma sans enregistrer le pipe.** `@Body({ schema })` seul ne valide rien.
- **Valider des règles métier dans un pipe générique.** Le format dans le pipe, la règle (« ce livre est épuisé ») dans le service.

## À retenir

- Tout ce qui vient de l'URL est une chaîne ; les annotations de type ne convertissent rien.
- Les pipes convertissent ou rejettent avec 400 avant le handler ; `DefaultValuePipe` gère l'absence.
- `@Body({ schema })` + `StandardSchemaValidationPipe` : un corps validé et typé par un seul schéma.
- Plafonne ce qui coûte cher (`limit`) : la validation est aussi une protection.
