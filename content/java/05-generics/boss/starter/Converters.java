import java.util.Optional;
import java.util.function.Function;

/** Un registre de convertisseurs entre types. */
public class Converters {

    public <S, T> void register(Class<S> from, Class<T> to, Function<S, T> converter) {
        throw new UnsupportedOperationException("register");
    }

    public <T> T convert(Object value, Class<T> to) {
        throw new UnsupportedOperationException("convert");
    }

    public <T> Optional<T> tryConvert(Object value, Class<T> to) {
        throw new UnsupportedOperationException("tryConvert");
    }

    public <S, T> Function<S, T> converter(Class<S> from, Class<T> to) {
        throw new UnsupportedOperationException("converter");
    }
}
