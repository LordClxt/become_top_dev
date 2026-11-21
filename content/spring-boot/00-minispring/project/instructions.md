## Contexte

Pour prédire le comportement de Spring, rien ne vaut d'en écrire un. Minispring est un conteneur d'injection de dépendances complet en deux fichiers : `Definitions.java` (lire une classe et en faire une recette) et `MiniContainer.java` (créer, injecter, détruire). Les annotations (`@Component`, `@Prototype`, `@Inject`, `@PostConstruct`, `@PreDestroy`), `BeanDefinition` et `BeanException` sont fournis.

Les tests sont groupés par jalon : lance `jtest M1`, puis `M2`, puis `M3`.

## M1 — Définitions et portées

- `register(Class<?>...)` crée une `BeanDefinition` par classe annotée `@Component`, **sans créer aucun objet**. Classe sans `@Component` : `BeanException`. Deux fois le même nom : `BeanException("bean déjà défini : <nom>")`.
- Nom du bean : la valeur de `@Component("…")`, sinon le nom simple de la classe comme le fait Spring : `PriceCalculator` → `priceCalculator`, mais `URLParser` reste `URLParser` (deux majuscules en tête).
- `getBean(String)` et `getBean(Class)` : un **singleton** est créé une fois puis mis en cache ; un `@Prototype` est créé à chaque demande. Nom inconnu : `BeanException("aucun bean nommé <nom>")`.

## M2 — Le graphe

- Le constructeur utilisé est le seul de la classe, ou celui annoté `@Inject`. Plusieurs sans `@Inject` : `BeanException("<Classe> a <n> constructeurs : annote celui à utiliser avec @Inject")`, dès `register`.
- Chaque paramètre est résolu **par type** parmi les définitions (une sous-classe ou une implémentation convient) :
  - aucun candidat : `aucun bean de type Pool (demandé par reports)` ;
  - plusieurs : `2 beans de type Gateway (demandé par checkout) : stripe, paypal`.
- `start()` crée tous les singletons (pas les prototypes) et renvoie le conteneur.
- Un cycle est détecté et décrit depuis le bean demandé : `cycle de dépendances : a → b → c → a`.

## M3 — Le cycle de vie

- Après l'injection, les méthodes `@PostConstruct` sont appelées, même privées. Une méthode `@PostConstruct` ou `@PreDestroy` avec paramètre : `BeanException("<bean>.<méthode> : @PostConstruct exige une méthode sans paramètre")`.
- Une exception dans un constructeur devient `BeanException("échec de création de <bean> : <message>")`.
- `close()` appelle les `@PreDestroy` des singletons **du dernier créé au premier**, jamais ceux des prototypes.
- Si `start()` échoue, les singletons déjà créés sont détruits avant que l'exception remonte.
