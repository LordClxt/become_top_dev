## Contexte

Premier vrai morceau de Minispring : séparer les **recettes** (les définitions) des **objets**. Pour l'instant, tous les beans ont un constructeur sans paramètre ; l'injection viendra à la leçon suivante.

Tu écris `Registry.java`. `@Component`, `@Prototype`, `BeanDefinition` et `BeanException` sont fournis.

## Ta tâche

- `register(Class<?>...)` : une `BeanDefinition` par classe, dans l'ordre, **sans créer aucun objet**. Nom : valeur de `@Component`, sinon le nom à la Spring (`Introspector.decapitalize`). `prototype` vaut vrai si la classe porte `@Prototype`.
  - Classe sans `@Component` : `BeanException`.
  - Nom déjà pris : `BeanException("bean déjà défini : catalog")`.
- `getBean(String name)` et `getBean(Class<T> type)` :
  - un singleton est créé à la **première** demande, puis toujours le même objet, quel que soit le chemin (par nom ou par type) ;
  - un prototype est créé à **chaque** demande.
- Par type, un sous-type ou une implémentation convient. Erreurs :
  - `aucun bean nommé x` ;
  - `aucun bean de type Gateway` ;
  - `2 beans de type Gateway : stripe, paypal` (noms dans l'ordre d'enregistrement).
- `instancesCreated()` : le nombre d'objets créés depuis le début.
