## Hint 1
Fais hériter les états les uns des autres : `interface ShippedOrder extends Omit<PaidOrder, 'status'> { status: 'shipped'; shipment: … }`.

## Hint 2
`cancel(order: DraftOrder | PlacedOrder | PaidOrder, reason)` : `order.status === 'paid' ? order.payment.amountCents : 0`. Construis le résultat champ par champ (`{ status: 'cancelled', id, lines, reason, refundCents }`) pour ne pas embarquer `payment`.

## Hint 3
Montants : `(cents / 100).toFixed(2).replace('.', ',')`. Formats de suivi : `/^[A-Z]{2}\d{9}FR$/` et `/^1Z[A-Z0-9]{16}$/`.
