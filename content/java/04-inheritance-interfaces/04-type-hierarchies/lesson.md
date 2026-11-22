---
id: java-ch04-l04
title: "Des types, pas des étiquettes : hiérarchies, sealed et records"
source: { chapter: 4, pages: "107-111" }
duration_min: 35
concepts:
  - id: java-constant-interface-antipattern
    label: "Une interface ne sert qu'à définir un type : l'interface de constantes est un antimodèle (les constantes fuient dans l'API des classes) ; ranger les constantes dans une classe utilitaire ou un enum, avec import static"
  - id: java-tagged-class
    label: "Classe à étiquette : un champ dit de quelle sorte est l'objet ; champs inutiles, switch partout, oublis silencieux à chaque nouvelle sorte"
  - id: java-class-hierarchy
    label: "Remplacer l'étiquette par une hiérarchie : une racine abstraite (ou une interface), une classe par sorte, chacune avec ses seuls champs, final et validés"
  - id: java-sealed-adt
    label: "Java 17-21 : interface scellée + records + switch par motifs = type de données algébrique ; le compilateur vérifie l'exhaustivité, et refuse le switch qui oublie une sorte"
glossary:
  - term: "classe à étiquette (tagged class)"
    definition: "Classe dont les instances existent en plusieurs « sortes », indiquées par un champ (souvent un enum), avec un switch dans chaque méthode."
  - term: "interface de constantes"
    definition: "Interface sans méthode, qui ne contient que des constantes static final. Antimodèle."
  - term: "type de données algébrique"
    definition: "Type défini comme un choix fermé entre plusieurs formes, chacune avec ses propres données (une somme de produits)."
  - term: "switch par motifs"
    definition: "switch qui teste le type (et peut déconstruire un record) : case Flat(long cents) -> … Java 21."
  - term: "exhaustivité"
    definition: "Propriété d'un switch qui couvre toutes les valeurs possibles. Sur un type scellé, le compilateur la vérifie sans default."
visuals: [java-ch04-tagged-to-sealed]
labs: [java-ch04-l04-lab-sealed-fees]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Une classe à étiquette pour les frais de courtage. Quelqu'un a ajouté la sorte `TIERED` à l'enum. Qu'affiche le programme ?"
    code: |
      public class Main {
          /** Une classe à étiquette : un champ dit quelle « sorte » de frais c'est. */
          static final class Fee {
              enum Kind { FLAT, PERCENT, TIERED }

              final Kind kind;
              long flatCents;        // FLAT
              int basisPoints;       // PERCENT, TIERED (sous le seuil)
              long thresholdCents;   // TIERED
              int basisPointsAbove;  // TIERED (au-dessus)

              Fee(Kind kind) { this.kind = kind; }

              long on(long notional) {
                  switch (kind) {
                      case FLAT: return flatCents;
                      case PERCENT: return notional * basisPoints / 10_000;
                      default: return 0;
                  }
              }
          }

          public static void main(String[] args) {
              Fee percent = new Fee(Fee.Kind.PERCENT);
              percent.basisPoints = 25;
              Fee tiered = new Fee(Fee.Kind.TIERED);
              tiered.basisPoints = 30;
              tiered.thresholdCents = 1_000_000;
              tiered.basisPointsAbove = 10;
              System.out.println(percent.on(2_000_000) + " " + tiered.on(2_000_000));
          }
      }
    answer: "5000 0"
    explanation: "25 points de base sur 20 000 € donnent 50 € (5000 centimes). Mais la sorte TIERED a été ajoutée à l'enum sans toucher au switch : elle tombe dans default et ne coûte rien. Le compilateur n'a rien dit, et chaque Fee porte en plus quatre champs dont la plupart ne servent pas."
    concept: java-tagged-class
  - id: c2
    type: code-output
    prompt: "Les mêmes frais, en interface scellée, records et switch par motifs (Java 21). Qu'affiche le programme ?"
    code: |
      public class Main {
          sealed interface Fee permits Flat, Percent, Tiered { }
          record Flat(long cents) implements Fee { }
          record Percent(int basisPoints) implements Fee { }
          record Tiered(long threshold, int below, int above) implements Fee { }

          static long on(Fee fee, long notional) {
              return switch (fee) {
                  case Flat(long cents) -> cents;
                  case Percent(int bp) -> notional * bp / 10_000;
                  case Tiered(long t, int below, int above) when notional <= t -> notional * below / 10_000;
                  case Tiered(long t, int below, int above) -> t * below / 10_000 + (notional - t) * above / 10_000;
              };
          }

          public static void main(String[] args) {
              Fee[] fees = { new Flat(500), new Percent(25), new Tiered(1_000_000, 30, 10) };
              StringBuilder out = new StringBuilder();
              for (Fee f : fees) out.append(on(f, 2_000_000)).append(' ');
              System.out.println(out.toString().trim());
          }
      }
    answer: "500 5000 4000"
    explanation: "Chaque record ne porte que ses données, et le switch les déconstruit. Tiered : 30 points de base sur les 10 000 premiers euros (3000 centimes), puis 10 sur les 10 000 suivants (1000), soit 4000. Sans le dernier case, le programme ne compilerait pas : « the switch expression does not cover all possible input values »."
    concept: java-sealed-adt
  - id: c3
    type: single
    prompt: "`interface PhysicalConstants { double AVOGADRO = 6.022_140_76e23; }` et `class Simulation implements PhysicalConstants`. Quel est le problème ?"
    choices:
      - "Aucun, c'est la façon standard de partager des constantes"
      - "Les constantes deviennent une partie de l'API de Simulation et de toutes ses sous-classes ; pour les retirer un jour, il faudrait casser la compatibilité"
      - "Les constantes ne sont pas final"
      - "Le compilateur l'interdit depuis Java 8"
    answer: 1
    explanation: "Implémenter une interface dit « Simulation est un PhysicalConstants », ce qui n'a pas de sens. Les constantes, détail d'implémentation, fuient dans l'API exportée et dans l'espace de noms des sous-classes. Une classe utilitaire non instanciable (ou un enum), avec import static, rend le même service."
    concept: java-constant-interface-antipattern
---

## Pourquoi c'est important

Le moteur de facturation d'Ordo calcule les frais de courtage. Trois sortes de frais existent : forfait, pourcentage, et paliers. Le code a été écrit comme une seule classe `Fee` avec un champ `kind`, quatre champs dont la moitié ne sert pas selon la sorte, et un `switch` dans chaque méthode. Quand la sorte « paliers » est arrivée, quelqu'un l'a ajoutée à l'enum… et a oublié l'un des trois `switch`. Pendant un mois, les gros ordres n'ont rien payé.

En Go, tu aurais une interface `Fee` et un type par sorte, ou un `switch fee.(type)` qui, lui non plus, ne t'avertit pas d'un cas oublié. Java moderne fait mieux : un type **scellé** dit au compilateur la liste complète des sortes, et c'est lui qui refuse le `switch` incomplet.

## Les interfaces ne servent qu'à définir des types

Avant les hiérarchies, une règle courte (item 22) : implémenter une interface doit dire quelque chose de ce que les instances **peuvent faire**. Une interface qui ne contient que des constantes ne dit rien de tel.

::checkpoint{id="c3"}

L'**interface de constantes** est un antimodèle : utiliser des constantes est un détail d'implémentation, et les mettre dans une interface les fait **fuir** dans l'API exportée de la classe et de toutes ses sous-classes. Le JDK en a quelques-unes (`ObjectStreamConstants`), à ne pas imiter. Les bonnes places pour une constante :
- dans la classe ou l'interface à laquelle elle est liée (`Integer.MAX_VALUE`) ;
- dans un **enum** si c'est une liste de valeurs énumérées (module 6) ;
- sinon dans une **classe utilitaire non instanciable** (module 1), utilisée avec `import static`.

## Le défaut des classes à étiquette

Une **classe à étiquette** décrit plusieurs sortes d'objets en une seule classe : un champ `kind`, des champs pour chaque sorte, et un `switch` dans chaque méthode.

::checkpoint{id="c1"}

Les défauts s'accumulent :
- **chaque instance porte les champs de toutes les sortes** : de la mémoire perdue, et des champs à moitié initialisés ;
- **les champs ne peuvent pas être `final`** sans constructeurs compliqués ; rien n'empêche un `PERCENT` sans taux ;
- **ajouter une sorte oblige à modifier chaque `switch`**, et le compilateur ne dit rien si on en oublie un : la branche `default` avale l'erreur ;
- **le type d'une instance ne dit rien de sa sorte** : impossible d'écrire une méthode qui n'accepte que des frais au forfait.

Bloch résume : une classe à étiquette est une **imitation maladroite** d'une hiérarchie de classes.

## La hiérarchie de classes

La traduction est mécanique :
1. une racine abstraite (une classe abstraite, ou mieux une interface, leçon 3) avec une méthode abstraite par opération qui dépend de la sorte (`on(notional)`) ;
2. une classe concrète par sorte, avec **ses seuls champs**, `final`, validés dans le constructeur ;
3. chaque classe implémente les opérations à sa façon.

Plus de champs inutiles, plus de `switch`, et le compilateur oblige chaque nouvelle sorte à implémenter toutes les méthodes abstraites. La hiérarchie peut aussi refléter des relations réelles entre sortes : un carré est un rectangle particulier, chose qu'aucune étiquette ne sait dire.

## Au-delà du livre : sealed, records et switch par motifs

La hiérarchie de Bloch reste **ouverte** : n'importe qui peut ajouter une sorte. C'est parfois voulu (des formes géométriques). Souvent non : les sortes de frais sont **décidées par Ordo**, et une sorte inconnue serait un bug. Java 17-21 offre la forme exacte pour ce cas, le **type de données algébrique** :

```java title="Fee.java"
public sealed interface Fee {
    long on(long notionalCents);

    record Flat(long cents) implements Fee {
        public Flat { if (cents < 0) throw new IllegalArgumentException("forfait négatif : " + cents); }
        public long on(long notionalCents) { return cents; }
    }
    record Percent(int basisPoints) implements Fee { … }
    record Tiered(long threshold, int below, int above) implements Fee { … }
}
```

- `sealed` : la liste des implémentations est **fermée**. Quand elles sont dans le même fichier, la clause `permits` est inutile ; sinon, on les liste.
- `record` : chaque sorte ne porte que ses données, `final`, avec `equals`, `hashCode` et `toString` corrects (module 3).
- Le **switch par motifs** déconstruit les records, et sur un type scellé il est vérifié **exhaustif** : pas de `default`, et le compilateur refuse celui qui oublie une sorte.

::checkpoint{id="c2"}

Le jour où une quatrième sorte arrive, **chaque** `switch` qui l'oublie devient une erreur de compilation. C'est exactement la protection qui manquait au mois de frais gratuits.

::visual{id="java-ch04-tagged-to-sealed"}

> **Sous le capot :** une classe scellée enregistre la liste de ses sous-classes autorisées dans un attribut du fichier `.class` (`PermittedSubclasses`), que la JVM vérifie au chargement : même une classe compilée à part, ou générée, ne peut pas s'y ajouter. Le `switch` par motifs compile en un `invokedynamic` vers `SwitchBootstraps.typeSwitch`, qui teste les types dans l'ordre ; s'il reçoit une sorte qui n'existait pas à la compilation (une classe recompilée séparément), il lève `MatchException` au lieu de tomber silencieusement dans une branche.

**Méthode dans chaque record, ou `switch` à l'extérieur ?** Les deux sont légitimes. Une méthode abstraite implémentée par chaque sorte (le choix de Bloch) convient aux opérations qui **appartiennent** au type (`on`). Un `switch` exhaustif à l'extérieur convient aux opérations qui appartiennent au **client** (l'affichage d'une facture, l'export comptable) : on les ajoute sans toucher au type, et le compilateur veille quand même.

## Pièges fréquents

- **Un `default` dans un `switch` sur un type scellé** : il désactive la vérification d'exhaustivité ; la prochaine sorte y tombera en silence.
- **Une classe à étiquette « provisoire »** : chaque sorte ajoutée la rend plus difficile à défaire.
- **Une interface de constantes**, ou une classe qui en implémente une pour « éviter de préfixer » : utilise `import static`.
- **`sealed` sur une hiérarchie qui doit rester ouverte** (des extensions écrites par d'autres) : choisis selon que les sortes sont décidées par toi ou par tes clients.
- **Une hiérarchie qui recopie l'étiquette** (un champ `kind` dans chaque sous-classe) : le type est l'étiquette.

## À retenir

- Une interface définit un type ; pas d'interface de constantes (classe utilitaire, enum, `import static`).
- Une classe à étiquette est une hiérarchie mal imitée : champs inutiles, `switch` partout, oublis silencieux.
- Remplace-la par une racine abstraite et une classe par sorte, chacune avec ses seuls champs, `final`.
- Hiérarchie fermée : `sealed interface` + `record` + `switch` par motifs, vérifié exhaustif par le compilateur, sans `default`.

> **Source :** *Effective Java*, 3e éd., items 22 et 23 (pages 107 à 111) ; [JEP 409 : Sealed Classes](https://openjdk.org/jeps/409), [JEP 440 : Record Patterns](https://openjdk.org/jeps/440) et [JEP 441 : Pattern Matching for switch](https://openjdk.org/jeps/441).
