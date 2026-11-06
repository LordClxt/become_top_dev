import java.util.List;

/** Le solde d'une journée, en centimes. */
final class Ledger {
    private Ledger() { throw new AssertionError(); }

    static long balance(List<Event> events) {
        return events.stream().mapToLong(Ledger::effect).sum();
    }

    /** Effet d'un événement sur le solde. */
    static long effect(Event e) {
        return switch (e) {
            case Sale s -> s.cents();
            case Refund r -> -r.cents();
            case Fee f -> -FeePolicy.cents(f.kind());
            default -> 0;   // les autres événements ne touchent pas au solde
        };
    }
}
