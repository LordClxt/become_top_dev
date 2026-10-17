## Contexte

Le modèle de commande d'une boutique est une seule interface pleine d'optionnels : `placedAt?`, `paymentMethod?`, `amountCents?`, `tracking?`, `carrier?`, `deliveredAt?`, `cancelReason?`… Rien n'empêche une commande « livrée » sans numéro de suivi, ou « annulée » et « payée » à la fois. Tu la remplaces par un modèle où **seuls les états valides sont représentables**, puis tu écris les transitions.

Tu édites `orders.ts`.

## À faire

1. Les états, en **union d'interfaces taguées** par `status` (chacune avec `id` et `lines`) :
   - `DraftOrder` (`'draft'`) ; `PlacedOrder` (`'placed'`, `placedAt: Date`) ;
   - `PaidOrder` (`'paid'`, `placedAt`, `payment: { method: 'card' | 'transfer'; amountCents: number }`) ;
   - `ShippedOrder` (`'shipped'`, tout ce qu'a `PaidOrder` + `shipment: { carrier: Carrier; tracking: string }`) ;
   - `DeliveredOrder` (`'delivered'`, tout ce qu'a `ShippedOrder` + `deliveredAt: Date`) ;
   - `CancelledOrder` (`'cancelled'`, `reason: string`, `refundCents: number`).
   `Order` est leur union.
2. Les transitions (chacune n'accepte **que** l'état de départ valide, et renvoie un nouvel objet) :
   - `addLine(draft, line)` : ajoute une ligne, ou augmente la quantité si le `sku` existe déjà ;
   - `place(draft, at)` : `Error("commande vide")` si aucune ligne ;
   - `pay(placed, method)` : `amountCents` = total des lignes ;
   - `ship(paid, carrier, tracking)` : le suivi doit respecter le format du transporteur (`'colissimo'` : 2 lettres majuscules + 9 chiffres + `FR` ; `'ups'` : `1Z` + 16 caractères alphanumériques majuscules), sinon `Error("numéro de suivi invalide")` ;
   - `deliver(shipped, at)` ;
   - `cancel(order, reason)` : seulement pour `draft`, `placed` ou `paid` (le type de paramètre le dit) ; `refundCents` vaut le montant payé, ou `0`.
3. `describe(order)` : `switch` exhaustif → `"#7 brouillon (2 lignes)"`, `"#7 commandée"`, `"#7 payée 59,80 €"`, `"#7 expédiée par ups (1Z…)"`, `"#7 livrée le 2024-07-04"`, `"#7 annulée : client absent (remboursement 59,80 €)"`.
4. `refundTotal(orders)` : la somme des remboursements des commandes annulées.

## Contraintes

Pas de `any`, pas d'assertion `as`, pas de propriété optionnelle dans les états.
