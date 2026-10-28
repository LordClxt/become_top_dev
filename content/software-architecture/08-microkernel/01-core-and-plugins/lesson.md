---
id: arch-ch08-l01
title: "Le cœur et les plug-ins"
source: { chapter: 12, pages: "169-175" }
duration_min: 40
concepts:
  - id: arch-microkernel-topology
    label: "Un monolithe simple à deux composants : le système cœur et les plug-ins"
  - id: arch-core-system
    label: "Le cœur : la fonctionnalité minimale, ou le chemin nominal sans traitement spécifique"
  - id: arch-move-complexity
    label: "Sortir la complexité cyclomatique du cœur vers des plug-ins localisés par un registre"
  - id: arch-plugin-rules
    label: "Plug-ins autonomes, indépendants, sans dépendance entre eux, reliés au cœur point à point"
  - id: arch-compile-runtime
    label: "Plug-ins à la compilation (simples, tout redéployer) ou à l'exécution (OSGi, Jigsaw, Prism)"
glossary:
  - term: "architecture microkernel (plug-in)"
    definition: "Style monolithique où un système cœur minimal est étendu par des composants plug-ins indépendants."
  - term: "système cœur"
    definition: "La fonctionnalité minimale pour faire tourner le système, ou le chemin nominal du traitement, sans spécificités."
  - term: "chemin nominal (happy path)"
    definition: "Le déroulé général d'un traitement, sans les cas particuliers."
  - term: "plug-in"
    definition: "Composant autonome qui ajoute un traitement spécialisé, une fonctionnalité ou du code spécifique au cœur."
  - term: "OSGi"
    definition: "Open Service Gateway Initiative : framework Java pour ajouter et retirer des modules à l'exécution."
visuals: [arch-ch08-plug-unplug]
labs: [arch-ch08-l01-lab-warmup-core-or-plugin]
xp: 40
---

## Pourquoi c'est important

Une société de recyclage évalue des appareils électroniques. Le code ressemble à ceci, et grossit chaque semaine :

```typescript
function assessDevice(deviceId: string) {
  if (deviceId === 'iPhone6s') return assessIPhone6s();
  else if (deviceId === 'iPad1') return assessIPad1();
  else if (deviceId === 'Galaxy5') return assessGalaxy5();
  // … 240 autres appareils
}
```

Chaque nouvel appareil modifie cette fonction, sa complexité cyclomatique dépasse 200, et un changement pour le Galaxy risque de casser l'iPhone. Le style **microkernel** (ou **plug-in**) répond exactement à ce problème. Il a été nommé il y a des décennies et reste très utilisé.

## Deux composants

L'architecture microkernel est un **monolithe** relativement **simple**, fait de deux sortes de composants : le **système cœur** et les **plug-ins**. La logique est répartie entre les deux, ce qui apporte **extensibilité**, **adaptabilité** et **isolation** des fonctionnalités et des traitements spécifiques.

C'est le style naturel des **produits** (téléchargés et installés en un seul déployable chez le client), mais il sert aussi beaucoup pour des applications métier sur mesure.

## Le système cœur

Deux définitions :

1. La **fonctionnalité minimale** nécessaire pour faire tourner le système. L'exemple d'Eclipse : son cœur n'est qu'un éditeur de texte (ouvrir, modifier, enregistrer). C'est en ajoutant des plug-ins qu'il devient un IDE.
2. Le **chemin nominal** (*happy path*) du traitement, avec peu ou pas de traitement spécifique.

### Sortir la complexité du cœur

La seconde définition explique l'intérêt du style : on retire la **complexité cyclomatique** du cœur pour la placer dans des **plug-ins séparés**, ce qui améliore extensibilité, maintenabilité et testabilité. Pour le recyclage, un plug-in **par appareil** : la logique de chaque appareil est isolée, et ajouter un appareil revient à **ajouter un plug-in et mettre à jour le registre**. Le cœur se contente de localiser et d'invoquer le bon plug-in :

```typescript
interface DevicePlugin { assess(): string }
const registry = new Map<string, () => DevicePlugin>([
  ['iPhone6s', () => ({ assess: () => 'écran rayé, revendable' })],
  ['Galaxy5', () => ({ assess: () => 'batterie gonflée, à recycler' })],
]);
function assessDevice(deviceId: string) {
  const make = registry.get(deviceId);
  if (!make) throw new Error(`aucun plug-in pour ${deviceId}`);
  return make().assess();
}
console.log(assessDevice('Galaxy5'));
// batterie gonflée, à recycler
```

La CC de `assessDevice` tombe à 2, quel que soit le nombre d'appareils. Toute la complexité est dans des plug-ins **autonomes**, exécutés de façon générique par le cœur.

### La forme du cœur

Selon sa taille, le cœur peut être une **architecture en couches** ou un **monolithe modulaire**. Il peut même être découpé en **services de domaine** déployés séparément, chacun avec ses plug-ins : un service **Paiement** dont chaque moyen de paiement (carte, PayPal, avoir, carte cadeau, bon de commande) est un plug-in. Dans tous ces cas, l'application partage en général **une seule base de données**.

L'**interface** peut être intégrée au cœur, ou séparée (le cœur fournissant alors des services backend) ; une interface séparée peut elle-même être… un microkernel.

## Les plug-ins

Les plug-ins sont des composants **autonomes** et **indépendants** qui contiennent du traitement spécialisé, des fonctionnalités supplémentaires et du code spécifique. Ils servent aussi à **isoler du code très volatil** (qui change souvent), pour la maintenabilité et la testabilité.

Les règles :

- **Aucune dépendance entre plug-ins.** Idéalement, ils s'ignorent mutuellement.
- **Communication point à point** avec le cœur : le « tuyau » est en général un **appel de méthode** vers le point d'entrée du plug-in.

### À la compilation ou à l'exécution

- **À la compilation** : beaucoup plus simples à gérer, mais **toute l'application monolithique** doit être redéployée quand un plug-in est modifié, ajouté ou retiré.
- **À l'exécution** : ajoutés ou retirés **sans redéployer** le cœur ni les autres plug-ins, en général grâce à un framework : **OSGi**, Penrose ou **Jigsaw** en Java, **Prism** en .NET. (En TypeScript, hors livre : un `import()` dynamique d'un module découvert au démarrage joue ce rôle.)

### Comment les ranger

Un plug-in point à point peut être une **bibliothèque partagée** (JAR, DLL, gem, paquet npm) dont le nom correspond à l'appareil. Plus simple encore : un **espace de noms** (package, namespace, dossier) dans le même code base. Le livre recommande la convention :

> `app.plugin.<domaine>.<contexte>` — par exemple `app.plugin.assessment.iphone6s`

Le deuxième nœud (`plugin`) dit clairement que ce composant doit respecter les règles des plug-ins (autonome, séparé des autres). Le troisième (`assessment`) regroupe les plug-ins par **domaine**. Le quatrième (`iphone6s`) donne le **contexte** précis, pour retrouver facilement le plug-in à modifier ou tester.

::visual{id="arch-ch08-plug-unplug"}

## Pièges fréquents

- **Laisser le cœur grossir de cas particuliers** : c'est exactement ce que les plug-ins doivent absorber.
- **Un plug-in qui en importe un autre** (« il y a déjà la fonction dans le plug-in iPhone ») : l'indépendance disparaît.
- **Choisir le chargement à l'exécution sans besoin** : la complexité d'un framework pour un produit qu'on redéploie de toute façon.
- **Un rangement sans convention** : on ne sait plus ce qui est plug-in et doit en respecter les règles.

## À retenir

- Deux composants : un **cœur** (minimal, ou chemin nominal) et des **plug-ins**.
- Le registre remplace la cascade de `if` : la **complexité cyclomatique** quitte le cœur.
- Cœur en couches, monolithe modulaire, ou services de domaine avec leurs plug-ins ; souvent **une seule base**.
- Plug-ins **autonomes**, **sans dépendance entre eux**, reliés au cœur **point à point**.
- **Compilation** (simple, tout redéployer) ou **exécution** (OSGi, Jigsaw, Prism) ; convention `app.plugin.<domaine>.<contexte>`.
