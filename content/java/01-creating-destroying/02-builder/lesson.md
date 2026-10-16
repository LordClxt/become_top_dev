---
id: java-ch01-l02
title: "Le Builder, quand les paramètres s'accumulent"
source: { chapter: 2, pages: "10-16" }
duration_min: 30
concepts:
  - id: java-telescoping-ctor
    label: "Constructeurs télescopiques : un constructeur par nombre d'options, illisible au-delà de 3-4 paramètres"
  - id: java-javabeans-inconsistent
    label: "Le patron JavaBeans (setters) : objet incohérent pendant sa construction et impossible à rendre immuable"
  - id: java-builder
    label: "Le Builder : obligatoires dans le constructeur du builder, options par méthodes chaînées, build() produit un objet immuable"
  - id: java-builder-validation
    label: "Où valider : chaque paramètre à son arrivée, les invariants multi-paramètres dans build(), sur les champs copiés"
  - id: java-builder-hierarchy
    label: "Builders hiérarchiques : Builder<T extends Builder<T>>, méthode self() et retour covariant de build()"
glossary:
  - term: "constructeur télescopique"
    definition: "Série de constructeurs qui ajoutent chacun un paramètre optionnel et délèguent au suivant avec this(...)."
  - term: "patron JavaBeans"
    definition: "Constructeur sans paramètre suivi d'appels à des setters. Simple à lire, mais l'objet est mutable et passe par des états incomplets."
  - term: "API fluide"
    definition: "API dont les méthodes renvoient l'objet lui-même pour enchaîner les appels : b.x(1).y(2).build()."
  - term: "type retour covariant"
    definition: "Une méthode redéfinie peut déclarer un type de retour plus précis que la méthode parente (build() renvoie Email au lieu de Message)."
  - term: "idiome du self-type simulé"
    definition: "Paramètre de type récursif T extends Builder<T> plus une méthode abstraite self() : les méthodes héritées renvoient le builder concret, sans cast."
visuals: []
labs: [java-ch01-l02-lab-http-request]
extra: false
xp: 30
---

## Pourquoi c'est important

En Go, tu passes une struct d'options ou des *functional options*. Java n'a ni paramètres nommés ni valeurs par défaut. Dès qu'une classe a plus de trois ou quatre paramètres, dont beaucoup facultatifs, il te faut une stratégie. Celle que tu choisis décide si tes objets peuvent être **immuables** et si un appel se **lit** sans ouvrir la documentation.

Tu croiseras des builders partout : `HttpRequest.newBuilder()` du JDK, `StringBuilder`, `Stream.builder()`, Lombok `@Builder`, les clients AWS, Protobuf…

## Le concept

Prenons une alerte de supervision : un nom et une sévérité obligatoires, puis des options (seuil, durée, canal, runbook…).

### Tentative 1 : les constructeurs télescopiques

```java
public Alert(String name, Severity sev) { this(name, sev, 0.9); }
public Alert(String name, Severity sev, double threshold) { this(name, sev, threshold, 5); }
public Alert(String name, Severity sev, double threshold, int minutes) { this(name, sev, threshold, minutes, "#ops"); }
// … et ainsi de suite
```

Ça fonctionne, mais l'appel `new Alert("cpu", WARN, 0.9, 10, "#ops", 3, true)` est indéchiffrable. Pire : deux `int` inversés **compilent** et donnent un comportement faux à l'exécution.

### Tentative 2 : le patron JavaBeans

```java
Alert a = new Alert();
a.setName("cpu");
a.setThreshold(0.9);
// oublié : setSeverity(...)
```

Lisible, mais :
- entre `new` et le dernier setter, l'objet est **incohérent**, et rien n'empêche de l'utiliser dans cet état. Le bug apparaîtra loin de sa cause ;
- l'objet ne peut pas être **immuable**, donc il faut penser à la sécurité entre threads (module 11).

### La solution : le Builder

```java
Alert cpu = new Alert.Builder("cpu", Severity.WARN)   // obligatoires
        .threshold(0.9)                               // options, dans n'importe quel ordre
        .forMinutes(10)
        .channel("#ops")
        .build();                                     // objet immuable
```

La forme classique :

```java
public final class Alert {
    private final String name;
    private final Severity severity;
    private final double threshold;
    private final int minutes;

    public static final class Builder {
        private final String name;              // obligatoires : final
        private final Severity severity;
        private double threshold = 0.9;         // options : valeurs par défaut au même endroit
        private int minutes = 5;

        public Builder(String name, Severity severity) {
            this.name = Objects.requireNonNull(name);
            this.severity = Objects.requireNonNull(severity);
        }
        public Builder threshold(double t) { threshold = t; return this; }
        public Builder forMinutes(int m) { minutes = m; return this; }
        public Alert build() { return new Alert(this); }
    }

    private Alert(Builder b) {                  // seul chemin de construction
        name = b.name;
        severity = b.severity;
        threshold = b.threshold;
        minutes = b.minutes;
    }
}
```

Points clés :
- le builder est une **classe imbriquée statique** (on verra pourquoi `static` au module 4) ;
- chaque méthode renvoie `this` : c'est une **API fluide** qui simule des paramètres nommés ;
- le constructeur de `Alert` est **privé** : on ne peut obtenir une alerte que par `build()`, donc toujours complète ;
- toutes les valeurs par défaut sont **au même endroit**.

### Où valider ?

Le plus tôt possible, au plus près de l'erreur :

| Ce qu'on vérifie | Où |
|---|---|
| Un paramètre obligatoire | constructeur du builder |
| Une option isolée (`threshold` entre 0 et 1) | sa méthode du builder |
| Un invariant entre plusieurs paramètres (`minutes > 0` si `severity == PAGE`) | dans `build()`, **après** avoir copié les valeurs dans l'objet |

Pourquoi après la copie ? Pour que l'objet vérifie **ses propres champs**, que plus personne ne peut changer. On retrouvera ce principe avec les copies défensives (module 8). En cas d'échec, lève une `IllegalArgumentException` dont le message dit **quel** paramètre est fautif.

### Un builder est réutilisable

On peut construire plusieurs objets avec le même builder, en changeant quelques options entre deux `build()`. Un builder peut aussi remplir des champs tout seul (un numéro de série qui s'incrémente). Conséquence : `build()` doit **copier** les structures mutables (listes, maps), sinon un objet déjà construit changerait quand on continue à utiliser le builder. Tu vas écrire ce test dans le lab.

### Builders hiérarchiques

Le Builder s'adapte aux hiérarchies de classes : une classe abstraite a un builder abstrait, chaque sous-classe concrète a son builder concret. Le problème : une méthode du builder parent renvoie le type **parent**, donc on perd les méthodes de l'enfant au milieu d'une chaîne.

```java
abstract class Message {
    final Set<Tag> tags;

    abstract static class Builder<T extends Builder<T>> {
        private final EnumSet<Tag> tags = EnumSet.noneOf(Tag.class);

        public T tag(Tag t) {
            tags.add(Objects.requireNonNull(t));
            return self();                       // renvoie le builder CONCRET
        }
        abstract Message build();
        protected abstract T self();            // chaque sous-classe renvoie this
    }

    Message(Builder<?> b) { tags = Set.copyOf(b.tags); }
}

final class Email extends Message {
    private final String to;

    static final class Builder extends Message.Builder<Builder> {
        private final String to;
        Builder(String to) { this.to = to; }
        @Override public Email build() { return new Email(this); }   // retour covariant
        @Override protected Builder self() { return this; }
    }

    private Email(Builder b) { super(b); to = b.to; }
}

Email e = new Email.Builder("ana@example.com").tag(Tag.URGENT).build();   // aucun cast
```

`Builder<T extends Builder<T>>` est un **paramètre de type récursif** (module 5) ; avec `self()`, il simule le « type de soi-même » que Java n'a pas. C'est l'**idiome du self-type simulé**. Le retour **covariant** de `build()` donne directement un `Email`. Autre petit bonus : chaque option a sa propre méthode, donc un builder peut accepter plusieurs paramètres variadiques, ou accumuler plusieurs appels (`tag` deux fois) dans un seul champ.

### Le prix

Il faut créer un objet de plus (le builder), ce qui ne compte presque jamais. Et c'est plus verbeux : réserve-le aux classes qui ont **au moins quatre paramètres**, ou qui en auront. Ajouter un builder plus tard laisse les anciens constructeurs traîner : si la classe va grossir, commence directement par un builder.

> **Au-delà du livre (Java 16+)** : pour une petite valeur à 2 ou 3 champs, tous obligatoires, un `record` avec un constructeur compact qui valide est plus simple qu'un builder. Le builder reste la bonne réponse quand les options s'accumulent.

## Pièges fréquents

- **Partager la collection du builder** avec l'objet construit : continuer à utiliser le builder modifie l'objet « immuable ». Copie dans le constructeur privé (`List.copyOf`, `Set.copyOf`).
- **Valider dans `build()` sur les champs du builder**, puis copier : entre les deux, rien ne change ici, mais prends l'habitude de vérifier l'objet final.
- **Oublier `self()`** dans une sous-classe : la compilation échoue, ce qui est voulu.
- **Mettre des setters dans l'objet construit** « au cas où » : tu perds l'immutabilité qui justifiait le builder.

## À retenir

- Télescopique : sûr mais illisible. JavaBeans : lisible mais incohérent et mutable. **Builder : sûr et lisible.**
- Obligatoires dans le constructeur du builder, options par méthodes chaînées, `build()` appelle un constructeur **privé**.
- Valide chaque paramètre à son arrivée, et les invariants croisés dans `build()` sur les champs copiés.
- Hiérarchies : `Builder<T extends Builder<T>>` + `self()` + `build()` covariant.

> **Source :** *Effective Java*, 3e éd., item 2 (pages 10 à 16).
