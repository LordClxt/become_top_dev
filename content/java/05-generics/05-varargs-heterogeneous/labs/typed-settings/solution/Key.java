import java.util.Objects;

/** La clé d'un réglage : un nom et le type de sa valeur. Fournie. */
public record Key<T>(String name, Class<T> type) {
    public Key {
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(type, "type");
    }

    public static <T> Key<T> of(String name, Class<T> type) {
        return new Key<>(name, type);
    }
}
