import java.util.ArrayList;
import java.util.List;
import java.util.stream.Gatherer;
import java.util.stream.Gatherers;

/** Paquets et indicateurs calculés dans les streams de transactions. */
final class Batching {
    private Batching() { throw new AssertionError(); }

    /** Paquets de transactions consécutives dont le notionnel total reste ≤ limitCents. */
    static Gatherer<Trade, ?, List<Trade>> byNotional(long limitCents) {
        if (limitCents <= 0) throw new IllegalArgumentException("limite : " + limitCents);
        class Batch {
            final List<Trade> trades = new ArrayList<>();
            long notional;
        }
        return Gatherer.ofSequential(
                Batch::new,
                Gatherer.Integrator.ofGreedy((batch, trade, downstream) -> {
                    if (!batch.trades.isEmpty() && batch.notional + trade.notional() > limitCents) {
                        downstream.push(List.copyOf(batch.trades));
                        batch.trades.clear();
                        batch.notional = 0;
                    }
                    batch.trades.add(trade);
                    batch.notional += trade.notional();
                    return true;
                }),
                (batch, downstream) -> {
                    if (!batch.trades.isEmpty()) downstream.push(List.copyOf(batch.trades));
                });
    }

    /** Laisse passer les transactions tant que le cumul reste ≤ capCents, puis arrête le stream. */
    static Gatherer<Trade, ?, Trade> untilExposure(long capCents) {
        class Exposure { long total; }
        return Gatherer.ofSequential(
                Exposure::new,
                (exposure, trade, downstream) -> {
                    if (exposure.total + trade.notional() > capCents) return false;   // plus rien ne passe
                    exposure.total += trade.notional();
                    return downstream.push(trade);
                });
    }

    static List<Long> movingAverages(List<Long> prices, int window) {
        if (window <= 0) throw new IllegalArgumentException("fenêtre : " + window);
        return prices.stream()
                .gather(Gatherers.windowSliding(window))
                .filter(w -> w.size() == window)   // windowSliding émet une fenêtre incomplète si le flux est trop court
                .map(w -> w.stream().mapToLong(Long::longValue).sum() / window)
                .toList();
    }

    static List<Long> runningExposure(List<Trade> trades) {
        return trades.stream()
                .gather(Gatherers.scan(() -> 0L, (total, trade) -> total + trade.notional()))
                .toList();
    }
}
