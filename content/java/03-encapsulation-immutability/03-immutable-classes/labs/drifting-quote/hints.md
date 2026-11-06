## Hint 1
Il y a trois causes indépendantes. Dessine les objets en mémoire juste après `issue(cart)` : quelles références le devis partage-t-il avec le panier ?

## Hint 2
Copier la liste dans `Quote` ne suffit pas : la copie est superficielle, et les `LineItem` qu'elle contient sont les mêmes objets que ceux du panier. Qui appelle `setQuantity` sur eux ?

## Hint 3
Les trois corrections : `Quote` copie sa liste (`List.copyOf`) et ne la laisse pas modifier ; `LineItem` devient immuable (`withQuantity` renvoie une nouvelle ligne, que `Cart` remet à sa place) ; `Promotions` construit sa propre liste d'affichage au lieu d'ajouter le cadeau dans celle du devis.
