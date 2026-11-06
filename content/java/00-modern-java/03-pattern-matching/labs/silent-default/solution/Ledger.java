import java.util.List;

/** Le solde d'une journée, en centimes. */
final class Ledger {
    private Ledger() { throw new AssertionError(); }

    static long balance(List<Event> events) {
        return events.stream().mapToLong(Ledger::effect).sum();
    }

    /** Effet d'un événement sur le solde. Pas de default : une nouvelle variante d'Event ne compilera pas ici. */
    static long effect(Event e) {
        return switch (e) {
            case Sale(var _, long cents) -> cents;
            case Refund(var _, long cents) -> -cents;
            case Fee(FeeKind kind, var _) -> -FeePolicy.cents(kind);
            case Chargeback(var _, long cents) -> -cents;
        };
    }
}
