## Contexte

Une classe de domaine Grails est, au fond, un **GroovyBean** : des propriétés, un constructeur par arguments nommés, quelques méthodes. Tu écris celui d'un produit du catalogue de **Minigrails**.

Tu édites `Product.groovy`. Le squelette déclare déjà deux propriétés. Il faut :

1. **`price` ne peut pas être négatif.** Remplace le setter généré par le tien : il lève `IllegalArgumentException` si le prix est `< 0`. Le constructeur nommé `new Product(name: 'Tea', price: -1)` et l'affectation `p.price = -1` doivent tous deux échouer, parce qu'ils passent par le setter.
2. **`label`** est une propriété calculée en lecture seule : `p.label` renvoie `"Tea (3.5 €)"`. Pas de champ, juste un getter.
3. **`discounted(int percent)`** renvoie un **nouveau** `Product` de même nom dont le prix est réduit de `percent` %. L'original ne change pas. Utilise des `BigDecimal` : `3.5` réduit de 10 % donne `3.15`.
4. **`Product.parse(String line)`** (statique) lit `"Tea : 3.50"` (nom, deux-points, prix, espaces tolérés) et renvoie le produit.
5. **`toString()`** vaut `Product(name:Tea, price:3.5)` : une annotation de la bibliothèque Groovy suffit.

Le prix par défaut vaut `0`.

## Lancer les tests

Un `assert` raté affiche l'arbre de ses sous-expressions : lis-le, il montre la valeur réelle de chaque morceau.
