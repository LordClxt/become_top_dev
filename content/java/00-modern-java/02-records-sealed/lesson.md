---
id: java-ch00-l02
title: "Modéliser des données : records, types scellés et constructeurs flexibles"
source: { chapter: 1, pages: "1-3", url: "https://openjdk.org/jeps/409" }
duration_min: 35
concepts:
  - id: java-record-intro
    label: "Record : un agrégat de valeurs nommées, final, dont le compilateur écrit champs, constructeur, accesseurs, equals, hashCode et toString"
  - id: java-sealed
    label: "Interface ou classe scellée : la liste fermée de ses sous-types directs, déclarée avec permits"
  - id: java-sealed-subclass-modifiers
    label: "Chaque sous-type permis est final, sealed ou non-sealed, et vit dans le même module (ou le même paquetage)"
  - id: java-adt
    label: "Type somme et type produit : une interface scellée de records rend les états invalides impossibles à construire"
  - id: java-flexible-ctor
    label: "Constructeur flexible : valider, calculer et initialiser ses propres champs avant super(...)"
glossary:
  - term: "type scellé"
    definition: "Classe ou interface qui fixe la liste de ses sous-types directs (Java 17, JEP 409)."
  - term: "type somme"
    definition: "Type dont une valeur est exactement l'une de plusieurs variantes (ici : les sous-types permis)."
  - term: "type produit"
    definition: "Type dont une valeur contient plusieurs composants à la fois (ici : un record)."
  - term: "prologue"
    definition: "Les instructions d'un constructeur placées avant l'appel explicite à super(...) ou this(...) (Java 25, JEP 513)."
visuals: []
labs: [java-ch00-l02-lab-payment-result, java-ch00-l02-lab-early-validation]
extra: true
xp: 30
---

## Pourquoi c'est important

Le résultat d'un paiement, modélisé comme on le faisait en 2010 :

```java
class PaymentResult {
    String status;      // "APPROVED", "DECLINED" ou "PENDING"
    String authCode;    // seulement si APPROVED
    String reason;      // seulement si DECLINED
    String redirectUrl; // seulement si PENDING
}
```

Rien n'empêche un `APPROVED` sans code d'autorisation, un `DECLINED` avec une URL de redirection, ou un statut `"APROVED"`. Chaque appelant doit se souvenir quelles combinaisons ont un sens, et le jour où le prestataire ajoute un statut `REFUNDED`, le compilateur ne te signale aucun des vingt endroits qui ne le gèrent pas. Un vrai incident : des remboursements comptés comme des refus pendant trois semaines.

Ce qu'on veut dire est simple : un résultat est **soit** une approbation (avec un code et un montant), **soit** un refus (avec une raison), **soit** une attente (avec une URL). Java sait l'exprimer depuis Java 17.

## Le concept

### Le record : un type produit

```java
record Approved(String authCode, long amountCents) { }
```

Un record est une classe `final` dont l'en-tête déclare les composants. Le compilateur génère les champs `private final`, le constructeur, les accesseurs `authCode()` et `amountCents()`, et `equals`, `hashCode`, `toString` fondés sur les composants. Tu valides dans le **constructeur compact** :

```java
record Approved(String authCode, long amountCents) {
    Approved {
        if (!authCode.matches("[A-Z0-9]{6}")) throw new IllegalArgumentException("code : " + authCode);
        if (amountCents <= 0) throw new IllegalArgumentException("montant : " + amountCents);
    }
}
```

Les modules 2 et 3 détaillent ce que génère un record, ses pièges (composants mutables, tableaux) et son lien avec l'immutabilité. Ici, retiens : **un record, c'est une valeur**, pas une entité qui change.

### L'interface scellée : un type somme

```java
sealed interface PaymentResult permits Approved, Declined, Pending { }

record Approved(String authCode, long amountCents) implements PaymentResult { }
record Declined(String reason, boolean retryable) implements PaymentResult { }
record Pending(String redirectUrl) implements PaymentResult { }
```

`permits` fixe la liste des sous-types **directs**. Une quatrième classe qui essaierait `implements PaymentResult` ne compile pas. Si tous les sous-types sont dans le même fichier, `permits` peut être omis : le compilateur les déduit.

Combinés, les deux font ce que les langages fonctionnels appellent un **type algébrique** : chaque variante ne porte que les données qui ont un sens pour elle. Un `Approved` sans code n'est plus un bug à détecter, c'est un objet **impossible à construire**. Et parce que la liste est fermée, le compilateur peut vérifier qu'un `switch` traite toutes les variantes (leçon suivante) : ajouter `Refunded` fera échouer la compilation de chaque `switch` qui l'oublie.

### Les règles des sous-types permis

Chaque sous-type direct doit dire comment la hiérarchie continue :

- **`final`** : rien en dessous (un record l'est toujours) ;
- **`sealed`** : à son tour une liste fermée ;
- **`non-sealed`** : rouvert à n'importe quelle extension, consciemment.

Et il doit vivre dans le **même module** que le type scellé, ou dans le **même paquetage** s'il n'y a pas de module. La liste fermée est une décision de l'auteur, pas une suggestion.

Comparé à Go : une interface Go est satisfaite par n'importe quel type qui a les bonnes méthodes, et un `switch v := x.(type)` n'est jamais vérifié exhaustivement. Une interface scellée est exactement l'inverse : nominale et fermée.

### Valider avant `super(...)` (Java 25)

Jusqu'à Java 24, l'appel à `super(...)` devait être la **première** instruction d'un constructeur. Valider un argument avant d'appeler le constructeur parent forçait des contorsions (une méthode statique dans l'appel `super(check(x))`). Depuis Java 25, un constructeur a un **prologue** :

```java
class Employee extends Person {
    private final String officeId;

    Employee(String name, int age, String officeId) {
        if (age < 18 || age > 67) throw new IllegalArgumentException("âge : " + age);  // échoue vite
        this.officeId = Objects.requireNonNull(officeId);  // initialisé AVANT le parent
        super(name, age);
    }
}
```

Dans le prologue, tu peux valider, calculer des variables locales et **affecter les champs de ta propre classe** qui n'ont pas d'initialiseur. Tu ne peux pas utiliser `this` autrement : ni lire un champ, ni appeler une méthode d'instance, ni passer `this` à quelqu'un. Et pas de `return`.

Pourquoi c'est plus qu'un confort : si le constructeur de `Person` appelle une méthode que `Employee` redéfinit (Bloch interdit ce motif, item 19 au module 4, mais on hérite souvent de classes qu'on ne contrôle pas), cette méthode voyait jusqu'ici `officeId == null`. Initialisé dans le prologue, le champ est déjà valide quand le code du parent s'exécute.

## Sous le capot

**Une liste fermée vérifiée par la JVM, pas seulement par javac.** Un type scellé porte un attribut `PermittedSubclasses` dans son fichier `.class`. Quand la JVM charge une classe qui se déclare sous-type direct d'un type scellé sans figurer dans cette liste, elle refuse de la définir (`IncompatibleClassChangeError`), même si le bytecode a été fabriqué à la main. `Class.isSealed()` et `Class.getPermittedSubclasses()` exposent cette liste par réflexion : les tests de ce cours s'en servent.

**Le prologue existait déjà dans le bytecode.** La JVM n'a jamais exigé que `super(...)` soit la première instruction. Son vérificateur exige seulement qu'on n'utilise pas l'objet avant l'appel au constructeur parent, sauf pour **écrire ses propres champs**. javac s'en servait déjà en secret : pour une classe interne qui utilise son objet englobant, il stocke la référence à l'objet englobant (`this$0`) *avant* d'appeler `super()`, justement pour qu'une méthode redéfinie appelée par le parent ne la voie pas nulle. Le JEP 513 a seulement donné au langage ce que la machine permettait depuis 1996.

## Pièges fréquents

- **Un record avec un champ « statut »** : `record Payment(String status, String authCode, String reason)` reproduit le problème. Une variante = un record.
- **`non-sealed` par réflexe** : il rouvre la hiérarchie et supprime l'exhaustivité au niveau de ce sous-type.
- **Des sous-types dans un autre paquetage** sans module : erreur de compilation. Les variantes vivent avec leur type scellé.
- **Lire un champ dans le prologue** (`if (this.limit > 0)`) : interdit, l'objet n'est pas encore construit. Travaille sur les paramètres.
- **Affecter dans le prologue un champ qui a un initialiseur** (`String s = "x";`) : interdit, l'initialiseur s'exécuterait après et écraserait la valeur.

## À retenir

- Record = type produit (des composants), interface scellée = type somme (des variantes) : ensemble, ils rendent les états invalides impossibles à construire.
- Les sous-types permis sont `final` (les records le sont), `sealed` ou `non-sealed`, et vivent dans le même module ou paquetage.
- La liste fermée est vérifiée par la JVM et permet au compilateur de contrôler l'exhaustivité.
- Java 25 : valide les arguments et initialise tes champs **avant** `super(...)` ; `this` reste inutilisable dans le prologue.

> **Sources :** JEP 395 (records, Java 16), JEP 409 (classes scellées, Java 17), JEP 513 (corps de constructeur flexibles, Java 25). Constructeurs et méthodes redéfinissables : *Effective Java*, 3e éd., item 19 (module 4).
