---
id: nest-ch01-l04
title: "Versionner une API et organiser ses préfixes"
source: { chapter: 50, pages: "#uri-versioning-type", url: "https://docs.nestjs.com/http/versioning#uri-versioning-type" }
duration_min: 25
concepts:
  - id: nest-versioning
    label: "enableVersioning (URI, en-tête, media type ou fonction) ; @Controller({ version }) et @Version() choisissent la version d'une route"
  - id: nest-default-version
    label: "Une route sans version reste servie sans version ; avec defaultVersion, elle passe sous cette version (/v1/…) ; VERSION_NEUTRAL la garde hors version dans tous les cas"
  - id: nest-global-prefix
    label: "setGlobalPrefix préfixe toutes les routes, sauf celles listées dans exclude (sondes de santé, webhooks)"
  - id: nest-router-module
    label: "RouterModule préfixe toutes les routes d'un module (et de ses enfants), sans répéter le chemin dans chaque contrôleur"
glossary:
  - term: "versioning d'API"
    definition: "Servir plusieurs contrats d'une même ressource en parallèle (v1, v2), pour faire évoluer l'API sans casser les clients existants."
  - term: "breaking change"
    definition: "Modification qui casse un client existant : champ supprimé ou renommé, type changé, statut différent."
  - term: "VERSION_NEUTRAL"
    definition: "Constante de Nest : la route répond quelle que soit la version demandée, et même sans version."
visuals: []
labs: [nest-ch01-l04-lab-api-versions]
extra: false
xp: 25
---

## Pourquoi c'est important

Une API publique a des clients que tu ne contrôles pas : applications mobiles jamais mises à jour, scripts de partenaires, intégrations oubliées. Le jour où `GET /books` doit renvoyer `{ items, total }` au lieu d'un tableau, tu ne peux pas casser tout le monde. Le versioning permet de servir v1 et v2 côte à côte, puis de retirer v1 quand plus personne ne l'appelle. Le préfixe global, lui, sépare l'API du reste : sondes, webhooks, pages statiques.

## Le concept

### Activer le versioning

```ts
app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
```

Quatre façons de transmettre la version :

| Type | La version est lue dans | Exemple |
|---|---|---|
| `URI` | le chemin (préfixe `v` ajouté) | `/v2/books` |
| `HEADER` | un en-tête que tu nommes | `Custom-Header: 2` |
| `MEDIA_TYPE` | l'en-tête `Accept` | `Accept: application/json;v=2` |
| `CUSTOM` | une fonction `extractor(request)` | ce que tu veux |

L'URI est la plus lisible : elle apparaît dans les logs, se partage par simple copier-coller et passe dans les caches HTTP sans réglage particulier. Les en-têtes gardent des URL stables, mais il faut configurer chaque cache et chaque proxy pour qu'il les prenne en compte.

### Déclarer les versions

```ts
@Controller({ path: 'books', version: '1' })
export class BooksV1Controller {
  @Get() findAll() { return this.books.findAll(); }                 // GET /v1/books → tableau
}

@Controller({ path: 'books', version: '2' })
export class BooksV2Controller {
  @Get() findAll() { return { items: this.books.findAll(), total: this.books.count() }; }  // GET /v2/books
}
```

`@Version('2')` sur une méthode l'emporte sur la version du contrôleur. `version: ['1', '2']` sert une même route sous plusieurs versions : c'est utile quand une seule route a changé.

### Le piège de la version par défaut

Sans `defaultVersion`, une route **sans version** reste servie sans version : `/health` répond toujours, mais `/v1/health` n'existe pas. C'est souvent ce qu'on veut… jusqu'au jour où l'on ajoute `defaultVersion: '1'` pour que les anciennes routes deviennent la v1. Ta sonde de santé devient alors `/v1/health`, et l'orchestrateur qui interroge `/health` conclut que l'application est morte. La solution est `VERSION_NEUTRAL`, qui garde la route hors version quelle que soit la configuration :

```ts
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {}       // /health, sans version
```

### Le préfixe global

```ts
app.setGlobalPrefix('api', { exclude: ['health'] });
// GET /api/v1/books, GET /api/v2/books, mais GET /health
```

Le préfixe s'ajoute **avant** la version. `exclude` accepte des chemins (avec des wildcards nommés, `health/{*splat}`) ou des objets `{ path, method }`. On y met typiquement les sondes de santé, les webhooks entrants dont l'URL est fixée chez un partenaire, et les fichiers statiques. `setGlobalPrefix(['api', 'v1'])` sert les mêmes routes sous plusieurs préfixes. Attention : Swagger ne documente que le premier.

### Préfixer un module : `RouterModule`

```ts
@Module({
  imports: [
    AdminModule,
    RouterModule.register([{ path: 'admin', module: AdminModule, children: [{ path: 'reports', module: ReportsModule }] }]),
  ],
})
export class AppModule {}
```

Tous les contrôleurs d'`AdminModule` passent sous `/admin`, et ceux de `ReportsModule` sous `/admin/reports`. C'est pratique pour un espace d'administration, mais à utiliser avec parcimonie : le chemin d'une route n'est plus lisible dans son contrôleur.

### Quand créer une v2 ?

Seulement pour un **breaking change** : champ supprimé ou renommé, type changé, enveloppe de réponse différente, statut différent. Ajouter un champ optionnel n'en est pas un, si les clients ignorent les champs inconnus (ce qu'il faut leur demander). Chaque version servie est du code à maintenir et à tester. Mesure qui appelle encore v1 avant de la retirer.

## Pièges fréquents

- **Ajouter `defaultVersion` sans relire les routes non versionnées.** Elles changent toutes de chemin d'un coup (`/health` → `/v1/health`).
- **Versionner la sonde de santé.** `VERSION_NEUTRAL`, et exclusion du préfixe global.
- **Deux contrôleurs `books` sans version.** Sans versioning, c'est un doublon : la seconde route ne répond jamais.
- **Créer une v2 pour un ajout.** Un champ optionnel en plus ne justifie pas une nouvelle version.

## À retenir

- `enableVersioning` + `version` sur le contrôleur ou la méthode ; l'URI est le choix le plus simple à exploiter.
- `defaultVersion` range les routes non versionnées sous une version ; `VERSION_NEUTRAL` protège celles qui ne doivent jamais l'être.
- Préfixe global avant la version, et `exclude` pour les sondes et les webhooks.
- Une nouvelle version seulement pour un breaking change.
