## Contexte

Un conteneur ne lit pas ton code source : il inspecte les classes **à l'exécution**, par réflexion. Avant de créer quoi que ce soit, il doit répondre à trois questions : est-ce un composant ? comment s'appelle-t-il ? de quoi a-t-il besoin ?

Tu écris `Inspector.java`. Les annotations `@Component` et `@Inject` sont fournies.

## Ta tâche

- `isComponent(type)` : vrai si la classe porte `@Component`.
- `beanName(type)` : la valeur de `@Component("…")` si elle est renseignée ; sinon le nom simple de la classe, première lettre en minuscule (`EventCatalog` → `eventCatalog`). Exception, comme dans Spring : si les **deux** premières lettres sont des majuscules, le nom ne change pas (`URLParser` → `URLParser`).
- `dependencies(type)` : les types des paramètres du constructeur à utiliser, dans l'ordre. C'est le seul constructeur de la classe, ou, s'il y en a plusieurs, celui annoté `@Inject`. Plusieurs constructeurs et pas exactement un `@Inject` : `IllegalStateException`.

## Exemple

```java
@Component class Reservations { Reservations(EventCatalog c, PriceCalculator p) { } }

Inspector.beanName(Reservations.class);      // "reservations"
Inspector.dependencies(Reservations.class);  // [EventCatalog, PriceCalculator]
```
