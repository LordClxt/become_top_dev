---
id: spring-ch00-l02
title: "Des définitions aux objets : un registre et un cache"
source: { book: spring-docs, chapter: 3, pages: "#beans-definition", url: "https://docs.spring.io/spring-framework/reference/core/beans/definition.html" }
duration_min: 30
concepts:
  - id: spring-ch00-definition-vs-instance
    label: "Un conteneur garde deux tables : les définitions (recettes, remplies à l'enregistrement) et les singletons (objets, remplis à la demande)"
  - id: spring-ch00-singleton-cache
    label: "Un singleton n'est unique que si tous les chemins (par nom, par type, comme dépendance) passent par le même cache, indexé par le nom du bean"
  - id: spring-ch00-two-phases
    label: "Séparer l'enregistrement de la création permet de vérifier et de modifier les recettes avant qu'un seul objet existe"
glossary:
  - term: "registre"
    definition: "La table des définitions d'un conteneur, indexée par nom de bean. Dans Spring, c'est le BeanDefinitionRegistry, implémenté par DefaultListableBeanFactory."
  - term: "cache des singletons"
    definition: "La table des singletons déjà créés, indexée par nom. Dans Spring : le champ singletonObjects de DefaultSingletonBeanRegistry."
  - term: "computeIfAbsent"
    definition: "Méthode de Map qui calcule et range une valeur si la clé est absente. Sa fonction de calcul ne doit pas modifier la même map."
visuals: [spring-ch00-two-maps]
labs: [spring-ch00-l02-lab-registry]
extra: true
xp: 25
checkpoints:
  - id: c1
    type: code-output
    prompt: "Un cache rangé par nom, mais consulté par nom de classe. Qu'affiche le programme ?"
    code: |
      import java.util.*;

      public class Main {
          static class Pool { static int opened; Pool() { opened++; } }
          static Map<String, Object> singletons = new HashMap<>();

          static Object byName(String name) {
              return singletons.computeIfAbsent(name, n -> new Pool());
          }

          static Object byType(Class<?> type) {
              Object cached = singletons.get(type.getName());
              if (cached != null) return cached;
              Object bean = new Pool();
              singletons.put("pool", bean);
              return bean;
          }

          public static void main(String[] args) {
              byName("pool");
              byType(Pool.class);
              byType(Pool.class);
              System.out.println(Pool.opened);
          }
      }
    answer: "3"
    explanation: "Le cache est rangé sous « pool » mais lu sous « Main$Pool » : la recherche par type rate à chaque fois et crée un nouvel objet. Un singleton n'est unique que si tous les chemins mènent à la même clé : le nom du bean."
    concept: spring-ch00-singleton-cache
  - id: c2
    type: code-output
    prompt: "Pour créer `service`, il faut d'abord obtenir `pool` : la fonction de calcul rappelle `get`. Qu'affiche le programme ?"
    code: |
      import java.util.*;

      public class Main {
          static Map<String, Object> cache = new HashMap<>();

          static Object get(String name) {
              return cache.computeIfAbsent(name, n -> n.equals("service") ? List.of(get("pool")) : "pool");
          }

          public static void main(String[] args) {
              try {
                  System.out.println(get("service"));
              } catch (Exception e) {
                  System.out.println(e.getClass().getSimpleName());
              }
          }
      }
    answer: "ConcurrentModificationException"
    explanation: "Créer un bean demande ses dépendances, qui sont rangées dans la même map pendant le calcul. HashMap.computeIfAbsent le détecte et lève l'exception (depuis Java 9). Un conteneur doit vérifier le cache, créer, puis ranger, en trois étapes séparées."
    concept: spring-ch00-singleton-cache
---

## Pourquoi c'est important

Le pool de connexions de Tixa est un singleton. La base n'accepte qu'un pool. Un matin, l'application refuse de démarrer : « la base refuse une 2e connexion ». Le pool a été créé deux fois, par deux chemins différents dans le conteneur.

Un singleton n'est pas une propriété de la classe : c'est une **promesse du conteneur**. Elle ne tient que si le conteneur range ses objets au bon endroit et les cherche toujours au même. Cette leçon pose les deux tables qui organisent tout conteneur, celui de Spring compris.

## Deux tables, deux moments

Un conteneur garde :

1. **les définitions**, par nom : la recette de chaque bean (sa classe, sa portée, le constructeur à appeler). On les remplit en enregistrant les classes ;
2. **les singletons**, par nom : les objets déjà créés. On les remplit à la demande.

::visual{id="spring-ch00-two-maps"}

`register` ne touche **que** la première table. Aucun objet n'est créé : c'est ce qui permet, avant toute création, de vérifier les recettes (un nom en double, une classe qui n'est pas un composant), de les compléter, voire de les modifier. Spring en fait un usage massif (module 01, leçon 4).

```java
public Registry register(Class<?>... types) {
    for (Class<?> type : types) {
        BeanDefinition def = Definitions.of(type);              // lecture, aucune instanciation
        if (definitions.putIfAbsent(def.name(), def) != null) {
            throw new BeanException("bean déjà défini : " + def.name());
        }
    }
    return this;
}
```

> **Sous le capot :** dans Spring, la table des définitions est le champ `beanDefinitionMap` de `DefaultListableBeanFactory`, et celle des singletons le champ `singletonObjects` de sa classe mère `DefaultSingletonBeanRegistry` (une `ConcurrentHashMap` de 256 entrées au départ). Deux tables par nom, exactement comme Minispring.

## Singleton et prototype

La portée est une propriété de la **définition** :

- **singleton** : à la première demande, le conteneur crée l'objet et le range ; ensuite, il rend toujours le même ;
- **prototype** : à chaque demande, un nouvel objet, qui n'est **jamais rangé**.

Les deux chemins `getBean(String)` et `getBean(Class)` doivent converger vers **une seule méthode** qui reçoit une définition et décide « cache ou nouvel objet ». Dès qu'il existe deux chemins vers la création, l'un finit par oublier le cache :

::checkpoint{id="c1"}

La clé, c'est le **nom** du bean. Ni le nom de la classe (deux beans peuvent avoir la même classe), ni l'objet `Class` lui-même.

## Ranger sans se marcher dessus

La forme la plus courte, `singletons.computeIfAbsent(name, n -> create(def))`, marche tant qu'un bean n'a pas de dépendance. Mais à la leçon suivante, créer un bean voudra dire obtenir d'abord ses dépendances, donc rappeler `getBean`, donc ranger d'autres objets **dans la même map**, pendant le calcul :

::checkpoint{id="c2"}

La forme sûre sépare les étapes : chercher, créer (ce qui peut remplir la map), puis ranger.

```java
Object existing = singletons.get(def.name());
if (existing != null) return existing;
Object bean = create(def);             // peut appeler getBean pour les dépendances
singletons.put(def.name(), bean);
return bean;
```

> **En production :** un vrai conteneur est utilisé par plusieurs threads. Spring protège la création des singletons par un verrou, et garde même deux autres tables (`earlySingletonObjects`, `singletonFactories`) pour certains cas de dépendances circulaires entre setters. Minispring reste mono-thread : c'est une limite assumée, que tu peux nommer en entretien.

## Pièges fréquents

- **Créer un objet dans `register`** : la recette et l'objet se confondent, plus moyen de modifier une recette avant création.
- **Deux chemins vers la création** : un singleton créé deux fois.
- **Un cache indexé par la classe** au lieu du nom : deux beans de même classe s'écrasent, ou la recherche rate.
- **`computeIfAbsent` récursif** sur une `HashMap` : `ConcurrentModificationException`.

## À retenir

- Deux tables par nom : les **définitions** (remplies à l'enregistrement) et les **singletons** (remplis à la demande).
- La portée est une propriété de la définition ; un prototype n'est jamais rangé.
- Tous les chemins vers un bean passent par une seule méthode et par la même clé : le nom.
- Chercher, créer, ranger : trois étapes séparées.

> **Source :** Spring Framework 7.0, [Bean Overview](https://docs.spring.io/spring-framework/reference/core/beans/definition.html) et [Bean Scopes](https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html) ; code de [`DefaultSingletonBeanRegistry`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-beans/src/main/java/org/springframework/beans/factory/support/DefaultSingletonBeanRegistry.java) et [`DefaultListableBeanFactory`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-beans/src/main/java/org/springframework/beans/factory/support/DefaultListableBeanFactory.java) (v7.0.11) ; Javadoc de [`Map.computeIfAbsent`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Map.html#computeIfAbsent(K,java.util.function.Function)).
