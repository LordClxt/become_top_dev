/** Barème contractuel des frais, en centimes. */
final class FeePolicy {
    private FeePolicy() { throw new AssertionError(); }

    static long cents(FeeKind kind) {
        long fee = 0;
        switch (kind) {
            case CANCELLATION:
                fee += 500;   // annulation : 5 €
            case LATE:
                fee += 300;   // retard : 3 €
                break;
            case CURRENCY:
                fee += 150;   // change : 1,50 €
                break;
        }
        return fee;
    }
}
