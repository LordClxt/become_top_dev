## Contexte

Helpdesk vend des abonnements. Un devis contient des articles (`Seat`, `Ticket`, `UrgentTicket`, `Storage`, fournis, tous des `Item`). Un **plan tarifaire** est une classe qui empile des remises écrites en traits. Les tests déclarent leurs propres plans, comme le ferait un commercial. Ton code doit donc donner le bon total **quel que soit l'ordre** dans lequel ils empilent tes traits.

Tous les montants sont des `BigDecimal`.

## `Pricer.price(item)`

| Article | Prix |
|---|---|
| `Seat(count)` | 12.00 par siège pour les 10 premiers, 9.00 au-delà |
| `Ticket(priority)` | priorité 1 : 5.00 · 2 : 2.50 · 3 : 1.00 · autre : `IllegalArgumentException` |
| `UrgentTicket(priority)` | le double du ticket de même priorité |
| `Storage(gb)` | 0.10 par Go, minimum 1.00 |

Tout autre `Item` → `IllegalArgumentException` qui cite le nom simple de sa classe. `null` → `IllegalArgumentException`. Le bon prix doit sortir même quand l'article vient d'une `List<Item>`.

## Les remises : `BasePricing`, `VolumeDiscount`, `LoyaltyDiscount`, `CouponDiscount`, `Cap`

Chaque trait définit `BigDecimal adjust(BigDecimal subtotal, Quote quote)`.

- `BasePricing` : renvoie `subtotal`, sans remise.
- `VolumeDiscount` : −10 % sur le montant qu'il reçoit, si le **sous-total du devis** atteint 500.00.
- `LoyaltyDiscount` : −2 % par année d'ancienneté du client (`quote.customerYears`), plafonné à −10 %.
- `CouponDiscount` : soustrait la valeur du coupon du devis (`Quote.COUPONS`), s'il y en a un.
- `Cap` : le montant ne dépasse jamais `cap`, une propriété que **la classe du plan** doit fournir.

Chaque remise s'applique au montant déjà calculé par les traits situés **à sa gauche** dans `implements`. L'ordre change donc le résultat :

```groovy
class A implements BasePricing, CouponDiscount, VolumeDiscount {}   // (sous-total − coupon) × 0.9
class B implements BasePricing, VolumeDiscount, CouponDiscount {}   // sous-total × 0.9 − coupon
```

## `Quote.of(Map opts = [:], Item... items)`

| Option | Défaut | Règle |
|---|---|---|
| `plan` | aucun | un objet qui sait faire `adjust(BigDecimal, Quote)` ; sans plan, `total == subtotal` |
| `customerYears` | 0 | entier ≥ 0, éventuellement en texte (`'3'`) |
| `coupon` | aucun | une clé de `Quote.COUPONS` (`[WELCOME: 15.00]`) |

Clé inconnue, valeur invalide, plan qui ne sait pas faire `adjust`, aucun article ou article `null` → `IllegalArgumentException`. La Map de l'appelant n'est pas modifiée.

Un `Quote` est **non modifiable** :
- `items`, `plan`, `customerYears` et `coupon` se lisent mais ne s'écrivent pas (`ReadOnlyPropertyException`) ;
- `items` refuse l'ajout ;
- `subtotal`, `total` et `lines` sont **calculés**.

- `subtotal` : la somme des prix, à 2 décimales.
- `total` : `plan.adjust(subtotal, quote)`, jamais négatif, arrondi à 2 décimales (`HALF_EVEN`).
- `lines` : `[[item: 'Seat', price: 12.00], …]`, dans l'ordre du devis.

Pas d'indice pour ce boss.
