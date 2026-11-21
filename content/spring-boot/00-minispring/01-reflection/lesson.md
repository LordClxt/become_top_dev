---
id: spring-ch00-l01
title: "La réflexion : ce que le conteneur voit de ta classe"
source: { book: jdk-docs, chapter: 1, pages: "java.lang.reflect", url: "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/reflect/package-summary.html" }
duration_min: 30
concepts:
  - id: spring-ch00-reflection-read
    label: "Par réflexion, un conteneur lit une classe à l'exécution : annotations, constructeurs, types des paramètres, puis l'instancie avec Constructor.newInstance"
  - id: spring-ch00-annotation-retention
    label: "Une annotation n'est visible à l'exécution que si elle est @Retention(RUNTIME) ; sinon le conteneur ne la voit jamais"
  - id: spring-ch00-bean-naming
    label: "Nom par défaut d'un bean : le nom simple de la classe avec une minuscule, sauf si les deux premières lettres sont majuscules (règle JavaBeans)"
  - id: spring-ch00-generic-types
    label: "getParameterTypes donne le type effacé (List), getGenericParameterTypes garde l'argument (List<Gateway>) : c'est ce qui permet d'injecter une List<T>"
glossary:
  - term: "réflexion"
    definition: "L'API du JDK (java.lang.reflect) qui permet à un programme d'examiner et d'utiliser des classes à l'exécution : lire leurs annotations, leurs constructeurs, leurs méthodes, et les appeler."
  - term: "rétention"
    definition: "Jusqu'où une annotation survit : dans le code source seulement (SOURCE), dans le fichier .class (CLASS, la valeur par défaut) ou jusqu'à l'exécution (RUNTIME)."
  - term: "effacement de type"
    definition: "Le compilateur retire les arguments de type des génériques du code exécuté : à l'exécution, un List<String> est un List. Les signatures des méthodes et des constructeurs, elles, les gardent."
  - term: "ParameterizedType"
    definition: "Le type Java qui représente un générique avec ses arguments, comme List<Gateway> : getRawType() donne List, getActualTypeArguments() donne [Gateway]."
visuals: [spring-ch00-reflection-map]
labs: [spring-ch00-l01-lab-warmup-inspector]
extra: true
xp: 25
checkpoints:
  - id: c1
    type: code-output
    prompt: "Deux annotations, une seule différence : la rétention. Qu'affiche le programme ?"
    code: |
      import java.lang.annotation.*;

      public class Main {
          @Retention(RetentionPolicy.RUNTIME) @interface Component { }
          @interface Service { }   // pas de @Retention : CLASS par défaut

          @Component static class Catalog { }
          @Service static class Pricing { }

          public static void main(String[] args) {
              System.out.println(Catalog.class.isAnnotationPresent(Component.class) + " "
                      + Pricing.class.isAnnotationPresent(Service.class));
          }
      }
    answer: "true false"
    explanation: "Sans @Retention(RUNTIME), l'annotation est écrite dans le fichier .class mais la JVM ne la charge pas : la réflexion ne la voit pas. Un conteneur qui cherche @Service ne trouverait jamais Pricing, sans aucune erreur. Les annotations de Spring sont toutes RUNTIME."
    concept: spring-ch00-annotation-retention
  - id: c2
    type: code-output
    prompt: "Qu'affiche le programme ?"
    code: |
      import java.beans.Introspector;

      public class Main {
          public static void main(String[] args) {
              for (String name : new String[] { "PriceCalculator", "URLParser", "A", "IOStream" }) {
                  System.out.print(Introspector.decapitalize(name) + " ");
              }
              System.out.println();
          }
      }
    answer: "priceCalculator URLParser a IOStream"
    explanation: "La règle des JavaBeans : la première lettre passe en minuscule, sauf si les deux premières sont des majuscules, auquel cas le nom ne change pas. Spring applique la même règle à ses noms de beans : un @Component class URLParser s'appelle URLParser, pas uRLParser ni urlParser."
    concept: spring-ch00-bean-naming
  - id: c3
    type: code-output
    prompt: "Qu'affiche le programme ?"
    code: |
      import java.util.List;

      public class Main {
          static class Router { Router(List<String> gateways) { } }

          public static void main(String[] args) {
              var ctor = Router.class.getDeclaredConstructors()[0];
              System.out.println(ctor.getParameterTypes()[0].getSimpleName());
              System.out.println(ctor.getGenericParameterTypes()[0].getTypeName());
          }
      }
    answer: "List\njava.util.List<java.lang.String>"
    explanation: "À l'exécution, l'objet passé n'est qu'un List : le type est effacé. Mais la signature du constructeur garde List<String> dans le fichier .class, et getGenericParameterTypes la rend. C'est grâce à elle qu'un conteneur sait quels beans mettre dans la liste."
    concept: spring-ch00-generic-types
---

## Pourquoi c'est important

Tu écris `@Service` sur une classe, et Spring la trouve, la crée, lui passe ses dépendances. Il n'a jamais vu ton code source : il travaille sur des classes **compilées**, à l'exécution. Tout ce qu'il sait de ta classe, il l'apprend par **réflexion**.

Ce module construit **Minispring**, un conteneur en Java pur, pour que tu puisses ensuite prédire ce que fait le vrai. Première brique : savoir ce qu'un conteneur peut lire d'une classe, et ce qu'il ne verra jamais. Un `@Service` défini sans `@Retention(RUNTIME)` est un composant invisible : aucune erreur, aucun bean.

## Ce qu'une classe dit d'elle-même

Tout part de l'objet `Class<?>`, que la JVM crée en chargeant une classe. Le conteneur lui pose trois questions :

| Question | Réflexion |
|---|---|
| Est-ce un composant ? | `type.isAnnotationPresent(Component.class)` |
| Comment fabriquer un objet ? | `type.getDeclaredConstructors()` |
| De quoi a-t-il besoin ? | `constructor.getParameterTypes()` |

Puis, pour créer l'objet :

```java
Constructor<?> ctor = type.getDeclaredConstructors()[0];
ctor.setAccessible(true);                 // même si le constructeur n'est pas public
Object bean = ctor.newInstance(args);     // args : les dépendances, dans l'ordre des paramètres
```

::visual{id="spring-ch00-reflection-map"}

`setAccessible(true)` lève le contrôle d'accès de Java : c'est ainsi qu'un conteneur appelle un constructeur ou une méthode `private` (comme une méthode `@PostConstruct` privée, leçon 4). Une exception levée **par** le constructeur appelé arrive enveloppée dans une `InvocationTargetException` : il faut en extraire la cause pour donner un message utile.

## Les annotations, et leur rétention

Une annotation est une étiquette posée sur du code. Elle ne fait rien par elle-même : quelqu'un doit la **lire**. Encore faut-il qu'elle soit encore là au moment de la lecture.

::checkpoint{id="c1"}

La **rétention** dit jusqu'où l'annotation survit :
- `SOURCE` : effacée par le compilateur (exemple : `@Override`, utile au seul compilateur) ;
- `CLASS` (par défaut) : écrite dans le `.class`, mais **non chargée** par la JVM ;
- `RUNTIME` : disponible par réflexion.

Pour un conteneur qui découvre ses composants à l'exécution, seule `RUNTIME` compte. Les annotations de Spring (`@Component`, `@Autowired`…) et de Jakarta (`@PostConstruct`, `@Inject`) sont toutes `RUNTIME`.

> **Sous le capot :** pour trouver les composants dans un paquet, Spring ne charge pas chaque classe du paquet : sur une grosse application, ce serait lent et remplirait la mémoire de classes inutiles. `ClassPathScanningCandidateComponentProvider` lit directement les fichiers `.class` et leurs annotations, sans charger les classes. Spring 7 sur un JDK 24 ou plus utilise pour cela l'API ClassFile du JDK (`ClassFileMetadataReaderFactory`), et sa propre copie d'ASM sur les JDK plus anciens. Seules les classes retenues sont ensuite chargées. Minispring, lui, reçoit directement la liste des classes.

## Le nom d'un bean

Un conteneur identifie chaque bean par un **nom**. Sans nom explicite, Spring le déduit de la classe, selon la règle des JavaBeans, que le JDK fournit dans `java.beans.Introspector.decapitalize` :

::checkpoint{id="c2"}

> **Sous le capot :** dans Spring 7, `AnnotationBeanNameGenerator.buildDefaultBeanName` prend le nom court de la classe et appelle `StringUtils.uncapitalizeAsProperty`, qui suit cette même règle. C'est pourquoi un `@Qualifier("urlParser")` sur une classe `URLParser` ne trouve rien.

## Les génériques : ce qui reste après l'effacement

Java efface les arguments de type à l'exécution : un `List<Gateway>` reçu par un constructeur est un simple `List`. Comment un conteneur saurait-il qu'il faut y mettre des `Gateway` ? Parce que la **signature** du constructeur, elle, garde l'information.

::checkpoint{id="c3"}

`getGenericParameterTypes()` renvoie un `Type` : une `Class` pour un type simple, ou un `ParameterizedType` pour `List<Gateway>`, dont `getActualTypeArguments()[0]` vaut `Gateway.class`. Tu t'en serviras dans l'assignment pour injecter `List<T>` et `Provider<T>`, comme Spring injecte `List<T>` et `ObjectProvider<T>`.

> **Attention :** la réflexion a un coût (vérifications d'accès, appels indirects). Un conteneur s'en sert au **démarrage**, pour lire et créer ; une fois les objets assemblés, ils s'appellent directement, sans réflexion. C'est l'une des raisons pour lesquelles un démarrage Spring prend du temps, et ce que l'AOT de Spring déplace à la compilation (module 14).

## Pièges fréquents

- **Une annotation maison sans `@Retention(RUNTIME)`** : invisible pour le conteneur, sans erreur.
- **Oublier `setAccessible(true)`** pour un constructeur ou une méthode non publique : `IllegalAccessException`.
- **Afficher l'`InvocationTargetException` elle-même** : son message est vide, la vraie erreur est dans `getCause()`.
- **Lire `getParameterTypes()` pour un paramètre générique** : `List`, sans son argument.

## À retenir

- Un conteneur ne voit que ce que la réflexion expose : annotations `RUNTIME`, constructeurs, types des paramètres.
- Nom par défaut d'un bean : la règle JavaBeans (`priceCalculator`, mais `URLParser`).
- `getGenericParameterTypes()` garde `List<Gateway>` : c'est ce qui rend possibles les injections de collections.
- La réflexion sert au démarrage ; ensuite, les objets s'appellent directement.

> **Source :** Javadoc du JDK 25, [`java.lang.reflect`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/reflect/package-summary.html), [`RetentionPolicy`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/annotation/RetentionPolicy.html) et [`Introspector.decapitalize`](https://docs.oracle.com/en/java/javase/25/docs/api/java.desktop/java/beans/Introspector.html) ; code de Spring Framework 7.0.11 : [`AnnotationBeanNameGenerator`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-context/src/main/java/org/springframework/context/annotation/AnnotationBeanNameGenerator.java) et [`ClassPathScanningCandidateComponentProvider`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-context/src/main/java/org/springframework/context/annotation/ClassPathScanningCandidateComponentProvider.java).
