---
id: nest-ch02-l03
title: "Modules dynamiques"
source: { chapter: 14, pages: "#dynamic-module-use-case, #community-guidelines, #configurable-module-builder, #extra-options", url: "https://docs.nestjs.com/fundamentals/dynamic-modules" }
duration_min: 40
concepts:
  - id: nest-dynamic-module
    label: "Une méthode statique renvoie un DynamicModule ({ module, providers, exports… }) dont les métadonnées s'ajoutent à celles de @Module"
  - id: nest-register-forroot
    label: "register = une configuration par module importateur ; forRoot = une seule fois, partagée ; forFeature = ajuste forRoot ; chacun a sa variante Async"
  - id: nest-configurable-module-builder
    label: "ConfigurableModuleBuilder génère register/registerAsync et MODULE_OPTIONS_TOKEN ; registerAsync accepte useFactory + inject, useClass ou useExisting"
  - id: nest-module-extras
    label: "setExtras ajoute des options de comportement du module (isGlobal) qui ne sont pas injectées dans MODULE_OPTIONS_TOKEN"
glossary:
  - term: "module dynamique"
    definition: "Un module dont les métadonnées sont calculées à l'import, à partir d'options passées par le module qui l'importe."
  - term: "MODULE_OPTIONS_TOKEN"
    definition: "Le jeton, généré par ConfigurableModuleBuilder, sous lequel les options du module sont injectables."
  - term: "extra"
    definition: "Une option qui modifie la définition du module (par ex. global) sans être transmise à ses providers."
visuals: []
labs: [nest-ch02-l03-lab-id-generator]
extra: false
xp: 35
---

> **En une phrase :** un module dynamique est un module qu'on configure au moment de l'importer, comme on passe des arguments à une fonction.

## Le problème

Les identifiants publics de la librairie portent un préfixe : `usr_1` pour un utilisateur, `ord_1` pour une commande. La logique de génération est la même ; seul le préfixe change.

Avec ce qu'on sait, il faudrait un `UserIdGenerator` et un `OrderIdGenerator` presque identiques. Ou bien un module qu'on importe **avec un paramètre** :

```ts
@Module({ imports: [IdGeneratorModule.register({ prefix: 'usr' })], providers: [UsersService] })
export class UsersModule {}

@Module({ imports: [IdGeneratorModule.register({ prefix: 'ord' })], providers: [OrdersService] })
export class OrdersModule {}
```

Tu utilises déjà ce mécanisme sans le savoir : `ConfigModule.forRoot()`, `DrizzleModule.forRootAsync()`, `HttpClientModule.register()`.

## Étape 1 — ce que renvoie `register()`

`register` est une simple méthode statique. Elle renvoie un objet qui ressemble aux métadonnées de `@Module`, plus une propriété `module` qui désigne la classe :

```ts
export const ID_OPTIONS = Symbol('ID_OPTIONS');

@Module({ providers: [IdGenerator], exports: [IdGenerator] })
export class IdGeneratorModule {
  static register(options: { prefix: string }): DynamicModule {
    return {
      module: IdGeneratorModule,
      providers: [{ provide: ID_OPTIONS, useValue: options }],   // les options deviennent un provider
    };
  }
}

@Injectable()
export class IdGenerator {
  private next = 0;
  constructor(@Inject(ID_OPTIONS) private readonly options: { prefix: string }) {}
  generate() { return `${this.options.prefix}_${++this.next}`; }
}
```

Les propriétés renvoyées **s'ajoutent** à celles du décorateur : le module contient `IdGenerator` (du décorateur) et le provider d'options (de `register`). Ils sont dans la même boîte, donc `IdGenerator` peut recevoir les options. Le module n'exporte que `IdGenerator` : les options restent privées.

Les deux appels `register({ prefix: 'usr' })` et `register({ prefix: 'ord' })` produisent **deux modules distincts**, chacun avec son générateur.

## Étape 2 — `register`, `forRoot` ou `forFeature` ?

Le framework n'impose rien, mais les paquets `@nestjs/*` suivent une convention que tes collègues connaissent :

| Méthode | Appelée | Sens |
|---|---|---|
| `register()` | par chaque module qui en a besoin | une configuration propre à l'importateur |
| `forRoot()` | **une fois**, dans le module racine | une configuration partagée par toute l'application |
| `forFeature()` | par les modules de fonctionnalité | ajuste la configuration de `forRoot` (quels dépôts, par exemple) |

Chacune a sa variante `…Async()`, qui obtient la configuration **par injection** (lire une variable avec `ConfigService`, par exemple).

## Étape 3 — ne pas tout écrire à la main : `ConfigurableModuleBuilder`

Écrire `register` **et** `registerAsync`, avec ses variantes `useFactory`, `useClass` et `useExisting`, est long et facile à rater. Nest génère tout :

```ts
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<{ prefix: string }>().build();

@Module({ providers: [IdGenerator], exports: [IdGenerator] })
export class IdGeneratorModule extends ConfigurableModuleClass {}
// et dans IdGenerator : @Inject(MODULE_OPTIONS_TOKEN)
```

La variante asynchrone est offerte :

```ts
IdGeneratorModule.registerAsync({
  imports: [ConfigModule],                     // les modules dont la fabrique a besoin
  useFactory: (config: ConfigService) => ({ prefix: config.getOrThrow('ORDER_PREFIX') }),
  inject: [ConfigService],
});
```

Pourquoi `imports` ici ? La fabrique s'exécute **dans la boîte du module dynamique**. Pour recevoir `ConfigService`, cette boîte doit importer le module qui le prête.

Trois réglages utiles :
- `.setClassMethodName('forRoot')` génère `forRoot()` / `forRootAsync()` au lieu de `register()` ;
- `.setFactoryMethodName('createIdOptions')` renomme la méthode qu'une classe `useClass` doit fournir (par défaut `create()`) ;
- `.setExtras({ isGlobal: false }, (def, extras) => ({ ...def, global: extras.isGlobal }))` ajoute une option qui modifie la **définition** du module, sans arriver dans les options injectées : `IdGenerator` n'a pas à savoir s'il est global.

## Sous le capot

Qu'est-ce qui fait que deux `register()` donnent deux modules, alors qu'un module statique importé dix fois n'existe qu'une fois ? La même règle que dans la leçon précédente : **l'identité par référence**.

- Pour un module statique, l'identifiant est attaché à la **classe**, qui est toujours la même.
- Pour un module dynamique, il est attaché à **l'objet renvoyé** par `register()`. Chaque appel crée un nouvel objet, donc un nouveau module, même avec des options identiques.

Conséquence vérifiable : si tu stockes le résultat dans une constante et que tu l'importes à deux endroits, tu partages **une seule** instance :

```ts
const ORDER_IDS = IdGeneratorModule.register({ prefix: 'ord' });
// imports: [ORDER_IDS] dans OrdersModule ET dans InvoicesModule → un seul générateur
```

Nest propose aussi un autre algorithme, `NestFactory.create(AppModule, { moduleIdGeneratorAlgorithm: 'deep-hash' })` : l'identité est alors calculée à partir du **contenu** sérialisé (classe + options). Deux `register({ prefix: 'ord' })` identiques deviennent le même module. Il est plus coûteux au démarrage (Nest avertit au-delà de 10 ms par module), d'où le choix par défaut.

C'est aussi pour ça que la convention `forRoot` existe : un `forRoot()` appelé dans deux modules crée deux configurations. Pour partager, appelle-le une fois et **ré-exporte la classe** du module (`exports: [FeatureFlagsModule]`), ou rends-le global.

## Pièges fréquents

- **`forRoot()` appelé dans chaque module.** Autant d'instances que d'appels.
- **Oublier `imports` dans `registerAsync`.** La fabrique ne voit pas ses dépendances.
- **Mettre `isGlobal` dans l'interface des options.** C'est le rôle de `setExtras`.
- **Exporter le jeton d'options.** Les options sont un détail d'implémentation.

## En production

- Valide les options dans le constructeur du provider (ou la fabrique) : un préfixe invalide doit empêcher le démarrage, pas produire des identifiants faux pendant une semaine.
- Une fabrique `…Async` qui lit une variable d'environnement absente doit échouer avec un message clair (`getOrThrow`), pas avec un `undefined` qui se propage.

## À retenir

- Un module dynamique = une méthode statique qui renvoie `{ module, providers, exports… }`, ajoutés aux métadonnées de `@Module`.
- `register` par importateur, `forRoot` une fois, `forFeature` pour ajuster ; `…Async` pour configurer par injection.
- `ConfigurableModuleBuilder` génère les méthodes et `MODULE_OPTIONS_TOKEN` ; `setExtras` pour `isGlobal`.
- Identité par référence : chaque appel = un module ; un même objet réutilisé = un module partagé.
