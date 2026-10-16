---
id: nest-ch00-l01
title: "Nest : une architecture au-dessus d'Express"
source: { chapter: 2, pages: "#setup", url: "https://docs.nestjs.com/first-steps" }
duration_min: 25
concepts:
  - id: nest-building-blocks
    label: "Les trois briques : un module regroupe des contrôleurs (entrées HTTP) et des providers (logique injectable)"
  - id: nest-ioc-container
    label: "Le conteneur d'injection crée les providers une seule fois (singletons) et les passe aux constructeurs qui les demandent"
  - id: nest-testing-module
    label: "Test.createTestingModule compile le même graphe de modules qu'en production, sans ouvrir de port"
glossary:
  - term: "module"
    definition: "Classe décorée par @Module() qui déclare ses contrôleurs, ses providers, ce qu'elle importe et ce qu'elle exporte."
  - term: "provider"
    definition: "Classe (ou valeur) gérée par le conteneur de Nest et injectable dans d'autres classes. Un service est le cas le plus courant."
  - term: "inversion de contrôle (IoC)"
    definition: "Ce n'est plus ton code qui fait `new`, c'est le framework qui construit les objets et fournit leurs dépendances."
visuals: []
labs: [nest-ch00-l01-lab-first-feature]
extra: false
xp: 25
---

## Pourquoi c'est important

Express te donne un routeur et des middlewares, puis te laisse seul face aux vraies questions : où mettre la logique métier, comment partager une connexion à la base, comment tester un contrôleur sans démarrer un serveur. Chaque équipe y répond à sa façon, et deux projets Express se ressemblent rarement.

Nest répond à ces questions une fois pour toutes, avec une architecture inspirée d'Angular. Il ne remplace pas Express : il s'installe **au-dessus**, par l'intermédiaire d'un adaptateur. Express est l'adaptateur par défaut, Fastify est l'autre option officielle. L'API de la plateforme reste accessible quand tu en as besoin. Tu gagnes une structure commune et un conteneur d'injection. En échange, il faut accepter une contrainte : déclarer ce que tu fabriques.

## Le concept

### Trois briques

Une application Nest est un **graphe de modules**. Chaque module déclare :

- des **contrôleurs**, les points d'entrée : ils traduisent une requête HTTP en appel de méthode ;
- des **providers**, la logique : services, dépôts, clients… Nest les instancie et les injecte ;
- ce qu'il **importe** (d'autres modules) et ce qu'il **exporte** (les providers qu'il partage).

```ts
@Injectable()
export class BooksService {
  private readonly books = [{ id: 1, title: 'Germinal' }];
  findAll() {
    return this.books;
  }
}

@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Get()
  findAll() {
    return this.books.findAll();   // un objet ou un tableau est renvoyé en JSON, statut 200
  }
}

@Module({ controllers: [BooksController], providers: [BooksService] })
export class BooksModule {}
```

Le contrôleur ne fait jamais `new BooksService()`. Il **demande** un `BooksService` dans son constructeur, et le conteneur le lui fournit. C'est l'inversion de contrôle : le framework construit les objets, ton code se contente de décrire ce dont il a besoin.

### Le démarrage

`main.ts` crée l'application à partir du module racine :

```ts
const app = await NestFactory.create(AppModule);
await app.listen(process.env.PORT ?? 3000);
```

`NestFactory.create` parcourt le graphe en partant d'`AppModule` : il instancie chaque provider **une seule fois**, puis enregistre les routes de chaque contrôleur auprès de l'adaptateur HTTP. Si une dépendance manque, le démarrage échoue tout de suite, avant de servir la moindre requête. Par défaut, Nest affiche l'erreur et quitte le processus. L'option `abortOnError: false` lui fait lever l'erreur à la place, ce qui est pratique dans un script ou un test.

### Des singletons, et c'est voulu

Un provider est un **singleton** : tous ceux qui l'injectent reçoivent la même instance. Si tu viens de Java ou de PHP, où chaque requête vit souvent dans son propre fil ou processus, ça peut inquiéter. En Node, un seul fil traite toutes les requêtes, à tour de rôle. Partager une instance n'expose donc pas à des écritures concurrentes au sens des threads. Le vrai risque est ailleurs : y ranger un état **propre à une requête** (l'utilisateur courant, par exemple), qui fuirait alors vers les requêtes suivantes. Le module 02 présente les alternatives (portée REQUEST, AsyncLocalStorage).

### Tester le vrai graphe

`@nestjs/testing` compile le même graphe de modules qu'en production, sans ouvrir de port :

```ts
const moduleRef = await Test.createTestingModule({ imports: [BooksModule] }).compile();
const app = moduleRef.createNestApplication();
await app.init();                                     // enregistre les routes, sans listen()

const res = await request(app.getHttpServer()).get('/books');   // supertest
```

`moduleRef.get(BooksService)` renvoie l'instance que le conteneur a créée : tu peux l'inspecter, ou la remplacer avec `overrideProvider` (module 04). Ce test est rapide (aucun port, aucun réseau) et il vérifie le câblage réel. C'est le format de tous les labs de ce cours.

## Pièges fréquents

- **Oublier de déclarer.** Une classe décorée par `@Controller()` mais absente de `controllers` n'existe pas pour Nest : ses routes renvoient 404, sans aucune erreur au démarrage.
- **Faire `new` soi-même.** `new BooksService()` dans un contrôleur crée une seconde instance, que personne d'autre ne partage. Les tests ne peuvent plus la remplacer.
- **Mettre un état de requête dans un singleton.** Un champ `currentUser` sur un service est partagé par toutes les requêtes.
- **Croire que `init()` écoute.** `app.init()` prépare l'application sans ouvrir de port. Seul `listen()` démarre le serveur HTTP.

## À retenir

- Nest = une architecture (modules, contrôleurs, providers) et un conteneur d'injection au-dessus d'Express ou de Fastify.
- Un contrôleur reçoit ses dépendances par son constructeur ; il ne les fabrique pas.
- Les providers sont des singletons : ils partagent volontiers des ressources, jamais un état de requête.
- `Test.createTestingModule` + `app.init()` + supertest testent le vrai câblage sans réseau.
