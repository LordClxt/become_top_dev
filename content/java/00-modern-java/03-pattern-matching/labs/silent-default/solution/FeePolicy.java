/** Barème contractuel des frais, en centimes. */
final class FeePolicy {
    private FeePolicy() { throw new AssertionError(); }

    static long cents(FeeKind kind) {
        return switch (kind) {       // flèches : pas de fall-through, et exhaustif sur l'enum
            case LATE -> 300;
            case CANCELLATION -> 500;
            case CURRENCY -> 150;
        };
    }
}
