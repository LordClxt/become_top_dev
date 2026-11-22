import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Optional;

/**
 * Les réglages d'Ordo, chacun avec son propre type : un conteneur hétérogène typé.
 * La clé porte le type ; type.cast vérifie à l'entrée (contre les types bruts) et rétablit le type à la sortie.
 */
public final class Settings {
    private final Map<Key<?>, Object> values = new HashMap<>();

    public <T> void put(Key<T> key, T value) {
        Objects.requireNonNull(key, "key");
        values.put(key, key.type().cast(Objects.requireNonNull(value, "value")));
    }

    public <T> Optional<T> get(Key<T> key) {
        return Optional.ofNullable(key.type().cast(values.get(key)));
    }

    /** La valeur, ou NoSuchElementException qui nomme la clé. */
    public <T> T require(Key<T> key) {
        return get(key).orElseThrow(() -> new NoSuchElementException("réglage manquant : " + key.name() + " (" + key.type().getSimpleName() + ")"));
    }
}
