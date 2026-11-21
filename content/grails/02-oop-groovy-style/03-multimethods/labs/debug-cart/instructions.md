## Le ticket du support

> « Le client a ajouté deux fois le même clavier. La facture affiche **une** ligne *Clavier ×1*, mais le total correspond à **deux** claviers. Et quand il retire le clavier du panier, rien ne se passe. Ça ne le fait pas à chaque fois. »

Le code du panier tient en trois fichiers : `Line.groovy` (une ligne de commande), `Cart.groovy` (le panier) et `Invoice.groovy` (la facture). Chacun, lu seul, a l'air correct. Les tests de l'équipe, eux, passent tous, ce qui n'aide pas.

## Ta mission

1. Reproduis le bug (les tests fournis le font).
2. Trouve la **cause racine**, pas un contournement dans `Invoice` : pourquoi la facture et le total ne voient-ils pas le même panier ?
3. Corrige-la à l'endroit juste. Les trois fichiers sont modifiables ; une bonne correction en touche un seul.

## Règles métier (inchangées)

- Deux lignes sont le même article si elles ont le même `sku`, quels que soient le nom ou la quantité.
- Ajouter un article déjà présent **augmente sa quantité**.
- `remove(sku)` retire l'article.
- Le total est la somme de `prix × quantité`.
