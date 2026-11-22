import java.util.Optional;
import java.util.Set;

/** Les règles livrées par la bibliothèque. Fourni. */
public enum StandardRule implements OrderRule {
    POSITIVE_QUANTITY {
        public Optional<String> violation(Order o) {
            return o.quantity() > 0 ? Optional.empty() : Optional.of("quantité " + o.quantity());
        }
    },
    POSITIVE_PRICE {
        public Optional<String> violation(Order o) {
            return o.priceCents() > 0 ? Optional.empty() : Optional.of("prix " + o.priceCents());
        }
    },
    KNOWN_SYMBOL {
        private static final Set<String> KNOWN = Set.of("ACME", "BOLT", "XYZ");

        public Optional<String> violation(Order o) {
            return KNOWN.contains(o.symbol()) ? Optional.empty() : Optional.of("symbole inconnu " + o.symbol());
        }
    }
}
