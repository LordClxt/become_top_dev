import java.util.Set;
import java.util.function.Consumer;

/** Un ensemble qui prévient ses écouteurs de chaque changement. */
public class ObservableSet<E> {

    public ObservableSet(Set<E> set) {
    }

    /** Abonne un écouteur ; fermer le résultat le désabonne. */
    public AutoCloseable onChange(Consumer<? super SetEvent<E>> listener) {
        throw new UnsupportedOperationException("onChange");
    }

    /** Cet ensemble, vu comme un Set. */
    public Set<E> asSet() {
        throw new UnsupportedOperationException("asSet");
    }
}
