import java.util.Iterator;

/** Une pile persistante (immuable, à partage structurel). */
public final class PStack<E> implements Iterable<E> {
    private PStack() { }

    public static <E> PStack<E> empty() {
        throw new UnsupportedOperationException("TODO");
    }

    public PStack<E> push(E element) {
        throw new UnsupportedOperationException("TODO");
    }

    public E peek() {
        throw new UnsupportedOperationException("TODO");
    }

    public PStack<E> pop() {
        throw new UnsupportedOperationException("TODO");
    }

    public int size() {
        throw new UnsupportedOperationException("TODO");
    }

    public boolean isEmpty() {
        throw new UnsupportedOperationException("TODO");
    }

    public PStack<E> reverse() {
        throw new UnsupportedOperationException("TODO");
    }

    @Override
    public Iterator<E> iterator() {
        throw new UnsupportedOperationException("TODO");
    }
}
