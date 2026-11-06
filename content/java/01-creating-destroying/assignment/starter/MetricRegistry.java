import java.util.SortedSet;
import java.util.function.LongSupplier;

/** Registre de métriques : un nom désigne une seule métrique (compteur ou timer). */
public final class MetricRegistry {

    // TODO : champs, constructeur privé.

    public static Builder builder() {
        throw new UnsupportedOperationException("builder à écrire");
    }

    /** Le compteur de ce nom, créé au premier appel. */
    public Counter counter(String name) {
        throw new UnsupportedOperationException("counter à écrire");
    }

    /** Le timer de ce nom, créé au premier appel. */
    public Timer timer(String name) {
        throw new UnsupportedOperationException("timer à écrire");
    }

    /** Noms enregistrés, triés, non modifiable. */
    public SortedSet<String> names() {
        throw new UnsupportedOperationException("names à écrire");
    }

    public static final class Builder {
        // TODO : valeurs par défaut (System::nanoTime, 100).

        public Builder ticker(LongSupplier ticker) {
            throw new UnsupportedOperationException("ticker à écrire");
        }

        public Builder maxSamples(int maxSamples) {
            throw new UnsupportedOperationException("maxSamples à écrire");
        }

        public MetricRegistry build() {
            throw new UnsupportedOperationException("build à écrire");
        }
    }
}
