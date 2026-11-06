## Contexte

L'entrepôt imprime des étiquettes d'expédition. `ShippingLabel` est un JavaBean : constructeur vide, setters, aucune validation. Résultat, des étiquettes sans destinataire partent à l'impression, et un module qui « ajoute une ligne d'adresse » sur une étiquette déjà mise en file la modifie pour tout le monde.

## Ta mission

Réécris `Address` et `ShippingLabel` en **records**, avec ces composants :

```java
Address(String street, String postalCode, String city)
ShippingLabel(String recipient, Address address, List<String> instructions, int weightGrams, byte[] barcode)
```

**Validation et normalisation** (dans les constructeurs compacts) :
- aucun composant `null` (`NullPointerException`) ;
- `recipient`, `street` et `city` : espaces de début et de fin retirés ; vides après ça, `IllegalArgumentException` ;
- `postalCode` : exactement 5 chiffres ;
- `weightGrams` : entre 1 et 30 000.

**Immutabilité réelle** :
- `instructions` : modifier la liste passée au constructeur ne change pas l'étiquette, et `instructions()` est non modifiable ;
- `barcode` : modifier le tableau passé au constructeur **ou** celui renvoyé par `barcode()` ne change pas l'étiquette ;
- deux étiquettes de même contenu sont **égales** (y compris le code-barres), ont le même hash, et `toString` montre le code-barres en clair (par exemple `[1, 2, 3]`).
