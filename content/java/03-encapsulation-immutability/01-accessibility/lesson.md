---
id: java-ch03-l01
title: "Rendre chaque chose aussi inaccessible que possible"
source: { chapter: 4, pages: "73-77" }
duration_min: 30
concepts:
  - id: java-information-hiding
    label: "Masquage d'information : l'API est un contrat, l'implémentation reste libre de changer"
  - id: java-access-levels
    label: "Les niveaux d'accès : private, package-private, protected, public ; et seulement package-private ou public pour une classe de premier niveau"
  - id: java-protected-is-api
    label: "protected fait partie de l'API exportée : un engagement à vie, comme public"
  - id: java-public-array-hole
    label: "Un tableau public static final est modifiable : liste non modifiable ou copie"
  - id: java-test-visibility
    label: "Pour tester, on peut descendre jusqu'à package-private, jamais au-delà"
  - id: java-modules-encapsulation
    label: "Modules (Java 9+) : un paquetage non exporté est inaccessible hors du module, strictement pour le JDK depuis Java 17"
glossary:
  - term: "masquage d'information"
    definition: "Principe (Parnas, 1972) : un composant cache ses détails d'implémentation et ne communique que par son API."
  - term: "package-private"
    definition: "Accès par défaut, sans modificateur : visible dans tout le paquetage, invisible au-dehors."
  - term: "API exportée"
    definition: "Tout ce qu'un client hors du paquetage peut voir et utiliser : classes publiques et leurs membres public et protected."
  - term: "module"
    definition: "Groupe de paquetages décrit par module-info.java, qui déclare ceux qu'il exporte et ceux dont il dépend."
visuals: [java-ch03-access-levels]
labs: [java-ch03-l01-lab-warmup-constants, java-ch03-l01-lab-tighten-api]
extra: false
xp: 30
---

## Pourquoi c'est important

Ta bibliothèque de calcul de taxes a une classe utilitaire `TaxTables`, publique « parce que c'était plus simple ». Deux ans plus tard, tu veux la remplacer par un appel à un service : impossible. Trois équipes l'utilisent directement, et l'une d'elles écrit même dans son tableau `public static final double[] RATES` pour « corriger » un taux en production. Ce que tu as rendu public, tu dois le maintenir **pour toujours**, et ce que tu n'as pas protégé, quelqu'un finit par le modifier.

Le critère qui distingue le plus un composant bien conçu d'un composant mal conçu, c'est ce qu'il **cache**. Un composant qui cache son implémentation peut être compris, testé, optimisé et remplacé seul, sans peur de casser les autres.

## Le concept

### La règle : le niveau d'accès le plus bas qui marche

Pour une **classe de premier niveau** (non imbriquée), deux choix seulement :

- `public` : elle fait partie de l'API du paquetage. Tu la supportes à vie ;
- **package-private** (aucun modificateur) : elle fait partie de l'implémentation. Tu peux la changer, la remplacer ou la supprimer à la prochaine version.

Si une classe package-private n'est utilisée que par **une** classe, fais-en une classe imbriquée `private static` de celle-ci : son accès se réduit alors de tout le paquetage à une seule classe.

Pour les **membres** (champs, méthodes, classes imbriquées), quatre niveaux, du plus fermé au plus ouvert :

| Niveau | Visible depuis |
|---|---|
| `private` | la classe de premier niveau qui le déclare |
| package-private | tout le paquetage |
| `protected` | le paquetage + les sous-classes, même ailleurs |
| `public` | partout |

::visual{id="java-ch03-access-levels"}

Le réflexe : conçois soigneusement l'API publique, puis rends **tout le reste `private`**. Ne descends à package-private que si une autre classe du paquetage en a vraiment besoin. Si ça t'arrive souvent, c'est que le découpage en classes est à revoir.

### Le grand saut : de package-private à protected

Passer un membre de package-private à `protected`, c'est l'**exporter**. N'importe qui peut étendre ta classe publique et appeler ce membre : il fait partie de l'API, tu dois le maintenir, et il révèle un détail d'implémentation (on y reviendra au module 4, sur l'héritage). Les membres protégés devraient être rares.

Une contrainte du langage limite la réduction d'accès : une méthode qui **redéfinit** ne peut pas être moins accessible que celle qu'elle redéfinit. C'est le principe de Liskov (module 2) : une sous-classe doit être utilisable partout où l'est la classe mère. Conséquence : les méthodes qui implémentent une interface sont forcément `public`.

### Et pour les tests ?

Tu peux rendre package-private un membre `private` pour le tester, **pas plus**. Les tests vivent dans le même paquetage (dans `src/test/java`, avec le même nom de paquetage) et voient donc tout ce qui est package-private. Rendre une méthode publique « pour les tests », c'est l'ajouter à l'API.

### Les champs : jamais publics (sauf les constantes)

Un champ d'instance public et non `final`, ou qui référence un objet mutable, te fait renoncer à **tout** contrôle : tu ne peux plus valider les valeurs, ni réagir à une modification, ni garantir la sûreté entre threads. Même `final` et immuable, il t'interdit de changer de représentation (la leçon suivante y revient).

Exception : les **constantes**, `public static final`, nommées en `MAJUSCULES_AVEC_SOULIGNÉS`, qui font partie de l'abstraction. Elles doivent contenir un primitif ou un objet **immuable**.

### Le trou de sécurité classique : le tableau constant

```java
public static final Thing[] VALUES = { ... };   // la référence est final, pas le contenu !
```

N'importe quel client peut écrire `VALUES[0] = null`. Un tableau non vide est **toujours** mutable. Deux corrections, selon ce que le client fera du résultat :

```java
private static final Thing[] PRIVATE_VALUES = { ... };

// 1. Une liste non modifiable (une vue, aucune copie à chaque accès)
public static final List<Thing> VALUES = List.of(PRIVATE_VALUES);

// 2. Une copie à chaque appel (le client reçoit un vrai tableau, à lui)
public static Thing[] values() { return PRIVATE_VALUES.clone(); }
```

Méfie-toi des accesseurs générés par les IDE, qui renvoient souvent directement le tableau privé : même problème.

> `List.of(array)` copie le tableau à la création. `Collections.unmodifiableList(Arrays.asList(array))`, la version du livre, est une **vue** : elle reflète toute modification ultérieure du tableau privé.

### Les modules (Java 9+)

Un module regroupe des paquetages et déclare dans `module-info.java` ceux qu'il **exporte**. Les membres `public` d'un paquetage non exporté sont invisibles hors du module : on peut partager des classes entre paquetages d'un même module sans les montrer au monde.

```java
module com.example.taxes {
    exports com.example.taxes.api;   // seul ce paquetage est visible de l'extérieur
}
```

Pour ton propre code, cette protection reste largement **indicative** : un JAR modulaire placé sur le *classpath* (et non sur le *module path*) retrouve l'accessibilité classique. Le JDK, lui, l'applique strictement : depuis **Java 17**, il n'est plus possible d'ouvrir ses paquetages internes par réflexion sans option explicite (`--add-opens`). C'est pour cela que de vieilles bibliothèques qui fouillaient dans `sun.misc` ou les champs privés de `String` ont cassé lors des migrations.

## Sous le capot : qui vérifie l'accès, et quand

L'accès est vérifié **deux fois**. D'abord par `javac`, qui refuse de compiler `obj.champPrivé` depuis une autre classe. Puis par la **JVM**, au moment où elle résout une référence de champ ou de méthode dans le bytecode. Si la classe cible a changé depuis la compilation (un membre devenu `private` dans une nouvelle version d'une bibliothèque, sans recompiler le client), la JVM lève `IllegalAccessError` à l'exécution. Les niveaux d'accès sont donc aussi une protection **binaire**, pas seulement une politesse du compilateur.

Un cas instructif : les classes imbriquées. Pour le langage, une classe interne peut lire les membres `private` de sa classe englobante. Pour la JVM d'avant Java 11, ce sont deux classes distinctes. `javac` générait donc des méthodes cachées `access$000` de niveau package, ce qui ouvrait en réalité le membre privé à tout le paquetage. Depuis **Java 11**, la JVM connaît les **nestmates** (JEP 181) : la classe englobante déclare ses classes imbriquées dans un attribut `NestMembers`, et la JVM autorise directement l'accès privé entre elles, sans méthode passerelle.

La réflexion contourne `private` avec `setAccessible(true)`, mais seulement si le module de la cible l'**ouvre** à l'appelant. Sinon, `InaccessibleObjectException`. C'est ce mécanisme qui protège le JDK depuis Java 17.

## Pièges fréquents

- **Une classe publique « par défaut »** alors que personne hors du paquetage ne s'en sert : elle devient une API à vie.
- **`protected` vu comme « presque privé »** : c'est de l'API exportée.
- **`public static final` sur un tableau ou une collection mutable** : le contenu est modifiable par tous.
- **Un accesseur généré qui renvoie le tableau interne.**
- **Une méthode publique « pour les tests »** : package-private suffit, les tests sont dans le même paquetage.
- **Des champs d'instance publics** dans une classe publique.

## À retenir

- Rends chaque classe et chaque membre **aussi inaccessible que possible**.
- Classe de premier niveau : package-private si possible ; utilisée par une seule classe : `private static` imbriquée.
- `protected` et `public` sont des engagements à vie.
- Aucun champ public, sauf des constantes `static final` primitives ou immuables. Jamais de tableau public.
- Tests : package-private au maximum.
- Les modules ajoutent une frontière au-dessus des paquetages ; strictement appliquée pour le JDK.

> **Source :** *Effective Java*, 3e éd., item 15 (pages 73 à 77). Nestmates : JEP 181 (Java 11). Encapsulation forte du JDK : JEP 403 (Java 17).
