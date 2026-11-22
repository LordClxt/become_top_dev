/**
 * Les frais de courtage d'un ordre, en centimes, calculés sur son montant (notionnel).
 * Trois sortes, et pas une de plus : une interface scellée, un record par sorte.
 */
public sealed interface Fee {

    /** Les frais sur un montant, en centimes (arrondi vers le bas). */
    long on(long notionalCents);

    static Fee flat(long cents) {
        return new Flat(cents);
    }

    static Fee percent(int basisPoints) {
        return new Percent(basisPoints);
    }

    /** {@code below} pb jusqu'à {@code thresholdCents} inclus, puis {@code above} pb sur la part au-delà. */
    static Fee tiered(long thresholdCents, int below, int above) {
        return new Tiered(thresholdCents, below, above);
    }

    private static int checkBasisPoints(int bp) {
        if (bp < 0 || bp > 10_000) throw new IllegalArgumentException("points de base hors de [0, 10000] : " + bp);
        return bp;
    }

    record Flat(long cents) implements Fee {
        public Flat {
            if (cents < 0) throw new IllegalArgumentException("forfait négatif : " + cents);
        }

        @Override
        public long on(long notionalCents) {
            return cents;
        }
    }

    record Percent(int basisPoints) implements Fee {
        public Percent {
            checkBasisPoints(basisPoints);
        }

        @Override
        public long on(long notionalCents) {
            return notionalCents * basisPoints / 10_000;
        }
    }

    record Tiered(long thresholdCents, int below, int above) implements Fee {
        public Tiered {
            if (thresholdCents <= 0) throw new IllegalArgumentException("seuil positif attendu : " + thresholdCents);
            checkBasisPoints(below);
            checkBasisPoints(above);
        }

        @Override
        public long on(long notionalCents) {
            if (notionalCents <= thresholdCents) return notionalCents * below / 10_000;
            return thresholdCents * below / 10_000 + (notionalCents - thresholdCents) * above / 10_000;
        }
    }
}
