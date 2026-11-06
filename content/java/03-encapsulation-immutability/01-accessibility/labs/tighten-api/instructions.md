## Contexte

Le paquetage `catalog` est publié comme bibliothèque interne. Avant la version 1.0, l'architecte veut une API **minimale** : tout ce qui est visible aujourd'hui sera à maintenir à vie. Les tests de ce TP sont écrits **hors du paquetage**, comme un vrai client : ils n'ont accès qu'à ce qui est public ou protégé.

## Ce qui doit rester l'API publique

```java
Catalog c = new Catalog();
c.add(Product.of("Café moulu", 450, "épicerie"));
c.find("Café moulu");          // Optional<Product>
c.cheapest();                  // Optional<Product>
c.products();                  // List<Product>, non modifiable
Catalog.CATEGORIES;            // List<String>, non modifiable
Product p = ...; p.name(); p.priceCents(); p.category();
```

## Ce qu'il faut refermer

- `Catalog` n'expose plus **aucun champ** d'instance, ni public ni protégé.
- `Catalog.CATEGORIES` ne doit plus être un tableau modifiable.
- `PriceIndex` n'est utilisé que par `Catalog` : il ne doit plus être une classe publique (deux choix possibles, à toi de prendre le meilleur).
- `rebuildIndexForTests()` n'a rien à faire dans l'API : les tests de l'équipe sont dans le paquetage `catalog`.
- `Product` : plus de champs publics ; garde ses accesseurs. Ses champs ne doivent plus pouvoir changer après création.
- `Catalog` reste extensible (une équipe l'étend), mais aucune méthode **protégée** ne doit exposer l'index interne.

Le comportement ne change pas : `add` refuse un produit d'une catégorie inconnue (`IllegalArgumentException`) et un nom déjà présent.
