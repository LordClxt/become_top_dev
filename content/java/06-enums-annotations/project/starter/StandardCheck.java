/** Les contrôles livrés avec Ordo. Fourni. */
public enum StandardCheck implements OrderCheck {
    /** La quantité est un multiple de 10 (lot rond). */
    ROUND_LOT {
        @Override public boolean passes(Order order) { return order.originalQuantity() % 10 == 0; }
    },
    /** Pas plus de 10 000 unités. */
    MAX_QUANTITY {
        @Override public boolean passes(Order order) { return order.originalQuantity() <= 10_000; }
    }
}
