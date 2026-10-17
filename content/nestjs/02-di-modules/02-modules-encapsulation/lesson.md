---
id: nest-ch02-l02
title: "Modules et encapsulation"
source: { chapter: 5, pages: "#feature-modules, #shared-modules, #module-re-exporting, #global-modules", url: "https://docs.nestjs.com/modules" }
duration_min: 35
concepts:
  - id: nest-module-encapsulation
    label: "Un module n'injecte que ses propres providers et ce qu'exportent les modules qu'il importe ; ses exports sont son API publique"
  - id: nest-shared-singleton
    label: "Exporter un provider partage une instance ; le redéclarer dans un autre module en crée une seconde, avec son propre état"
  - id: nest-module-reexport
    label: "Un module peut ré-exporter un module importé : un module « socle » expose plusieurs briques d'un coup"
  - id: nest-global-modules
    label: "@Global() rend les exports visibles partout sans import ; à réserver à une ou deux briques transverses"
glossary:
  - term: "module de fonctionnalité"
    definition: "Un module qui regroupe contrôleurs et providers d'un même domaine (catalogue, commandes…)."
  - term: "export"
    definition: "Un provider (ou un module) qu'un module rend visible aux modules qui l'importent."
  - term: "graphe des modules"
    definition: "La structure que Nest construit à partir du module racine en suivant les imports ; elle détermine qui peut injecter quoi."
visuals: [nest-ch02-module-visibility]
labs: [nest-ch02-l02-lab-shared-stock]
extra: false
xp: 30
---

> **En une phrase :** un module est une boîte qui garde ses providers privés, sauf ceux qu'il exporte, et qui n'existe qu'en un seul exemplaire.

## Le problème

Un client commande deux exemplaires de *Germinal*. La commande passe. Mais la fiche du livre affiche toujours trois exemplaires en stock. Aucune erreur dans les logs.

Le code des services est juste. Le bug est dans la façon dont les **modules** sont câblés, et c'est le bug le plus traître de Nest : un état **dupliqué**, sans aucun message.

## L'idée : des boîtes avec une porte

Un module, c'est une boîte :
- dedans, ses `providers` et ses `controllers` ;
- sur la porte, la liste de ce qu'il accepte de prêter : ses `exports` ;
- et la liste des boîtes dont il a besoin : ses `imports`.

Un provider peut recevoir deux choses : ce qui est **dans sa boîte**, et ce que les boîtes importées **prêtent**. Rien d'autre.

## Étape 1 — encapsulé par défaut

```ts
@Module({
  controllers: [CatalogController],
  providers: [StockService, PriceService],
  exports: [StockService],                 // la porte : seul StockService sort
})
export class CatalogModule {}

@Module({
  imports: [CatalogModule],
  providers: [OrdersService],              // OrdersService peut recevoir StockService…
})
export class OrdersModule {}               // …mais pas PriceService
```

Si `OrdersService` demande `PriceService`, Nest refuse de démarrer. Ce refus est un **garde-fou** : le calcul des prix peut changer de signature sans casser les commandes, puisque personne d'autre ne l'utilise. Les exports d'un module sont son **API publique**.

::visual{id="nest-ch02-module-visibility"}

## Étape 2 — exporter partage, redéclarer duplique

Face à « can't resolve dependencies of OrdersService », le réflexe tentant est d'ajouter `StockService` aux `providers` de `OrdersModule`. L'erreur disparaît. Mais il existe maintenant **deux** `StockService` : les commandes décrémentent l'un, le catalogue affiche l'autre. C'est exactement le bug de l'introduction.

La règle : **un provider vit dans un seul module ; il est exporté là où il vit, et importé là où il sert.**

## Étape 3 — un module socle

Quand plusieurs modules ont besoin des mêmes briques, un module peut ré-exporter des modules entiers :

```ts
@Module({ imports: [CatalogModule, PricingModule], exports: [CatalogModule, PricingModule] })
export class CoreModule {}
```

Les modules de fonctionnalité importent `CoreModule`. La composition du socle peut changer sans les toucher.

Un module peut aussi **recevoir** des providers dans son propre constructeur (pour lire une configuration au démarrage, par exemple). Mais une classe de module n'est jamais injectable.

## Étape 4 — `@Global()`, l'exception

```ts
@Global()
@Module({ providers: [AppConfig], exports: [AppConfig] })
export class ConfigCoreModule {}
```

Les exports d'un module global sont visibles partout, sans import. C'est commode pour une ou deux briques vraiment transverses (configuration, connexion à la base), enregistrées **une seule fois**, dans le module racine. Ailleurs, c'est un piège : en lisant les `imports` de `OrdersModule`, tu ne vois plus de quoi il dépend, et un test qui compile `OrdersModule` seul échoue faute du global.

## Sous le capot

Pourquoi un module importé par dix autres n'existe-t-il qu'une fois ? Dans Nest 12, le conteneur identifie un module **par référence** (`injector/opaque-key-factory/by-reference-module-opaque-key-factory.js`) : la première fois qu'il rencontre la classe `CatalogModule`, il lui attache un identifiant (sous un `Symbol` interne). Les fois suivantes, il retrouve le même identifiant, donc le même module, donc les mêmes instances de providers.

Quand l'injecteur cherche un jeton pour un provider de `OrdersModule`, il regarde d'abord les providers de `OrdersModule`, puis, pour chaque module importé, **seulement ses exports**. Un provider non exporté n'est tout simplement pas dans la liste parcourue : c'est pour ça que l'erreur parle de « context » du module.

Les modules `@Global()` sont ajoutés automatiquement à la liste des imports de tous les modules : d'où leur commodité, et d'où le couplage invisible.

## Pièges fréquents

- **Redéclarer un provider pour faire taire une erreur.** Le démarrage passe, l'état est dupliqué.
- **Tout exporter.** Un module qui exporte tous ses providers n'a plus de frontière.
- **`@Global()` partout.** Les dépendances deviennent invisibles.
- **Importer sans exporter.** `imports: [CatalogModule]` ne donne accès qu'à ce que `CatalogModule` exporte.

## En production

- Une règle de relecture : les flèches d'import vont des fonctionnalités vers le socle, jamais l'inverse. Un cycle entre modules (leçon 5) est le signe d'une frontière mal placée.
- Le bug de la double instance est invisible tant que le service n'a pas d'état. Il apparaît le jour où quelqu'un y ajoute un cache. Vérifie tes graphes **avant**.

## À retenir

- Visibilité = providers du module + exports des modules importés.
- Exporter partage une instance ; redéclarer en crée une autre.
- Un module est identifié par sa classe : importé dix fois, il existe une fois.
- `@Global()` une ou deux fois, pour du transverse.
