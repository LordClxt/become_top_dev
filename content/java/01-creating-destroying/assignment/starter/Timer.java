import java.time.Duration;
import java.util.List;

/** Mesure des durées. Créé par {@link MetricRegistry#timer}. */
public final class Timer {

    // TODO : champs, constructeur (pas public).

    public String name() {
        throw new UnsupportedOperationException("name à écrire");
    }

    /** Démarre une mesure, enregistrée à la fermeture du Sample. */
    public Sample start() {
        throw new UnsupportedOperationException("start à écrire");
    }

    /** Toutes les mesures depuis la création. */
    public long count() {
        throw new UnsupportedOperationException("count à écrire");
    }

    /** Les maxSamples dernières mesures, de la plus ancienne à la plus récente. */
    public List<Duration> recent() {
        throw new UnsupportedOperationException("recent à écrire");
    }

    /** Maximum de recent(), Duration.ZERO si vide. */
    public Duration max() {
        throw new UnsupportedOperationException("max à écrire");
    }

    /** Une mesure en cours. */
    public final class Sample implements AutoCloseable {
        // TODO

        @Override
        public void close() {
            throw new UnsupportedOperationException("close à écrire");
        }
    }
}
