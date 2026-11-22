import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;

/**
 * Un registre de convertisseurs entre types : un conteneur hétérogène typé dont la clé est une paire de jetons.
 * PECS sur les fonctions, type.cast à chaque frontière, aucun cast non vérifié.
 */
public final class Converters {

    private record Pair(Class<?> from, Class<?> to) { }

    /** Un convertisseur, avec ses deux jetons liés à sa fonction. */
    private record Entry<S, T>(Class<S> from, Class<T> to, Function<? super S, ? extends T> f) {
        T apply(Object value) {
            return to.cast(f.apply(from.cast(value)));   // à la sortie aussi : un type brut ne passe pas
        }
    }

    private final Map<Pair, Entry<?, ?>> entries = new HashMap<>();

    public <S, T> void register(Class<S> from, Class<T> to, Function<? super S, ? extends T> converter) {
        Objects.requireNonNull(from, "from");
        Objects.requireNonNull(to, "to");
        Objects.requireNonNull(converter, "converter");
        entries.put(new Pair(from, to), new Entry<>(from, to, converter));
    }

    public <T> Optional<T> tryConvert(Object value, Class<T> to) {
        Objects.requireNonNull(value, "value");
        Objects.requireNonNull(to, "to");
        Deque<Class<?>> queue = new ArrayDeque<>();
        Set<Class<?>> seen = new HashSet<>();
        queue.add(value.getClass());
        while (!queue.isEmpty()) {                         // du type exact vers ses super-types, le plus proche d'abord
            Class<?> c = queue.poll();
            if (!seen.add(c)) continue;
            Entry<?, ?> e = entries.get(new Pair(c, to));
            if (e != null) return Optional.of(to.cast(e.apply(value)));
            if (c.getSuperclass() != null) queue.add(c.getSuperclass());
            for (Class<?> i : c.getInterfaces()) queue.add(i);
        }
        return to.isInstance(value) ? Optional.of(to.cast(value)) : Optional.empty();
    }

    public <T> T convert(Object value, Class<T> to) {
        Objects.requireNonNull(value, "value");
        return tryConvert(value, to).orElseThrow(() -> new IllegalArgumentException(
                "aucun convertisseur de " + value.getClass().getSimpleName() + " vers " + to.getSimpleName()));
    }

    public <S, T> Function<S, T> converter(Class<S> from, Class<T> to) {
        Objects.requireNonNull(from, "from");
        Objects.requireNonNull(to, "to");
        return s -> convert(s, to);
    }
}
