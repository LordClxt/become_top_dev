---
id: spring-ch00-l03
title: "Résoudre le graphe : injection par constructeur et cycles"
source: { book: spring-docs, chapter: 4, pages: "#beans-dependency-resolution", url: "https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html" }
duration_min: 35
concepts:
  - id: spring-ch00-constructor-resolution
    label: "Pour créer un bean, le conteneur obtient d'abord chaque dépendance (récursivement, en profondeur), par type, puis appelle le constructeur"
  - id: spring-ch00-cycle-detection
    label: "Un cycle se détecte avec l'ensemble ordonné des beans en cours de création ; avec des constructeurs, il est impossible à construire"
  - id: spring-ch00-primary
    label: "Plusieurs candidats pour un type : un candidat marqué primaire tranche, sinon le conteneur refuse et liste les candidats"
  - id: spring-ch00-provider
    label: "Injecter un fournisseur (Provider, ObjectProvider) au lieu du bean repousse la résolution à chaque appel de get()"
glossary:
  - term: "parcours en profondeur"
    definition: "Explorer un graphe en allant au bout de chaque chemin avant de revenir : pour créer A, on crée d'abord sa première dépendance, puis la dépendance de celle-ci, et ainsi de suite."
  - term: "cycle de dépendances"
    definition: "Une boucle dans le graphe : A a besoin de B, qui a besoin de A. Avec l'injection par constructeur, aucun des deux ne peut être créé en premier."
  - term: "référence anticipée"
    definition: "Dans Spring, un singleton déjà construit mais pas encore initialisé, exposé pour casser un cycle entre champs ou setters. Impossible avec des constructeurs."
visuals: [spring-ch00-depth-first]
labs: [spring-ch00-l03-lab-cycles, spring-ch00-l03-lab-debug-two-pools]
extra: true
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Le vrai Spring, deux composants qui se demandent l'un l'autre par constructeur. Qu'affiche le programme ?"
    code: |
      import org.springframework.context.annotation.*;
      import org.springframework.stereotype.Component;

      public class Main {
          @Component static class Orders { Orders(Payments p) { } }
          @Component static class Payments { Payments(Orders o) { } }

          public static void main(String[] args) {
              try (var ctx = new AnnotationConfigApplicationContext(Orders.class, Payments.class)) {
                  System.out.println("démarré");
              } catch (Exception e) {
                  Throwable root = e;
                  while (root.getCause() != null) root = root.getCause();
                  System.out.println(root.getClass().getSimpleName());
              }
          }
      }
    answer: "BeanCurrentlyInCreationException"
    explanation: "Pour créer Orders, il faut Payments, qui demande Orders, déjà « en cours de création » : Spring le voit dans son ensemble singletonsCurrentlyInCreation et lève cette exception. Avec des constructeurs, aucun ordre ne marche : il faut revoir le découpage."
    concept: spring-ch00-cycle-detection
  - id: c2
    type: single
    prompt: "`api` dépend de `orders`, `orders` de `payments`, `payments` de `orders`. Au moment où le cycle est détecté, que contient l'ensemble des beans en cours de création ?"
    choices:
      - "[orders, payments]"
      - "[api, orders, payments]"
      - "[payments, orders]"
      - "[api]"
    answer: 1
    explanation: "Le parcours est parti de api, puis orders, puis payments, qui redemande orders : les trois sont en cours. Le cycle, lui, est la fin de ce chemin à partir de la première occurrence de orders : orders → payments → orders. api est sur le chemin, pas dans la boucle."
    concept: spring-ch00-cycle-detection
---

## Pourquoi c'est important

Mardi, une nouvelle classe `PaymentService` reçoit `OrderService` dans son constructeur, alors qu'`OrderService` recevait déjà `PaymentService`. Spring refuse de démarrer avec `BeanCurrentlyInCreationException`. Le développeur ajoute `spring.main.allow-circular-references=true` « pour débloquer », passe à l'injection par champ, et l'application démarre. Trois semaines plus tard, un `NullPointerException` apparaît pendant le démarrage, dans un `@PostConstruct` qui utilise un bean pas encore initialisé.

Comprendre **comment** le conteneur parcourt le graphe des dépendances, c'est savoir pourquoi un cycle de constructeurs est impossible, pourquoi Spring Boot interdit aussi les autres par défaut, et comment lire le message pour trouver la boucle.

## Créer, c'est d'abord obtenir les dépendances

Avec l'injection par constructeur, un objet ne peut exister qu'**après** ses dépendances. Pour créer un bean, le conteneur :

1. lit les types des paramètres du constructeur (leçon 1) ;
2. pour chacun, trouve **le** bean de ce type parmi les définitions et l'**obtient**, ce qui peut déclencher sa propre création, récursivement ;
3. appelle le constructeur avec ces objets.

C'est un **parcours en profondeur** du graphe : on descend jusqu'aux beans sans dépendance, puis on remonte en créant. L'ordre de création se déduit donc des dépendances, pas de l'ordre d'enregistrement. Et grâce au cache (leçon 2), une dépendance partagée n'est créée qu'une fois.

::visual{id="spring-ch00-depth-first"}

## Trouver « le » bean d'un type

Pour chaque paramètre, le conteneur filtre les définitions dont la classe peut être affectée au type demandé (`type.isAssignableFrom(def.type())`) : la classe elle-même, une sous-classe ou une implémentation.

- **un** candidat : c'est lui ;
- **aucun** : erreur, avec le nom du bean qui le demandait (`aucun bean de type Pool (demandé par reports)`) ;
- **plusieurs** : il faut une règle. Un candidat marqué **primaire** l'emporte ; sinon, le conteneur refuse et liste les candidats.

Et deux formes de paramètres changent la question :
- `List<T>` : on ne veut pas **un** candidat mais **tous** ;
- `Provider<T>` (`ObjectProvider<T>` dans Spring) : on ne veut pas le bean maintenant, mais un moyen de le demander plus tard. La résolution a lieu à chaque `get()`.

Tu implémentes ces trois règles dans l'assignment du module. Le module 01 montre l'algorithme complet de Spring, qui ajoute le nom du paramètre et `@Priority` au départage.

## Voir un cycle

Si `A` a besoin de `B` et `B` de `A`, le parcours tourne en rond : pour créer `A`, obtenir `B`, donc créer `B`, donc obtenir `A`, donc créer `A`… jusqu'au `StackOverflowError`. Il faut savoir quels beans sont **en cours** de création : ceux dont on est en train d'obtenir les dépendances.

```java
private final Set<String> inCreation = new LinkedHashSet<>();

private Object create(BeanDefinition def) {
    if (!inCreation.add(def.name())) {                  // déjà en cours : on a bouclé
        List<String> path = new ArrayList<>(inCreation);
        path = path.subList(path.indexOf(def.name()), path.size());
        throw new BeanException("cycle de dépendances : " + String.join(" → ", path) + " → " + def.name());
    }
    try {
        // ... obtenir les dépendances, appeler le constructeur
    } finally {
        inCreation.remove(def.name());                  // aussi en cas d'erreur
    }
}
```

Le `LinkedHashSet` garde l'ensemble **et** l'ordre du chemin, ce qui permet de décrire exactement la boucle.

::checkpoint{id="c2"}

Le `finally` compte : si une création échoue, le bean doit quitter l'ensemble, sinon un essai suivant croirait à un cycle qui n'existe pas.

> **Sous le capot :** Spring fait la même chose. `DefaultSingletonBeanRegistry` garde un ensemble `singletonsCurrentlyInCreation` ; `beforeSingletonCreation` y ajoute le nom et lève `BeanCurrentlyInCreationException` s'il y est déjà, avec le message *Requested bean is currently in creation: Is there an unresolvable circular reference…*

::checkpoint{id="c1"}

## Pourquoi Spring accepte (parfois) un cycle entre champs

Avec l'injection par **champ** ou par **setter**, l'objet peut être créé **avant** ses dépendances : on appelle le constructeur vide, puis on remplit les champs. Spring en profite : il expose l'objet à moitié prêt comme **référence anticipée** (ses tables `singletonFactories` et `earlySingletonObjects`), et le donne à l'autre bean du cycle. Le Spring Framework seul accepte donc `X ⇄ Y` par champs.

Le prix : pendant un moment, un bean utilise un autre bean **qui n'est pas encore initialisé** (son `@PostConstruct` n'a pas tourné, ses proxies ne sont peut-être pas posés). C'est la source du `NullPointerException` du début. C'est pourquoi **Spring Boot 2.6 et plus interdisent les références circulaires par défaut** (`spring.main.allow-circular-references=false`) : la bonne réponse à un cycle est de le casser, en extrayant la partie commune dans un troisième bean, en publiant un événement, ou en injectant un `ObjectProvider` pour repousser l'accès.

> **En production :** quand Spring signale un cycle, le message donne le chemin complet des beans en création (« The dependencies of some of the beans in the application context form a cycle », avec un schéma, dans Spring Boot). Lis-le comme Minispring : la boucle commence au premier bean qui réapparaît.

## Pièges fréquents

- **Oublier le `finally`** qui retire un bean de l'ensemble en cours : de faux cycles après la première erreur.
- **Décrire le cycle depuis le début du chemin** : `api` n'est pas dans la boucle, l'afficher égare la personne qui lit l'erreur.
- **« Résoudre » un cycle en passant à l'injection par champ** : il est toujours là, avec des beans à moitié initialisés en plus.
- **Créer la dépendance directement** au lieu de la demander au conteneur : le cache est contourné (le lab de débogage en est l'exemple).

## À retenir

- Créer un bean = obtenir d'abord ses dépendances, par type, en profondeur ; le cache évite les doublons.
- Plusieurs candidats : un primaire tranche, sinon erreur. `List<T>` veut tous les candidats, `Provider<T>` repousse la résolution.
- Un cycle se voit grâce à l'ensemble ordonné des beans **en cours** de création ; avec des constructeurs, il est insoluble.
- Spring Framework accepte les cycles entre champs par références anticipées ; Spring Boot les interdit par défaut. Casse le cycle.

> **Source :** Spring Framework 7.0, [Dependency Injection — Dependency Resolution Process](https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html#beans-dependency-resolution) ; code de [`DefaultSingletonBeanRegistry`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-beans/src/main/java/org/springframework/beans/factory/support/DefaultSingletonBeanRegistry.java) et [`BeanCurrentlyInCreationException`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-beans/src/main/java/org/springframework/beans/factory/BeanCurrentlyInCreationException.java) (v7.0.11) ; Spring Boot 4.1, propriété `spring.main.allow-circular-references`.
