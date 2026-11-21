## Contexte

Le démarrage de Spring tient en une méthode, `refresh()`, et en deux temps : d'abord les **recettes** (on les lit, on les modifie), ensuite les **objets** (créés dans un ordre précis). Tu écris ce `refresh()` pour un conteneur complet.

Fournis : `@Component`, `@Prototype`, `@PreDestroy`, `BeanException`, `BeanDefinition`, et trois interfaces d'extension : `DefinitionRegistry`, `DefinitionProcessor` (comme `BeanFactoryPostProcessor`) et `BeanPostProcessor`. Tu écris `Container.java`.

Pas d'indices pour ce combat : tout ce qu'il faut est dans les quatre leçons du module.

## Les règles

- `register(Class<?>...)` : une définition par classe `@Component` (nom à la Spring, portée lue sur `@Prototype`). Chaque classe a **un seul** constructeur, dont les paramètres sont résolus par type.
- `refresh()` :
  1. **Temps 1.** Les beans qui implémentent `DefinitionProcessor` sont créés, **sans dépendance** (un constructeur avec paramètres : `BeanException("un DefinitionProcessor ne reçoit pas de dépendances : <nom>")`), puis appliqués dans l'ordre d'enregistrement sur un `DefinitionRegistry` qui permet de lire, remplacer et retirer des définitions. **Aucun autre bean n'est créé avant.** Un bean retiré n'est jamais instancié.
  2. **Temps 2a.** Les beans qui implémentent `BeanPostProcessor` sont créés, avant tous les autres.
  3. **Temps 2b.** Tous les singletons restants sont créés.
- Chaque bean créé (sauf les post-processors eux-mêmes) passe par `after` de chaque `BeanPostProcessor` **déjà créé**, dans l'ordre ; le résultat remplace le bean, partout.
- Un bean créé alors que tous les post-processors n'existent pas encore (parce qu'un post-processor en dépend) est ajouté à `warnings()` : `bean 'pool' créé trop tôt : non traité par tous les post-processors`.
- Une exception d'un constructeur devient `BeanException("échec de création de <nom> : <message>")`. Si `refresh()` échoue, les `@PreDestroy` des singletons déjà créés sont appelés, du dernier au premier, avant que l'exception remonte. `close()` fait la même destruction.
