---
id: arch-ch08-l02
title: "Plug-ins distants, registre et contrats"
source: { chapter: 12, pages: "175-178" }
duration_min: 40
concepts:
  - id: arch-remote-plugins
    label: "Plug-ins distants (REST, messagerie) : découplage, scalabilité, asynchrone… mais distribué et toujours un seul quantum"
  - id: arch-plugin-data
    label: "Les plug-ins ne touchent pas la base centrale : le cœur leur passe les données ; ils peuvent avoir leur propre stockage"
  - id: arch-plugin-registry
    label: "Le registre : nom, contrat, protocole ; d'une simple map jusqu'à ZooKeeper ou Consul"
  - id: arch-plugin-contracts
    label: "Des contrats standard par domaine, un adaptateur pour les plug-ins tiers, un cœur qui n'interprète pas le résultat"
glossary:
  - term: "plug-in distant"
    definition: "Plug-in déployé comme un service autonome, appelé par REST ou messagerie."
  - term: "registre de plug-ins"
    definition: "Ce que le cœur sait de chaque plug-in : nom, contrat de données, protocole et détails d'accès."
  - term: "contrat de plug-in"
    definition: "Comportement, données d'entrée et données de sortie convenus entre le cœur et les plug-ins d'un domaine."
  - term: "adaptateur"
    definition: "Composant qui convertit le contrat d'un plug-in tiers vers le contrat standard, pour que le cœur n'ait pas de code spécifique."
  - term: "ZooKeeper / Consul"
    definition: "Outils de registre et de découverte de services, utilisables comme registre externe de plug-ins."
visuals: [arch-ch08-plugin-access]
labs: [arch-ch08-l02-lab-plugin-decisions, arch-ch08-l02-lab-iphone-broken]
xp: 40
---

## Pourquoi c'est important

Le plug-in d'évaluation des smartphones Samsung est fourni par… Samsung. Il ne respecte pas ton contrat, renvoie une note de A à E au lieu d'un rapport, et tourne sur leurs serveurs. Un autre plug-in voudrait lire directement la table `devices` pour gagner du temps. Et quelqu'un propose de passer tous les plug-ins en microservices « pour la scalabilité ». Chacune de ces idées a un prix ; cette leçon donne les règles qui permettent de trancher.

## Les plug-ins distants

Un plug-in n'est pas forcément appelé par un appel de fonction. On peut l'invoquer par **REST** ou par **messagerie**, chaque plug-in devenant un **service autonome** (voire un microservice dans un conteneur).

**Les bénéfices** :

- un meilleur **découplage** des composants ;
- une meilleure **scalabilité** et un meilleur débit ;
- des changements **à l'exécution** sans framework spécial (OSGi, Jigsaw, Prism) ;
- la possibilité d'appels **asynchrones**. Pour le recyclage : au lieu d'attendre l'évaluation, le cœur la **déclenche** de façon asynchrone ; quand elle est finie, le plug-in prévient le cœur par un autre canal de messagerie, et le cœur prévient l'utilisateur.

**Les trade-offs** :

- le microkernel devient une architecture **distribuée** : difficile à installer et déployer pour la plupart des **produits sur site** ;
- plus de **complexité**, de **coût**, une topologie de déploiement plus compliquée ;
- si un plug-in REST ne répond pas, la **requête ne peut pas aboutir** (ce qui n'arrive pas en monolithe) ;
- et surtout : c'est **toujours un seul quantum**. Toute requête passe d'abord par le **cœur monolithique** pour atteindre le plug-in.

Le choix entre point à point et distant doit donc découler d'exigences précises et d'une analyse soigneuse des trade-offs.

## Les plug-ins et les données

Ce n'est **pas** une pratique courante qu'un plug-in se connecte directement à une **base centrale partagée**. C'est le **cœur** qui s'en charge, et qui **passe** aux plug-ins les données dont ils ont besoin. La raison est le **découplage** : un changement de base ne doit toucher que le cœur, pas les plug-ins.

En revanche, un plug-in peut avoir **son propre stockage**, accessible à lui seul : chaque plug-in d'évaluation peut avoir sa petite base ou son moteur de règles, avec les règles spécifiques de son appareil. Ce stockage peut être externe, ou embarqué (base en mémoire, base embarquée).

## Le registre

Le cœur doit savoir quels plug-ins existent et comment les joindre. On utilise un **registre de plug-ins** qui contient, pour chacun, son **nom**, son **contrat de données** et les **détails du protocole d'accès**. Exemple pour un logiciel d'impôts : un plug-in qui signale les éléments à risque de contrôle fiscal a pour nom `AuditChecker`, un contrat (données d'entrée et de sortie) et un format de contrat (XML).

Le registre peut être une simple **map interne** au cœur (clé → référence du plug-in), ou un **outil de registre et de découverte**, embarqué ou externe (**Apache ZooKeeper**, **Consul**). Une entrée peut pointer vers un plug-in local, une file de messages ou une URL REST :

```typescript
type Access =
  | { kind: 'local'; module: string }
  | { kind: 'queue'; name: string }
  | { kind: 'rest'; url: string };
const registry: Record<string, Access> = {
  iPhone6s: { kind: 'local', module: 'app/plugin/assessment/iphone6s' },
  Galaxy5: { kind: 'queue', name: 'galaxy5.assessment' },
  Pixel3: { kind: 'rest', url: 'https://atlas:443/assess/pixel3' },
};
console.log(Object.values(registry).map((a) => a.kind).join(','));
// local,queue,rest
```

## Les contrats

Les contrats entre le cœur et les plug-ins sont en général **standard pour tout un domaine** de plug-ins : **comportement**, **données d'entrée** et **données de sortie**. Pour le recyclage :

```typescript
interface AssessmentOutput {
  assessmentReport: string;  // rapport formaté, que le cœur se contente d'afficher
  resell: boolean;           // revendable, ou à recycler
  value: number;             // valeur calculée
  resellPrice: number;       // prix de revente recommandé
}
interface AssessmentPlugin {
  assess(): AssessmentOutput;
  register(): string;
  deregister(): string;
}
```

Remarque le partage des responsabilités : formater et comprendre le **rapport** n'est **pas** le rôle du cœur. Il l'affiche ou l'imprime, c'est tout. Le cœur ne connaît rien de la logique d'un appareil.

### L'adaptateur

Les contrats **personnalisés** apparaissent surtout quand un plug-in est développé par un **tiers** qui ne suit pas ton contrat. On crée alors un **adaptateur** entre son contrat et le contrat standard, pour que le cœur n'ait **pas de code spécifique** par plug-in. Les contrats peuvent être en XML, en JSON, ou des objets échangés directement.

::visual{id="arch-ch08-plugin-access"}

## Pièges fréquents

- **Passer les plug-ins en services « pour la scalabilité »** en oubliant que c'est toujours un seul quantum, désormais distribué.
- **Un plug-in qui lit la base centrale** : chaque migration de schéma devient un risque pour tous les plug-ins.
- **Un `if (plugin === 'samsung')` dans le cœur** pour gérer un contrat différent, au lieu d'un adaptateur.
- **Un cœur qui interprète les rapports** : il se met à connaître chaque appareil, et la complexité revient.

## À retenir

- Plug-ins **distants** : découplage, scalabilité, asynchrone, changements à chaud ; mais **distribué**, plus cher, une panne de plug-in bloque la requête, et **toujours un seul quantum**.
- Les plug-ins **ne touchent pas la base centrale** : le cœur leur passe les données ; ils peuvent avoir **leur propre stockage**.
- Le **registre** : nom, contrat, protocole ; d'une map à ZooKeeper ou Consul.
- Des **contrats standard** par domaine ; un **adaptateur** pour les tiers ; le cœur n'interprète pas le résultat.
