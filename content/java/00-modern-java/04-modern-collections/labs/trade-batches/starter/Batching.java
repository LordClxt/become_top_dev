import java.util.List;
import java.util.stream.Gatherer;

/** Paquets et indicateurs calculés dans les streams de transactions. */
final class Batching {
    private Batching() { throw new AssertionError(); }

    static Gatherer<Trade, ?, List<Trade>> byNotional(long limitCents) {
        throw new UnsupportedOperationException("byNotional");
    }

    static Gatherer<Trade, ?, Trade> untilExposure(long capCents) {
        throw new UnsupportedOperationException("untilExposure");
    }

    static List<Long> movingAverages(List<Long> prices, int window) {
        throw new UnsupportedOperationException("movingAverages");
    }

    static List<Long> runningExposure(List<Trade> trades) {
        throw new UnsupportedOperationException("runningExposure");
    }
}
