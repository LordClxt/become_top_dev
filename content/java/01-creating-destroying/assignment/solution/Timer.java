import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Collections;
import java.util.Deque;
import java.util.List;
import java.util.function.LongSupplier;

/** Mesure des durées. Créé par {@link MetricRegistry#timer}. */
public final class Timer {
    private final String name;
    private final LongSupplier ticker;
    private final int maxSamples;
    private final Deque<Duration> window;
    private long count;

    Timer(String name, LongSupplier ticker, int maxSamples) {
        this.name = name;
        this.ticker = ticker;
        this.maxSamples = maxSamples;
        this.window = new ArrayDeque<>(maxSamples);
    }

    public String name() {
        return name;
    }

    public Sample start() {
        return new Sample(ticker.getAsLong());
    }

    public long count() {
        return count;
    }

    public List<Duration> recent() {
        return List.copyOf(window);
    }

    public Duration max() {
        return window.isEmpty() ? Duration.ZERO : Collections.max(window);
    }

    private void record(Duration d) {
        count++;
        window.addLast(d);
        if (window.size() > maxSamples) window.removeFirst(); // la plus ancienne n'est plus référencée
    }

    /** Une mesure en cours ; la fermer l'enregistre, une seule fois. */
    public final class Sample implements AutoCloseable {
        private final long startTick;
        private boolean closed;

        private Sample(long startTick) {
            this.startTick = startTick;
        }

        @Override
        public void close() {
            if (closed) return;
            closed = true;
            record(Duration.ofNanos(ticker.getAsLong() - startTick));
        }
    }
}
