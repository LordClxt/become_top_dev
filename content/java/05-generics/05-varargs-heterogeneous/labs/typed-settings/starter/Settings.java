import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

/** Les réglages d'Ordo, chacun avec son propre type. */
public final class Settings {
    private final Map<String, Object> values = new HashMap<>();

    public <T> void put(Key<T> key, T value) {
        values.put(key.name(), value);
    }

    public <T> Optional<T> get(Key<T> key) {
        return Optional.ofNullable((T) values.get(key.name()));
    }

    /** La valeur, ou NoSuchElementException qui nomme la clé. */
    public <T> T require(Key<T> key) {
        T value = (T) values.get(key.name());
        if (value == null) throw new NoSuchElementException();
        return value;
    }
}
