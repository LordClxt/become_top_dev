import java.util.Iterator;

/** Une file persistante (immuable, à partage structurel). */
public final class PQueue<E> implements Iterable<E> {
    private PQueue() { }

    public static <E> PQueue<E> empty() {
        throw new UnsupportedOperationException("TODO");
    }

    public PQueue<E> enqueue(E element) {
        throw new UnsupportedOperationException("TODO");
    }

    public E peek() {
        throw new UnsupportedOperationException("TODO");
    }

    public PQueue<E> dequeue() {
        throw new UnsupportedOperationException("TODO");
    }

    public int size() {
        throw new UnsupportedOperationException("TODO");
    }

    public boolean isEmpty() {
        throw new UnsupportedOperationException("TODO");
    }

    @Override
    public Iterator<E> iterator() {
        throw new UnsupportedOperationException("TODO");
    }
}
