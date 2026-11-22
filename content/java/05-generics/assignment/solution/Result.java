import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * Le résultat d'une opération qui peut échouer : une valeur, ou un message d'erreur. Immuable.
 * PECS partout : les fonctions consomment des T (? super T) et produisent des R (? extends R) ;
 * aucun joker dans les types de retour.
 */
public final class Result<T> {
    private final T value;
    private final String error;

    private Result(T value, String error) {
        this.value = value;
        this.error = error;
    }

    public static <T> Result<T> ok(T value) {
        return new Result<>(Objects.requireNonNull(value, "value"), null);
    }

    public static <T> Result<T> err(String error) {
        return new Result<>(null, Objects.requireNonNull(error, "error"));
    }

    public boolean isOk() {
        return error == null;
    }

    public String error() {
        if (isOk()) throw new IllegalStateException("pas d'erreur : " + value);
        return error;
    }

    public <R> Result<R> map(Function<? super T, ? extends R> f) {
        return isOk() ? ok(f.apply(value)) : err(error);
    }

    public <R> Result<R> flatMap(Function<? super T, ? extends Result<? extends R>> f) {
        if (!isOk()) return err(error);
        Result<? extends R> next = f.apply(value);
        return next.isOk() ? ok(next.value) : err(next.error);
    }

    public T orElseGet(Supplier<? extends T> fallback) {
        return isOk() ? value : fallback.get();
    }

    public void ifOk(Consumer<? super T> action) {
        if (isOk()) action.accept(value);
    }

    /** Ok de la liste des valeurs si tous sont Ok, sinon la première erreur. */
    public static <T> Result<List<T>> sequence(List<? extends Result<? extends T>> results) {
        List<T> values = new ArrayList<>(results.size());
        for (Result<? extends T> r : results) {
            if (!r.isOk()) return err(r.error);
            values.add(r.value);
        }
        return ok(List.copyOf(values));
    }

    @Override
    public String toString() {
        return isOk() ? "Ok(" + value + ")" : "Err(" + error + ")";
    }
}
