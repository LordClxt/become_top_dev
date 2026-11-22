import java.util.Optional;

/** Les règles de la salle des marchés : elles complètent celles de la bibliothèque en implémentant OrderRule. */
public enum RiskRule implements OrderRule {
    /** Pas plus de 100 000 € par ordre. */
    MAX_NOTIONAL {
        public Optional<String> violation(Order o) {
            long notional = Math.multiplyExact(o.quantity(), o.priceCents());
            return notional <= LIMIT_CENTS ? Optional.empty() : Optional.of("montant " + notional + " > " + LIMIT_CENTS);
        }
    },
    /** XYZ est sous embargo. */
    BANNED_SYMBOL {
        public Optional<String> violation(Order o) {
            return "XYZ".equals(o.symbol()) ? Optional.of("symbole sous embargo " + o.symbol()) : Optional.empty();
        }
    };

    private static final long LIMIT_CENTS = 10_000_000;
}
