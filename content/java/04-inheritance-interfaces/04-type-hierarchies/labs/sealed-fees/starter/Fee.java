/**
 * Les frais de courtage d'un ordre, en centimes, calculés sur son montant (notionnel).
 * Trois sortes : forfait, pourcentage (en points de base, 1 pb = 0,01 %), et paliers.
 */
public final class Fee {
    enum Kind { FLAT, PERCENT, TIERED }

    private final Kind kind;
    private long flatCents;
    private int basisPoints;        // PERCENT ; TIERED sous le seuil
    private long thresholdCents;    // TIERED
    private int basisPointsAbove;   // TIERED au-dessus du seuil

    private Fee(Kind kind) {
        this.kind = kind;
    }

    public static Fee flat(long cents) {
        Fee f = new Fee(Kind.FLAT);
        f.flatCents = cents;
        return f;
    }

    public static Fee percent(int basisPoints) {
        Fee f = new Fee(Kind.PERCENT);
        f.basisPoints = basisPoints;
        return f;
    }

    /** {@code below} pb jusqu'à {@code thresholdCents} inclus, puis {@code above} pb sur la part au-delà. */
    public static Fee tiered(long thresholdCents, int below, int above) {
        Fee f = new Fee(Kind.TIERED);
        f.thresholdCents = thresholdCents;
        f.basisPoints = below;
        f.basisPointsAbove = above;
        return f;
    }

    /** Les frais sur un montant, en centimes (arrondi vers le bas). */
    public long on(long notionalCents) {
        switch (kind) {
            case FLAT:
                return flatCents;
            case PERCENT:
                return notionalCents * basisPoints / 10_000;
            default:
                return 0;
        }
    }
}
