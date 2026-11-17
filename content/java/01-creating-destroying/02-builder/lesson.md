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
visuals: [java-ch01-alert-builder]
labs: [java-ch01-l02-lab-http-request]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: single
    prompt: "La signature est `Reservation(String guest, String room, int nights, int adults)`. Un appel écrit `new Reservation(\"Ana\", \"204\", 2, 3)` pour 3 nuits et 2 adultes. Que se passe-t-il ?"
    choices:
      - "Le compilateur refuse l'appel"
      - "Une exception est levée à l'exécution"
      - "Tout compile et s'exécute : la réservation fait 2 nuits pour 3 adultes"
      - "Java réordonne les arguments d'après leurs noms"
    answer: 2
    explanation: "Le compilateur ne vérifie que les types, et deux int restent deux int quel que soit leur ordre. Un builder nomme chaque valeur (nights(3).adults(2)), ce qui rend l'inversion visible à la lecture."
    concept: java-telescoping-ctor
  - id: c2
    type: code-output
    prompt: "Ce builder est réutilisé pour deux requêtes. Qu'affiche le programme ?"
    code: |
      public class Main {
          static final class Request {
              final List<String> headers;
              Request(Builder b) { headers = b.headers; }
              static final class Builder {
                  final List<String> headers = new ArrayList<>();
                  Builder header(String h) { headers.add(h); return this; }
                  Request build() { return new Request(this); }
              }
          }

          public static void main(String[] args) {
              Request.Builder b = new Request.Builder().header("Accept");
              Request first = b.build();
              Request second = b.header("Auth").build();
              System.out.println(first.headers.size() + " " + (first.headers == second.headers));
          }
      }
    answer: "2 true"
    explanation: "Les deux requêtes et le builder pointent vers la même ArrayList : ajouter Auth pour la seconde modifie aussi la première. build() doit copier la liste (List.copyOf) pour que chaque objet construit soit indépendant du builder."
    concept: java-builder
  - id: c3
    type: single
    prompt: "Un builder de `Booking` reçoit `checkIn(...)` et `checkOut(...)`, dans n'importe quel ordre. Où vérifier que checkOut est après checkIn ?"
    choices:
      - "Dans checkIn(), en comparant avec checkOut"
      - "Dans checkOut(), en comparant avec checkIn"
      - "Dans build() ou le constructeur privé, sur les champs copiés dans Booking"
      - "Nulle part : c'est à l'appelant de faire attention"
    answer: 2
    explanation: "Tant que les deux dates ne sont pas connues, aucune méthode du builder ne peut trancher, puisque l'ordre des appels est libre. On vérifie donc une fois tout reçu, sur les champs de l'objet final que plus personne ne peut modifier."
    concept: java-builder-validation
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

::checkpoint{id="c1"}

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

La même alerte, écrite des trois façons :

:::compare
--- bad: Constructeur télescopique
```java
new Alert("cpu", WARN, 0.9, 10, "#ops", 3, true);
```
Que vaut `10` ? Et `3` ? Il faut ouvrir la classe pour le savoir.
--- bad: Patron JavaBeans
```java
Alert a = new Alert();
a.setName("cpu");
a.setSeverity(Severity.WARN);
a.setThreshold(0.9);
a.setMinutes(10);
```
Lisible, mais `a` existe déjà, incomplet, pendant quatre lignes.
--- good: Builder
```java
Alert cpu = new Alert.Builder("cpu", Severity.WARN)   // obligatoires
        .threshold(0.9)                               // options, dans n'importe quel ordre
        .forMinutes(10)
        .channel("#ops")
        .build();                                     // objet immuable
```
Chaque valeur est nommée, et l'alerte n'existe qu'une fois complète.
:::

La forme classique, ligne par ligne :

:::steps
```java title="Alert.java"
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
--- 1-5: Tous les champs de `Alert` sont `final` : une fois construite, une alerte ne change plus jamais.
--- 7: Le builder est une **classe imbriquée statique** (on verra pourquoi `static` au module 4). Il vit à côté de la classe qu'il construit.
--- 8-11: Il copie les mêmes champs. Les obligatoires sont `final`, les options reçoivent leur **valeur par défaut**, toutes au même endroit.
--- 13-16: Son constructeur exige les paramètres obligatoires et les vérifie tout de suite : impossible de commencer une alerte sans nom.
--- 17-18: Chaque option renvoie `this`. C'est une **API fluide** : `.threshold(0.9).forMinutes(10)` se lit comme des paramètres nommés.
--- 19,22-27: `build()` appelle le constructeur **privé** de `Alert`, seul chemin de construction : on ne peut obtenir une alerte que par `build()`, donc toujours complète.
:::

### Où valider ?

Le plus tôt possible, au plus près de l'erreur :

| Ce qu'on vérifie | Où |
|---|---|
| Un paramètre obligatoire | constructeur du builder |
| Une option isolée (`threshold` entre 0 et 1) | sa méthode du builder |
| Un invariant entre plusieurs paramètres (`minutes > 0` si `severity == PAGE`) | dans `build()`, **après** avoir copié les valeurs dans l'objet |

:::reveal Pourquoi valider après la copie, et pas sur les champs du builder ?
Parce que le builder reste modifiable : quelqu'un peut encore appeler une de ses méthodes. Une fois les valeurs copiées dans l'objet, l'objet vérifie **ses propres champs**, que plus personne ne peut changer. Ce qui a été validé est exactement ce qui sera utilisé.
:::

> **Java 25 :** dans un builder **hiérarchique** (plus bas), le constructeur d'une sous-classe peut désormais valider et affecter ses propres champs **avant** `super(builder)` (module 0, leçon 2). Si le constructeur parent appelle une méthode redéfinie, elle verra déjà des champs valides. On retrouvera ce principe avec les copies défensives (module 8). En cas d'échec, lève une `IllegalArgumentException` dont le message dit **quel** paramètre est fautif.

::checkpoint{id="c3"}

### Un builder est réutilisable

On peut construire plusieurs objets avec le même builder, en changeant quelques options entre deux `build()`. Un builder peut aussi remplir des champs tout seul (un numéro de série qui s'incrémente). Conséquence : `build()` doit **copier** les structures mutables (listes, maps), sinon un objet déjà construit changerait quand on continue à utiliser le builder. Tu vas écrire ce test dans le lab.

::checkpoint{id="c2"}

À toi de construire une alerte : enchaîne les appels, provoque chaque erreur, puis coupe la copie défensive et continue à utiliser le builder après un `build()`.

::visual{id="java-ch01-alert-builder"}

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
