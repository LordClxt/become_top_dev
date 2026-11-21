---
id: spring-ch01-l02
title: "Résoudre une dépendance : par type, puis départager"
source: { book: spring-docs, chapter: 4, pages: "#beans-constructor-injection", url: "https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html" }
duration_min: 35
concepts:
  - id: spring-constructor-injection
    label: "Injection par constructeur : dépendances explicites, champs final, objet complet dès sa création et testable sans Spring"
  - id: spring-resolution-by-type
    label: "Le conteneur cherche les candidats par type ; s'il y en a plusieurs : @Primary (ou l'unique non-@Fallback), puis le nom du paramètre, puis @Priority, sinon erreur"
  - id: spring-primary-qualifier
    label: "@Primary désigne le gagnant par défaut, @Fallback s'efface devant tout autre candidat, @Qualifier exige un bean précis"
  - id: spring-collection-injection
    label: "List<T> injecte tous les beans du type (triés par @Order), Map<String, T> les indexe par nom ; sans candidat, la collection est vide"
  - id: spring-objectprovider
    label: "ObjectProvider<T> : dépendance optionnelle (getIfAvailable), tolérante à l'ambiguïté (getIfUnique) ou redemandée à chaque appel (getObject)"
glossary:
  - term: "candidat"
    definition: "Un bean dont le type convient à un point d'injection. Le conteneur doit en retenir exactement un, sinon il refuse de démarrer."
  - term: "@Primary"
    definition: "Marque le bean choisi quand plusieurs candidats conviennent et qu'on en demande un seul."
  - term: "@Fallback"
    definition: "Spring 6.2 : l'inverse de @Primary. Le bean n'est choisi que s'il n'y a aucun autre candidat."
  - term: "@Qualifier"
    definition: "Restreint les candidats à un bean précis (par son nom ou une étiquette). Se pose sur le point d'injection et, si besoin, sur le bean."
  - term: "ObjectProvider<T>"
    definition: "Un accès différé à un bean : on le demande au moment voulu, et on choisit quoi faire s'il manque ou s'il y en a plusieurs."
  - term: "-parameters"
    definition: "Option du compilateur javac qui garde le nom des paramètres dans le bytecode. Sans elle, Spring ne connaît pas le nom d'un paramètre de constructeur."
visuals: [spring-ch01-resolution-steps]
labs: [spring-ch01-l02-lab-payment-gateways]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Le paramètre s'appelle `stripe`, mais `paypal` est `@Primary`. Qu'affiche le programme ?"
    code: |
      import org.springframework.context.annotation.*;

      public class Main {
          interface Gateway { }
          static class Stripe implements Gateway { public String toString() { return "stripe"; } }
          static class Paypal implements Gateway { public String toString() { return "paypal"; } }
          record Checkout(Gateway gateway) { }

          @Configuration
          static class Config {
              @Bean Gateway stripe() { return new Stripe(); }
              @Bean @Primary Gateway paypal() { return new Paypal(); }
              @Bean Checkout checkout(Gateway stripe) { return new Checkout(stripe); }
          }

          public static void main(String[] args) {
              try (var ctx = new AnnotationConfigApplicationContext(Config.class)) {
                  System.out.println(ctx.getBean(Checkout.class).gateway());
              }
          }
      }
    answer: "paypal"
    explanation: "@Primary est examiné en premier : dès qu'un candidat est primaire, le nom du paramètre n'est même pas regardé. Le nom ne sert qu'à départager des candidats dont aucun n'est @Primary."
    concept: spring-resolution-by-type
  - id: c2
    type: code-output
    prompt: "Qu'affiche le programme ?"
    code: |
      import org.springframework.context.annotation.*;
      import org.springframework.core.annotation.Order;
      import java.util.*;

      public class Main {
          interface Check { }
          @Order(2) static class Capacity implements Check { public String toString() { return "capacité"; } }
          @Order(1) static class Fraud implements Check { public String toString() { return "fraude"; } }
          record Pipeline(List<Check> checks, Map<String, Check> byName) { }

          @Configuration
          static class Config {
              @Bean Check capacityCheck() { return new Capacity(); }
              @Bean Check fraudCheck() { return new Fraud(); }
              @Bean Pipeline pipeline(List<Check> checks, Map<String, Check> byName) { return new Pipeline(checks, byName); }
          }

          public static void main(String[] args) {
              try (var ctx = new AnnotationConfigApplicationContext(Config.class)) {
                  Pipeline p = ctx.getBean(Pipeline.class);
                  System.out.println(p.checks() + " " + p.byName().keySet());
              }
          }
      }
    answer: "[fraude, capacité] [capacityCheck, fraudCheck]"
    explanation: "La List est triée par @Order (le plus petit d'abord), donc fraude avant capacité. La Map garde l'ordre d'enregistrement des beans et les indexe par nom : capacityCheck, puis fraudCheck."
    concept: spring-collection-injection
  - id: c3
    type: single
    prompt: "`Refunds` dépend d'un `FraudCheck` qui n'existe que dans certains déploiements. Quelle signature de constructeur permet de démarrer sans lui ?"
    choices:
      - "`Refunds(FraudCheck fraudCheck)` avec un `if (fraudCheck != null)`"
      - "`Refunds(ObjectProvider<FraudCheck> fraudCheck)`, puis `getIfAvailable()` au moment de rembourser"
      - "`Refunds(@Lazy FraudCheck fraudCheck)`"
      - "Déclarer un faux `FraudCheck` qui accepte tout dans la configuration de base"
    answer: 1
    explanation: "Un paramètre FraudCheck simple est obligatoire : sans bean, le démarrage échoue avant même le if. @Lazy injecte un proxy qui échouerait au premier appel. Un faux bean cache l'absence au lieu de la gérer. ObjectProvider rend l'absence explicite et testable."
    concept: spring-objectprovider
---

## Pourquoi c'est important

Mardi, l'équipe paiement ajoute PayPal à côté de Stripe : un nouveau bean `PaymentGateway`. Aucune ligne de `Checkout` n'a changé, et pourtant l'application **ne démarre plus** :

```
No qualifying bean of type 'PaymentGateway' available:
expected single matching bean but found 2: stripe,paypal
```

Le conteneur refuse de choisir au hasard. C'est une bonne nouvelle : il aurait pu prendre le premier venu et débiter tous les clients sur le mauvais compte. Mais il faut savoir **comment il choisit**, pour lui donner exactement l'information qui manque, au bon endroit.

## L'injection par constructeur

Une classe déclare ce dont elle a besoin dans son constructeur, c'est tout :

```java
public class Checkout {
    private final PaymentGateway gateway;

    public Checkout(PaymentGateway gateway) {
        this.gateway = gateway;
    }
}
```

Avec un **seul** constructeur, Spring l'utilise sans annotation (`@Autowired` n'est nécessaire que pour choisir entre plusieurs constructeurs). C'est la forme que la documentation de Spring recommande :

:::compare
--- bad: Injection par champ
```java
@Service
public class Checkout {
    @Autowired private PaymentGateway gateway;   // ni final, ni visible
}
```
Impossible de créer un `Checkout` valide sans Spring (le champ reste `null` dans un test), dépendances invisibles dans l'API, et rien n'empêche d'en ajouter quinze.
--- good: Injection par constructeur
```java
@Service
public class Checkout {
    private final PaymentGateway gateway;
    public Checkout(PaymentGateway gateway) { this.gateway = gateway; }
}
```
Champ `final`, objet complet dès sa création, test unitaire avec un simple `new Checkout(fake)`. Un constructeur à huit paramètres te dit que la classe en fait trop.
:::

> **En production :** depuis Spring Boot 2.6, les dépendances circulaires (A a besoin de B qui a besoin de A) sont **interdites par défaut**. Avec l'injection par constructeur, un cycle est de toute façon impossible à construire : le conteneur le détecte et l'explique au démarrage. C'est le signe d'un découpage à revoir, pas d'une option à activer.

## Comment le conteneur choisit

Pour chaque paramètre, le conteneur suit les mêmes étapes (méthode `doResolveDependency` de `DefaultListableBeanFactory`) :

1. **Trouver les candidats par type.** Tous les beans dont le type convient : la classe exacte, une sous-classe ou une implémentation. Les génériques comptent : un paramètre `Supplier<String>` ne reçoit pas un `Supplier<Integer>`. Si un `@Qualifier` est posé, il filtre la liste.
2. **Un seul candidat ?** C'est lui. **Aucun ?** Erreur au démarrage (sauf dépendance optionnelle, voir plus bas).
3. **Plusieurs candidats ?** Le conteneur départage, dans cet ordre (méthode `determineAutowireCandidate`) :
   - le candidat **`@Primary`**, ou, s'il n'y en a pas, l'unique candidat qui n'est pas **`@Fallback`** ;
   - le candidat dont le **nom** est celui du paramètre (ou du champ) ;
   - le candidat de plus haute **`@Priority`** ;
   - sinon : `NoUniqueBeanDefinitionException`, et le démarrage échoue.

::visual{id="spring-ch01-resolution-steps"}

::checkpoint{id="c1"}

> **Sous le capot :** le départage par **nom de paramètre** suppose que Spring connaisse ce nom. Or le compilateur Java ne le garde dans le bytecode qu'avec l'option `-parameters`. Les plugins Maven et Gradle de Spring Boot l'activent pour toi, et le bac à sable de ce cours aussi (`jboot`). Compile la même classe avec un `javac` nu, et le nom disparaît : `checkout(Gateway paypal)` ne suffit plus à choisir, le démarrage échoue. Spring 6.1 a d'ailleurs supprimé l'ancienne astuce qui lisait les noms dans les informations de débogage. Ne compte pas sur le nom : sois explicite.

## Départager : les trois outils

**`@Primary`** : « en cas de doute, c'est moi ». Il se pose sur le bean, une fois pour toutes. Idéal pour un choix par défaut à l'échelle de l'application (Stripe pour tous les paiements standard).

**`@Fallback`** (Spring 6.2) : l'inverse. « Prends-moi seulement s'il n'y a personne d'autre. » Parfait pour une implémentation par défaut qu'un module ou un test peut remplacer sans rien annuler : déclare-la `@Fallback`, et le premier bean concurrent la masque.

**`@Qualifier`** : le point d'injection exige un bean précis.

```java
@Bean
Refunds refunds(@Qualifier("paypal") PaymentGateway gateway) { ... }
```

`@Primary` décide **côté fournisseur**, pour tout le monde ; `@Qualifier` décide **côté client**, pour ce point d'injection seulement. Un `@Qualifier` l'emporte toujours sur `@Primary`, puisqu'il filtre les candidats avant le départage.

## Recevoir tous les candidats

Parfois on ne veut pas choisir : on veut **tous** les beans d'un type.

- `List<PaymentGateway>` : tous les candidats, triés par `@Order` (ou `Ordered`), du plus petit au plus grand ;
- `Map<String, PaymentGateway>` : tous les candidats, **indexés par leur nom de bean**.

::checkpoint{id="c2"}

C'est la base du patron *stratégie* à la Spring : un routeur reçoit la `Map` et choisit à l'exécution. Ajouter un prestataire, c'est ajouter un bean, sans toucher au routeur (le lab le vérifie). Sans aucun candidat, Spring 7 injecte une collection **vide**, sans erreur.

## Les dépendances optionnelles ou différées

`ObjectProvider<T>` ne donne pas le bean, mais **un moyen de le demander** :

| méthode | aucun candidat | un candidat | plusieurs candidats |
|---|---|---|---|
| `getObject()` | erreur | le bean | erreur |
| `getIfAvailable()` | `null` | le bean | erreur |
| `getIfUnique()` | `null` | le bean | `null` |
| `stream()` / `orderedStream()` | vide | lui | tous |

Trois usages : une dépendance **optionnelle** (le contrôle anti-fraude de certains déploiements), une dépendance **coûteuse** demandée seulement si besoin, et une dépendance **redemandée à chaque fois** (indispensable pour les prototypes, leçon 3).

::checkpoint{id="c3"}

> **Astuce :** `Optional<FraudCheck>` en paramètre marche aussi pour une dépendance optionnelle. `ObjectProvider` va plus loin : il repousse la recherche au moment de l'appel, et il gère l'ambiguïté. Préfère-le dès que la dépendance peut changer de nature selon le déploiement.

## Pièges fréquents

- **Résoudre l'ambiguïté en renommant un paramètre** : ça marche grâce à `-parameters`, mais l'intention est invisible et fragile. Mets `@Primary` ou `@Qualifier`.
- **Deux beans `@Primary` du même type** : erreur au démarrage (« more than one 'primary' bean found »).
- **Injecter un `FraudCheck` obligatoire et tester `!= null`** : sans bean, le démarrage échoue avant d'arriver au `if`.
- **Un faux bean « qui ne fait rien »** pour faire démarrer l'application : il cache l'absence au lieu de la gérer, et finit en production.

## À retenir

- Un constructeur, des champs `final` : c'est l'injection par défaut.
- Le conteneur cherche **par type**, puis départage : `@Primary` / `@Fallback`, puis le **nom**, puis `@Priority`. Sinon il refuse de démarrer.
- `@Primary` décide pour tous, `@Qualifier` pour un point d'injection.
- `List<T>` et `Map<String, T>` donnent tous les candidats ; `ObjectProvider<T>` rend une dépendance optionnelle, tolérante ou différée.

> **Source :** Spring Framework 7.0, [Dependency Injection](https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html), [Using @Autowired](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired.html) et [Fine-tuning Annotation-based Autowiring with Qualifiers](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired-qualifiers.html) ; code de [`DefaultListableBeanFactory.determineAutowireCandidate`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-beans/src/main/java/org/springframework/beans/factory/support/DefaultListableBeanFactory.java) (v7.0.11).
