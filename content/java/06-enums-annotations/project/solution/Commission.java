import java.util.Objects;

/**
 * La commission prélevée sur une transaction : un forfait, ou un taux en points de base (1 pb = 0,01 %).
 * Hiérarchie fermée : chaque sorte sait se calculer.
 */
public sealed interface Commission {
    /** La commission sur ce montant, dans sa devise. */
    Money on(Money notional);

    record Flat(Money amount) implements Commission {
        public Flat {
            Objects.requireNonNull(amount, "amount");
            if (amount.minorUnits() < 0) throw new IllegalArgumentException("forfait négatif : " + amount);
        }

        @Override
        public Money on(Money notional) {
            if (notional.currency() != amount.currency()) {
                throw new IllegalArgumentException("devises différentes : " + amount + " sur " + notional);
            }
            return amount;
        }
    }

    record Rate(int basisPoints) implements Commission {
        public Rate {
            if (basisPoints < 0 || basisPoints > 10_000) throw new IllegalArgumentException("points de base hors de [0, 10000] : " + basisPoints);
        }

        /** Arrondi vers le bas, à l'unité mineure de la devise. */
        @Override
        public Money on(Money notional) {
            return Money.ofMinor(Math.multiplyExact(notional.minorUnits(), (long) basisPoints) / 10_000, notional.currency());
        }
    }
}
