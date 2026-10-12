## Énoncé

Le service commercial exporte ses ventes en CSV. Tu écris la bibliothèque qui les lit et en tire un rapport. Édite `Report.groovy`.

Format d'une ligne : `date,client,produit,quantité,prix unitaire`. Une première ligne d'en-tête et des lignes vides peuvent apparaître ; les espaces autour des valeurs sont à ignorer.

```
date,customer,product,qty,unitPrice
2024-01-03, Ada , Tea , 2 , 3.50
2024-01-04,Linus,Coffee,1,4.20

2024-01-05,Ada,Coffee,3,4.20
```

### 1. `Report.parse(String csv)`

Renvoie une liste de maps `[date:, customer:, product:, qty:, unitPrice:, total:]`. `qty` est un `Integer`, `unitPrice` et `total` des `BigDecimal` (`total = qty * unitPrice`). Une ligne invalide (nombre de colonnes différent de 5, ou nombre illisible) lève `IllegalArgumentException` dont le message contient le **numéro de ligne** du fichier (en comptant l'en-tête comme ligne 1).

### 2. `Report.byCustomer(List rows)`

Une map `client → total`, triée par total **décroissant** (puis par nom).

### 3. `Report.topProducts(List rows, int n)`

Les `n` produits les plus vendus en **quantité**, du plus au moins vendu (égalité : ordre alphabétique).

### 4. `Report.render(List rows)`

Une liste de lignes de texte `client: total` (deux décimales, arrondi half-up), dans l'ordre de `byCustomer`.

## Contraintes

- Aucune `double`/`float` : l'argent reste en `BigDecimal`.
- Ne modifie jamais la liste reçue.
- Pas de boucle `for` manuelle quand une méthode du GDK fait le travail.
