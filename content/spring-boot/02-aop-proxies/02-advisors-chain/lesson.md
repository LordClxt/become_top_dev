---
id: spring-ch02-l02
title: "Advice, pointcut, advisor : la chaîne d'intercepteurs"
source: { book: spring-docs, chapter: 21, pages: "#page-title", url: "https://docs.spring.io/spring-framework/reference/core/aop-api/advisor.html" }
duration_min: 35
concepts:
  - id: spring-ch02-advisor-pointcut
    label: "Un advisor associe un pointcut (quelles méthodes) à un advice (quoi faire) : le proxy n'applique le comportement qu'aux méthodes visées"
  - id: spring-ch02-interceptor-chain
    label: "Pour chaque appel, le proxy construit la chaîne des intercepteurs qui s'appliquent ; proceed() passe au suivant, et l'ordre de la chaîne est l'ordre d'emboîtement"
  - id: spring-ch02-most-specific-method
    label: "Avec un proxy JDK, la méthode reçue est celle de l'interface ; AopUtils.getMostSpecificMethod donne celle de la classe cible, qui porte les annotations"
glossary:
  - term: "pointcut"
    definition: "Le critère qui dit à quelles méthodes un comportement s'applique : par nom, par annotation, par expression AspectJ."
  - term: "advisor"
    definition: "La paire pointcut + advice. C'est l'unité que Spring range dans un proxy (un @Transactional devient un advisor)."
  - term: "MethodInvocation"
    definition: "L'appel en cours, vu par un intercepteur : la méthode, les arguments, la cible, et proceed() pour continuer la chaîne."
  - term: "idempotent"
    definition: "Qu'on peut répéter sans changer le résultat : rejouer un paiement avec la même clé ne débite pas deux fois."
visuals: [spring-ch02-interceptor-chain]
labs: [spring-ch02-l02-lab-retry-advisor]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Deux intercepteurs ajoutés dans cet ordre. Qu'affiche le programme ?"
    code: |
      import org.aopalliance.intercept.MethodInterceptor;
      import org.springframework.aop.framework.ProxyFactory;

      public class Main {
          public static class Greeter { public String hello() { System.out.println("  cible"); return "bonjour"; } }

          public static void main(String[] args) {
              ProxyFactory factory = new ProxyFactory(new Greeter());
              factory.addAdvice((MethodInterceptor) inv -> { System.out.println("A avant"); Object r = inv.proceed(); System.out.println("A après"); return r; });
              factory.addAdvice((MethodInterceptor) inv -> { System.out.println(" B avant"); Object r = inv.proceed(); System.out.println(" B après"); return r; });
              ((Greeter) factory.getProxy()).hello();
          }
      }
    answer: "A avant\n B avant\n  cible\n B après\nA après"
    explanation: "Le premier intercepteur ajouté est le plus externe : il voit l'appel en premier et le résultat en dernier. Chaque proceed() passe au suivant, le dernier appelle la cible. L'ordre de la chaîne, c'est l'ordre d'emboîtement des comportements."
    concept: spring-ch02-interceptor-chain
  - id: c2
    type: single
    prompt: "Un retry et une mesure de durée sur la même méthode, qui échoue deux fois avant de réussir. On veut UNE mesure qui couvre les trois tentatives. Lequel doit être le plus externe ?"
    choices:
      - "Le retry"
      - "La mesure"
      - "Peu importe"
      - "Il faut deux proxies séparés"
    answer: 1
    explanation: "La mesure externe voit un seul appel, qui contient les trois tentatives. Avec le retry à l'extérieur, la mesure serait refaite à chaque tentative : trois mesures, dont deux en échec. Les deux choix sont défendables, mais ce n'est pas la même métrique."
    concept: spring-ch02-interceptor-chain
---

## Pourquoi c'est important

Le prestataire de paiement de Tixa tombe quelques secondes par jour. Réessayer automatiquement les paiements règle le problème, à une condition : ne réessayer **que** ce qui peut l'être. Un paiement avec une clé d'idempotence peut être rejoué sans risque ; un remboursement rejoué rembourse deux fois.

Un comportement qui s'applique à **toutes** les méthodes d'un objet ne suffit donc pas : il faut pouvoir dire **lesquelles**. Et dès que deux comportements se croisent (un retry et une mesure), il faut savoir **dans quel ordre** ils s'emboîtent. C'est exactement ce que fait Spring avec `@Transactional`, `@Retryable` ou `@Cacheable`, chacun devenant un *advisor* dans le proxy.

## Trois mots, trois rôles

- **Advice** (le conseil) : *quoi* faire autour de l'appel. Le plus général est un `MethodInterceptor`, qui reçoit l'appel et décide quand appeler `proceed()`.
- **Pointcut** : *à quelles méthodes*. Il répond à `matches(Method, Class<?>)`.
- **Advisor** : la paire des deux. C'est l'unité que Spring range dans un proxy.

```java
public class RetryAdvisor extends StaticMethodMatcherPointcutAdvisor {
    public RetryAdvisor() {
        setAdvice((MethodInterceptor) this::invokeWithRetry);    // quoi
    }

    @Override
    public boolean matches(Method method, Class<?> targetClass) { // où
        return AopUtils.getMostSpecificMethod(method, targetClass).isAnnotationPresent(Retry.class);
    }
}
```

`StaticMethodMatcherPointcutAdvisor` est un advisor tout prêt dont le pointcut ne dépend que de la méthode et de la classe, pas des arguments : Spring peut donc mettre en cache sa réponse pour chaque méthode.

> **Sous le capot :** quand une annotation vit sur l'**implémentation** et que le proxy est un proxy JDK, la `Method` reçue est celle de l'**interface**, qui ne porte pas l'annotation. `AopUtils.getMostSpecificMethod` retrouve la méthode de la classe cible. Les pointcuts d'annotation de Spring (`AnnotationMatchingPointcut`, `@Transactional`) font ce travail pour toi ; un pointcut écrit à la main doit y penser.

## La chaîne, appel par appel

À chaque appel sur le proxy, Spring calcule la **chaîne** des intercepteurs dont le pointcut accepte la méthode (`AdvisedSupport.getInterceptorsAndDynamicInterceptionAdvice`, mise en cache par méthode), puis crée une `MethodInvocation` qui la parcourt. Chaque `proceed()` passe à l'intercepteur suivant ; après le dernier, c'est la cible.

::checkpoint{id="c1"}

Le premier advisor de la liste est donc le plus **externe**. Dans `ProxyFactory`, c'est l'ordre d'ajout ; dans un conteneur, c'est l'ordre des advisors, trié par `@Order` (leçon 5).

::visual{id="spring-ch02-interceptor-chain"}

### Réessayer, c'est rappeler la suite de la chaîne

Un intercepteur de retry doit relancer **la suite** de la chaîne à chaque tentative. Mais une `MethodInvocation` garde sa position : rappeler `proceed()` sur la même invocation sauterait les intercepteurs placés après. Spring fournit pour cela `ProxyMethodInvocation.invocableClone()`, qui repart du même point :

```java
for (int attempt = 1; attempt <= max; attempt++) {
    try {
        return ((ProxyMethodInvocation) invocation).invocableClone().proceed();
    } catch (RuntimeException e) {
        last = e;
    }
}
throw last;
```

C'est exactement ce que fait l'intercepteur de `@Retryable` dans Spring 7 (`AbstractRetryInterceptor`).

::checkpoint{id="c2"}

> **En production :** l'ordre entre un retry et une transaction a des conséquences graves. Retry **à l'extérieur** : chaque tentative ouvre une nouvelle transaction, les écritures d'une tentative ratée sont annulées. Retry **à l'intérieur** : toutes les tentatives partagent une transaction, et la première erreur l'a peut-être déjà marquée « à annuler ». Spring 7 place `@Retryable` à l'extérieur (leçon 5).

## Pièges fréquents

- **Un pointcut trop large** (toutes les méthodes) : un remboursement réessayé rembourse deux fois.
- **Lire l'annotation sur la méthode de l'interface** avec un proxy JDK : rien n'est jamais visé.
- **Rappeler `proceed()` sur la même invocation** pour réessayer : les intercepteurs suivants sont sautés.
- **Ignorer l'ordre** entre deux comportements : la métrique, ou la transaction, ne mesure pas ce que tu crois.

## À retenir

- Advisor = pointcut (où) + advice (quoi) ; c'est l'unité rangée dans un proxy.
- À chaque appel, la chaîne des advisors applicables est parcourue ; le premier est le plus externe.
- Avec un proxy JDK, `getMostSpecificMethod` pour lire les annotations de l'implémentation.
- Réessayer = relancer la suite de la chaîne (`invocableClone().proceed()`), et choisir consciemment l'ordre.

> **Source :** Spring Framework 7.0, [Pointcut API](https://docs.spring.io/spring-framework/reference/core/aop-api/pointcuts.html), [Advice API](https://docs.spring.io/spring-framework/reference/core/aop-api/advice.html) et [The Advisor API](https://docs.spring.io/spring-framework/reference/core/aop-api/advisor.html) ; code de [`ReflectiveMethodInvocation`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-aop/src/main/java/org/springframework/aop/framework/ReflectiveMethodInvocation.java) et [`AbstractRetryInterceptor`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-context/src/main/java/org/springframework/resilience/retry/AbstractRetryInterceptor.java) (v7.0.11).
