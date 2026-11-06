import java.util.LinkedHashMap;
import java.util.List;
import java.util.SequencedMap;
import java.util.TreeMap;
import java.util.stream.Collectors;

/** Une session de console : les ordres vivants et l'état de la session. */
final class Session {
    private final SequencedMap<Long, Place> live = new LinkedHashMap<>();   // ordre d'arrivée
    private long nextId = 1;
    private boolean closed;

    Reply handle(Command command) {
        if (closed) return new Rejected("session fermée");
        return switch (command) {
            case Place p -> {
                long id = nextId++;
                live.put(id, p);
                yield new Accepted(id);
            }
            case Cancel(long id) -> live.remove(id) != null ? new Cancelled(id) : new Rejected("ordre inconnu : " + id);
            case Book(String symbol) -> new BookView(symbol, levels(symbol, Side.SELL), levels(symbol, Side.BUY));
            case Quit() -> {
                closed = true;
                yield new Bye();
            }
        };
    }

    /** Ventes du moins cher au plus cher ; achats du plus cher au moins cher. */
    private List<Level> levels(String symbol, Side side) {
        TreeMap<Long, Long> byPrice = live.values().stream()
                .filter(p -> p.symbol().equals(symbol) && p.side() == side)
                .collect(Collectors.groupingBy(Place::limitCents, TreeMap::new, Collectors.summingLong(Place::qty)));
        var ordered = side == Side.SELL ? byPrice : byPrice.descendingMap();
        return ordered.entrySet().stream().map(e -> new Level(e.getKey(), e.getValue())).toList();
    }
}
