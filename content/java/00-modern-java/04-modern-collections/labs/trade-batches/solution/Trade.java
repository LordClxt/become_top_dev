/** Une transaction exécutée. NE PAS MODIFIER. */
record Trade(String symbol, long qty, long priceCents) {
    Trade {
        if (qty <= 0 || priceCents <= 0) throw new IllegalArgumentException("quantité et prix positifs");
    }

    /** Le montant engagé : quantité × prix, en centimes. */
    long notional() { return Math.multiplyExact(qty, priceCents); }
}
