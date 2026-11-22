import java.util.Set;

/** Un changement d'un ensemble observable. */
public interface SetEvent<E> {
    record Added<E>(E element) implements SetEvent<E> { }

    record Removed<E>(E element) implements SetEvent<E> { }

    /** Un seul événement pour clear(), avec tous les éléments retirés. */
    record Cleared<E>(Set<E> removed) implements SetEvent<E> { }
}
