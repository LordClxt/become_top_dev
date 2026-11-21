---
id: spring-ch02-l01
title: "Deux façons de se faire passer pour un objet : proxy JDK et CGLIB"
source: { book: spring-docs, chapter: 20, pages: "#aop-understanding-aop-proxies", url: "https://docs.spring.io/spring-framework/reference/core/aop/proxying.html" }
duration_min: 30
concepts:
  - id: spring-ch02-jdk-vs-cglib
    label: "Un proxy JDK implémente les interfaces de la cible (c'est un frère) ; un proxy CGLIB est une sous-classe générée (c'est un fils)"
  - id: spring-ch02-proxy-factory
    label: "ProxyFactory fabrique un proxy à partir d'une cible et de comportements (advice) ; il choisit JDK si la cible a des interfaces, CGLIB sinon"
  - id: spring-ch02-final-limit
    label: "Une sous-classe ne redéfinit ni une classe final, ni une méthode final ou private : ces appels échappent au proxy ; et les champs du proxy ne sont pas ceux de la cible"
glossary:
  - term: "proxy"
    definition: "Un objet qui se fait passer pour un autre (la cible) : il reçoit les appels, ajoute un comportement avant ou après, et les délègue."
  - term: "CGLIB"
    definition: "Bibliothèque de génération de bytecode, intégrée (copiée) dans spring-core, qui fabrique des sous-classes à l'exécution."
  - term: "Objenesis"
    definition: "Bibliothèque qui crée un objet sans appeler son constructeur. Spring s'en sert pour instancier les proxies CGLIB."
  - term: "advice"
    definition: "Le comportement ajouté par un proxy autour d'un appel (mesurer, réessayer, ouvrir une transaction). En français : un conseil."
visuals: [spring-ch02-two-proxies]
labs: [spring-ch02-l01-lab-warmup-timing-proxy]
extra: false
xp: 25
checkpoints:
  - id: c1
    type: code-output
    prompt: "La cible implémente une interface. Qu'affiche le programme ?"
    code: |
      import org.springframework.aop.framework.ProxyFactory;
      import org.springframework.aop.support.AopUtils;

      public class Main {
          interface Catalog { String find(String id); }
          static class MemoryCatalog implements Catalog { public String find(String id) { return "événement " + id; } }

          public static void main(String[] args) {
              Object proxy = new ProxyFactory(new MemoryCatalog()).getProxy();
              System.out.println(AopUtils.isJdkDynamicProxy(proxy) + " "
                      + (proxy instanceof Catalog) + " " + (proxy instanceof MemoryCatalog));
          }
      }
    answer: "true true false"
    explanation: "Avec une interface, ProxyFactory fabrique un proxy JDK : une nouvelle classe qui implémente Catalog, sans rien à voir avec MemoryCatalog. Tout code qui attend un MemoryCatalog (injection par la classe, cast) échoue avec ce proxy."
    concept: spring-ch02-jdk-vs-cglib
  - id: c2
    type: code-output
    prompt: "La cible n'a pas d'interface : le proxy est une sous-classe. Combien de fois le constructeur est-il appelé ?"
    code: |
      import org.springframework.aop.framework.ProxyFactory;

      public class Main {
          static class Prices {
              static int created;
              Prices() { created++; }
              public int total(int base, int seats) { return base * seats; }
          }

          public static void main(String[] args) {
              Prices target = new Prices();
              Prices proxy = (Prices) new ProxyFactory(target).getProxy();
              System.out.println(Prices.created + " " + proxy.total(10, 3) + " " + proxy.getClass().getSimpleName());
          }
      }
    answer: "1 30 Main$Prices$$SpringCGLIB$$0"
    explanation: "Le proxy est une sous-classe générée (son nom contient $$SpringCGLIB$$), mais Spring l'instancie avec Objenesis, sans appeler le constructeur : seul le new de la cible a compté. Un constructeur qui ouvre une connexion ne l'ouvre donc pas une deuxième fois."
    concept: spring-ch02-jdk-vs-cglib
  - id: c3
    type: code-output
    prompt: "On modifie un champ public… sur le proxy. Qu'affiche le programme ?"
    code: |
      import org.springframework.aop.framework.ProxyFactory;

      public class Main {
          static class Locker {
              public int failures;
              public int failures() { return failures; }
          }

          public static void main(String[] args) {
              Locker proxy = (Locker) new ProxyFactory(new Locker()).getProxy();
              proxy.failures = 2;
              System.out.println(proxy.failures + " " + proxy.failures());
          }
      }
    answer: "2 0"
    explanation: "Un proxy CGLIB est un objet à part entière, avec ses propres champs. L'affectation modifie le champ du proxy ; la méthode, elle, est déléguée à la cible, dont le champ vaut toujours 0. Avec un bean Spring proxifié, on ne touche jamais aux champs de l'extérieur : on passe par des méthodes."
    concept: spring-ch02-final-limit
---

## Pourquoi c'est important

Le module 01 l'a montré : `@Transactional`, `@Async`, `@Cacheable` et `@Retryable` ne contiennent aucun code. Un post-processor remplace ton bean par un **proxy**, qui ajoute le comportement autour de chaque appel. Presque toutes les surprises de Spring en production viennent de là : une transaction qui ne s'ouvre pas, un `ClassCastException` sur `$Proxy42`, une méthode `final` qui « ignore » son annotation, un champ qui vaut `null` alors qu'il a été rempli.

Pour les prédire, il faut savoir **comment** un proxy se fait passer pour ton objet. Java en offre deux façons, et Spring utilise les deux.

## Le proxy JDK : un frère qui porte la même interface

Le JDK sait fabriquer, à l'exécution, une classe qui **implémente des interfaces** et renvoie chaque appel vers un `InvocationHandler` (`java.lang.reflect.Proxy`, module 01). Ce proxy est un **frère** de la cible : même interface, aucune parenté de classe.

::checkpoint{id="c1"}

Conséquence : le proxy n'est utilisable que par l'interface. Un bean injecté par sa classe concrète (`MemoryCatalog`) ne trouve plus aucun candidat.

## Le proxy CGLIB : un fils qui redéfinit les méthodes

Sans interface, Spring génère une **sous-classe** de la cible, avec CGLIB (une bibliothèque de génération de bytecode que Spring embarque dans `spring-core`). Chaque méthode redéfinissable est redéfinie pour passer par les comportements ajoutés, puis appeler la vraie cible.

::checkpoint{id="c2"}

Spring instancie cette sous-classe avec **Objenesis**, sans appeler ton constructeur : la cible, elle, a déjà été construite normalement. La documentation le précise : *the constructor of your proxied object will not be called twice*.

## Choisir : ProxyFactory

`ProxyFactory` est l'outil de Spring qui fabrique un proxy à partir d'une cible et de comportements :

```java
ProxyFactory factory = new ProxyFactory(target);
factory.addAdvice((MethodInterceptor) invocation -> {
    long start = System.nanoTime();
    try {
        return invocation.proceed();          // appelle la cible (ou le comportement suivant)
    } finally {
        System.out.println(invocation.getMethod().getName() + " : " + (System.nanoTime() - start) + " ns");
    }
});
Object proxy = factory.getProxy();
```

Sa règle par défaut : **JDK si la cible implémente au moins une interface, CGLIB sinon**. `setProxyTargetClass(true)` force CGLIB. Spring Boot, lui, force CGLIB pour toute son AOP (`spring.aop.proxy-target-class=true`, module 01) : l'injection par classe concrète continue de marcher.

::visual{id="spring-ch02-two-proxies"}

> **Sous le capot :** `ProxyFactory` délègue à `DefaultAopProxyFactory`, qui décide : si `proxyTargetClass` est vrai, ou si la cible n'a pas d'interface utilisable, il crée un `ObjenesisCglibAopProxy` ; sinon un `JdkDynamicAopProxy`. Les deux exécutent la même chaîne de comportements, construite à l'appel (leçon 2).

## Ce qu'une sous-classe ne peut pas faire

Un proxy CGLIB n'est qu'une sous-classe : il est soumis aux règles de l'héritage Java. La documentation de Spring les liste :
- une classe **`final`** ne peut pas être proxifiée du tout ;
- une méthode **`final`** ou **`private`** ne peut pas être redéfinie : l'appel va directement à la méthode de la classe mère, sans aucun comportement ajouté. Pas d'erreur, pas d'avertissement ;
- une méthode package-private d'une classe mère d'un **autre paquet** est, pour la sous-classe, comme privée.

Et une dernière, moins connue : **le proxy a ses propres champs**. Ils existent (c'est une sous-classe), mais ne sont jamais remplis, puisque le constructeur n'est pas appelé. Seules les **méthodes** sont déléguées à la cible :

::checkpoint{id="c3"}

> **Attention :** les classes Kotlin sont `final` par défaut ; les projets Spring les ouvrent avec le plugin Kotlin `kotlin-spring` (une configuration de `allopen`) pour les classes qui portent des annotations Spring. En Java, le piège classique est un `record` (toujours `final`) ou une classe `final` qui porte `@Transactional` : CGLIB ne peut pas en faire une sous-classe, et le démarrage échoue.

## Pièges fréquents

- **Injecter ou caster par la classe concrète** un bean proxifié par le JDK : `BeanNotOfRequiredTypeException` ou `ClassCastException` sur `$Proxy…`.
- **Une méthode `final` ou `private` annotée** `@Transactional`, `@Async`… : l'annotation est ignorée en silence.
- **Lire ou écrire un champ public** d'un bean proxifié : ce sont les champs du proxy, vides.
- **Une classe `final`** proxifiée : le démarrage échoue.

## À retenir

- Proxy JDK = **frère** (mêmes interfaces) ; proxy CGLIB = **fils** (sous-classe générée).
- `ProxyFactory` choisit JDK si la cible a des interfaces, CGLIB sinon ; Spring Boot force CGLIB.
- Un proxy CGLIB ne voit ni les méthodes `final`, ni les `private`, et ses champs ne sont pas ceux de la cible.
- Le constructeur de la cible n'est pas rappelé : Spring instancie le proxy avec Objenesis.

> **Source :** Spring Framework 7.0, [Proxying Mechanisms](https://docs.spring.io/spring-framework/reference/core/aop/proxying.html) et [Using the ProxyFactory to Create AOP Proxies Programmatically](https://docs.spring.io/spring-framework/reference/core/aop-api/prog.html) ; code de [`DefaultAopProxyFactory`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-aop/src/main/java/org/springframework/aop/framework/DefaultAopProxyFactory.java) (v7.0.11).
