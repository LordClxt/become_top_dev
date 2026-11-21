## Contexte

Avec l'injection par constructeur, un bean ne peut être créé qu'**après** ses dépendances. Le conteneur doit donc parcourir le graphe des dépendances, en profondeur, et s'arrêter net sur un cycle : `a` a besoin de `b` qui a besoin de `a` ne se construit pas.

Ici, une recette (`Recipe`, fournie) donne directement le nom de ses dépendances et une fonction qui fabrique l'objet. Tu écris `Graph.java`.

## Ta tâche

- `add(recipe)` : enregistre une recette (nom déjà pris : `BeanException("bean déjà défini : x")`).
- `getBean(name)` : renvoie le singleton, en le créant à la première demande **après** avoir obtenu ses dépendances, dans l'ordre déclaré. Une dépendance partagée n'est créée qu'une fois.
- `start()` : obtient tous les beans, dans l'ordre d'ajout des recettes.
- `creationOrder()` : les noms dans l'ordre où leurs **objets** ont été créés.

## Les erreurs

- Dépendance inconnue : `aucun bean nommé pool (demandé par reports)`.
- Cycle, décrit **à partir du bean qui ferme la boucle**, et seulement la boucle :

```
cycle de dépendances : orders → payments → orders
```

Si `api` dépend de `orders`, `api` ne fait pas partie du cycle et n'apparaît pas.

Après une erreur, le graphe doit rester utilisable : un nouvel appel décrit à nouveau correctement le cycle.
