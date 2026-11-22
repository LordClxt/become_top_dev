import java.util.ArrayDeque;
import java.util.Collection;
import java.util.Deque;

/** Une pile générique. */
public final class Stack<E> {
    private final Deque<E> items = new ArrayDeque<>();

    public void push(E e) { items.push(e); }

    public E pop() { return items.pop(); }

    public boolean isEmpty() { return items.isEmpty(); }

    public int size() { return items.size(); }

    /** Empile chaque élément de src, dans l'ordre. */
    public void pushAll(Iterable<? extends E> src) {
        for (E e : src) push(e);
    }

    /** Dépile tout, dans dst. */
    public void popAll(Collection<? super E> dst) {
        while (!isEmpty()) dst.add(pop());
    }
}
