---
id: spring-ch02-l04
title: "Le piège de l'auto-invocation, et les règles d'annulation"
source: { book: spring-docs, chapter: 20, pages: "#aop-understanding-aop-proxies", url: "https://docs.spring.io/spring-framework/reference/core/aop/proxying.html#aop-understanding-aop-proxies" }
duration_min: 35
concepts:
  - id: spring-ch02-self-invocation
    label: "Un appel this.methode() à l'intérieur d'un bean ne traverse pas le proxy : @Transactional, @Cacheable, @Async… ne s'appliquent pas"
  - id: spring-ch02-transactional-proxy
    label: "@Transactional est un advisor : TransactionInterceptor ouvre la transaction avant l'appel, la lie au thread, puis valide ou annule après"
  - id: spring-ch02-rollback-rules
    label: "Par défaut, une transaction n'est annulée que pour une RuntimeException ou une Error ; une exception vérifiée la valide, sauf rollbackFor ou rollbackOn = ALL_EXCEPTIONS"
glossary:
  - term: "auto-invocation"
    definition: "Un objet qui appelle une de ses propres méthodes (this.autre()). L'appel reste dans l'objet et ne repasse pas par son proxy."
  - term: "règle d'annulation"
    definition: "Ce qui décide si une exception annule (rollback) ou valide (commit) une transaction. Par défaut : annulation pour les exceptions non vérifiées."
  - term: "TransactionSynchronizationManager"
    definition: "La classe de Spring qui garde, par thread, la transaction en cours et ses ressources (la connexion JDBC). C'est ainsi que JdbcClient trouve la bonne connexion."
visuals: [spring-ch02-self-call]
labs: [spring-ch02-l04-lab-debug-sold-unpaid]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "`twoPrices` appelle deux fois `price`, qui est `@Cacheable`. Qu'affiche le programme ?"
    code: |
      import org.springframework.cache.annotation.*;
      import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
      import org.springframework.context.annotation.*;

      public class Main {
          public static class Prices {
              private int computed;
              @Cacheable("prices") public int price(String id) { computed++; return 4500; }
              public int twoPrices(String id) { return price(id) + price(id); }
              public int computed() { return computed; }
          }

          @Configuration @EnableCaching
          static class Config {
              @Bean ConcurrentMapCacheManager cacheManager() { return new ConcurrentMapCacheManager(); }
              @Bean Prices prices() { return new Prices(); }
          }

          public static void main(String[] args) {
              try (var ctx = new AnnotationConfigApplicationContext(Config.class)) {
                  Prices prices = ctx.getBean(Prices.class);
                  prices.price("jazz");
                  prices.price("jazz");
                  System.out.print(prices.computed() + " ");
                  prices.twoPrices("rock");
                  System.out.println(prices.computed());
              }
          }
      }
    answer: "1 3"
    explanation: "Les deux appels externes passent par le proxy : le second est servi par le cache (1 calcul). Dans twoPrices, price(id) veut dire this.price(id) : l'appel ne quitte pas l'objet, le cache n'est jamais consulté, deux calculs de plus. C'est exactement ce qui arrive à un @Transactional appelé de l'intérieur."
    concept: spring-ch02-self-invocation
  - id: c2
    type: single
    prompt: "Une méthode `@Transactional` lève `PaymentDeclinedException extends Exception`. Sans autre configuration, que devient la transaction ?"
    choices:
      - "Annulée, comme pour toute exception"
      - "Validée : par défaut, seules les RuntimeException et les Error annulent"
      - "Laissée ouverte jusqu'à l'arrêt de l'application"
      - "Annulée, puis l'exception est enveloppée dans une RuntimeException"
    answer: 1
    explanation: "C'est la règle historique de Spring (héritée d'EJB) : une exception vérifiée est vue comme un résultat métier prévu, donc la transaction est validée. rollbackFor sur l'annotation, ou @EnableTransactionManagement(rollbackOn = ALL_EXCEPTIONS) depuis Spring 6.2, changent ce comportement."
    concept: spring-ch02-rollback-rules
---

## Pourquoi c'est important

C'est la question Spring la plus posée en entretien, et le bug qu'on trouve dans presque toutes les applications : un `@Transactional` qui « ne marche pas ». Le code est annoté, les tests passent, et en production des places restent vendues alors que le paiement a échoué.

Dans le lab de débogage de cette leçon, il y a deux causes, et ce sont les deux plus fréquentes : un **appel interne** qui contourne le proxy, et une **exception vérifiée** qui valide la transaction au lieu de l'annuler.

## Pourquoi un appel interne échappe au proxy

Le proxy **enveloppe** l'objet, il ne le modifie pas (leçon 1). Quand un client appelle `booking.book(...)`, l'appel arrive sur le proxy, traverse la chaîne des advisors, puis atteint la vraie méthode `book` de l'objet. Dans cette méthode, `this` désigne **l'objet**, pas le proxy. `this.sellAndCharge(...)` (ou simplement `sellAndCharge(...)`) est donc un appel Java ordinaire, que le proxy ne voit jamais.

::visual{id="spring-ch02-self-call"}

::checkpoint{id="c1"}

Ce n'est pas propre à `@Transactional` : `@Cacheable`, `@Async`, `@Retryable`, `@PreAuthorize` et tes propres aspects ont tous le même comportement. La documentation de Spring le souligne en notant que le tissage AspectJ (à la compilation ou au chargement) n'a pas ce problème, justement parce qu'il ne passe pas par un proxy.

### Les corrections, de la meilleure à la pire

La documentation les classe ainsi :

1. **Restructurer** pour que l'appel arrive de l'extérieur : poser l'annotation sur la méthode réellement appelée par le client (c'est la correction du lab), ou déplacer la méthode dans un autre bean. C'est *the best, least-invasive approach*.
2. **S'injecter soi-même** : recevoir son propre proxy (`ObjectProvider<BookingService>`, ou un champ `@Lazy`) et appeler `self.sellAndCharge(...)`. Ça marche, mais le code dit mal ce qu'il fait.
3. **`AopContext.currentProxy()`** avec `@EnableAspectJAutoProxy(exposeProxy = true)` : le code dépend alors de Spring AOP. La documentation la déconseille fortement.

> **Sous le capot :** les méthodes non publiques ne sont plus exclues d'office. Depuis Spring 6.0, avec un proxy de classe (CGLIB, le choix de Spring Boot), une méthode `protected` ou package-private annotée `@Transactional` est bien transactionnelle quand on l'appelle **de l'extérieur**. Une méthode `private`, elle, ne peut jamais être redéfinie, donc jamais interceptée.

## Ce que fait @Transactional, concrètement

`@EnableTransactionManagement` (ou l'autoconfiguration de Spring Boot) enregistre un advisor dont l'intercepteur est `TransactionInterceptor`. Pour chaque appel visé, sa méthode `invokeWithinTransaction` :

1. lit les attributs de l'annotation (propagation, isolation, lecture seule, règles d'annulation) ;
2. demande une transaction au `PlatformTransactionManager`, qui ouvre la connexion et la **lie au thread** (`TransactionSynchronizationManager`) ;
3. appelle `proceed()` : tout le code qui utilise `JdbcClient` ou JPA sur ce thread retrouve **la même** connexion ;
4. selon l'issue, `commit` ou `rollback`.

Le boss du module te fait écrire exactement cela.

## Les règles d'annulation

Quand l'appel lève une exception, `TransactionInterceptor` décide entre annuler et valider. **Par défaut** :
- `RuntimeException` et `Error` : **annulation** ;
- exception **vérifiée** (`extends Exception`) : **validation**.

::checkpoint{id="c2"}

Trois façons de changer la règle :
- `@Transactional(rollbackFor = PaymentDeclinedException.class)` : pour cette méthode ;
- `@Transactional(noRollbackFor = …)` : l'inverse, pour une exception non vérifiée qui ne doit pas tout annuler ;
- **`@EnableTransactionManagement(rollbackOn = RollbackOn.ALL_EXCEPTIONS)`**, depuis Spring 6.2 : annuler pour **toutes** les exceptions, dans toute l'application. Le Javadoc le recommande quand on lève des exceptions vérifiées dans des méthodes transactionnelles. C'est ce qui empêche la **prochaine** exception vérifiée d'oublier son `rollbackFor`.

> **En production :** une transaction validée sur une exception vérifiée ne se voit jamais dans les tests unitaires qui simulent la base. Écris au moins un test qui fait échouer l'opération pour de vrai et **recompte les lignes**, comme les tests du lab.

## Pièges fréquents

- **`@Transactional` sur une méthode appelée par `this`** : aucune transaction.
- **`@Transactional` sur une méthode `private`** : jamais intercepté.
- **Une exception vérifiée** dans une méthode transactionnelle, sans `rollbackFor` ni `ALL_EXCEPTIONS` : les écritures restent.
- **Attraper l'exception dans la méthode** et continuer : pour le proxy, la méthode a réussi, la transaction est validée.
- **Lancer un thread** dans une méthode transactionnelle : la transaction est liée au thread d'origine, l'autre thread n'en a pas.

## À retenir

- Un appel `this.x()` ne traverse pas le proxy : aucune annotation de comportement ne s'applique.
- Corrige en restructurant (l'annotation là où l'appel arrive de l'extérieur, ou un autre bean) ; l'auto-injection et `AopContext` sont des pis-aller.
- `@Transactional` = `TransactionInterceptor` + un gestionnaire qui lie la connexion au thread.
- Par défaut, seules les exceptions non vérifiées annulent ; `rollbackOn = ALL_EXCEPTIONS` (Spring 6.2) généralise.

> **Source :** Spring Framework 7.0, [Understanding AOP Proxies](https://docs.spring.io/spring-framework/reference/core/aop/proxying.html#aop-understanding-aop-proxies), [Using @Transactional](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html) et [Rolling Back a Declarative Transaction](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/rolling-back.html) ; code de [`TransactionAspectSupport`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-tx/src/main/java/org/springframework/transaction/interceptor/TransactionAspectSupport.java) et [`RollbackOn`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-tx/src/main/java/org/springframework/transaction/annotation/RollbackOn.java) (v7.0.11).
