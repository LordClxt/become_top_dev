import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.SortedSet;
import java.util.TreeSet;
import java.util.function.LongSupplier;
import java.util.regex.Pattern;

/** Registre de métriques : un nom désigne une seule métrique (compteur ou timer). */
public final class MetricRegistry {
    // Compilée une fois : Pattern est immuable et coûteux à construire.
    private static final Pattern NAME = Pattern.compile("[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*");

    private final LongSupplier ticker;
    private final int maxSamples;
    private final Map<String, Object> metrics = new HashMap<>();

    private MetricRegistry(Builder b) {
        this.ticker = b.ticker;
        this.maxSamples = b.maxSamples;
    }

    public static Builder builder() {
        return new Builder();
    }

    public Counter counter(String name) {
        return lookup(name, Counter.class);
    }

    public Timer timer(String name) {
        return lookup(name, Timer.class);
    }

    public SortedSet<String> names() {
        return Collections.unmodifiableSortedSet(new TreeSet<>(metrics.keySet()));
    }

    private <M> M lookup(String name, Class<M> type) {
        Objects.requireNonNull(name, "name");
        if (!NAME.matcher(name).matches()) {
            throw new IllegalArgumentException("nom de métrique invalide : " + name);
        }
        Object metric = metrics.computeIfAbsent(name,
                n -> type == Counter.class ? new Counter(n) : new Timer(n, ticker, maxSamples));
        if (!type.isInstance(metric)) {
            throw new IllegalArgumentException(name + " est déjà un " + metric.getClass().getSimpleName());
        }
        return type.cast(metric);
    }

    public static final class Builder {
        private LongSupplier ticker = System::nanoTime;
        private int maxSamples = 100;

        private Builder() { }

        public Builder ticker(LongSupplier ticker) {
            this.ticker = Objects.requireNonNull(ticker, "ticker");
            return this;
        }

        public Builder maxSamples(int maxSamples) {
            if (maxSamples < 1) throw new IllegalArgumentException("maxSamples doit valoir au moins 1 : " + maxSamples);
            this.maxSamples = maxSamples;
            return this;
        }

        public MetricRegistry build() {
            return new MetricRegistry(this);
        }
    }
}
