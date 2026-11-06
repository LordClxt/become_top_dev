import java.util.Iterator;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.StringJoiner;

/**
 * Une pile persistante. Chaque instance est un nœud (sommet + reste) : push crée un nœud, pop renvoie le reste.
 * Immuable, donc partageable entre versions et entre threads sans synchronisation.
 */
public final class PStack<E> implements Iterable<E> {
    private static final PStack<Object> EMPTY = new PStack<>(null, null, 0);

    private final E head;
    private final PStack<E> tail;
    private final int size;

    private PStack(E head, PStack<E> tail, int size) {
        this.head = head;
        this.tail = tail;
        this.size = size;
    }

    @SuppressWarnings("unchecked") // sûr : la pile vide ne contient aucun E
    public static <E> PStack<E> empty() {
        return (PStack<E>) EMPTY;
    }

    public PStack<E> push(E element) {
        return new PStack<>(Objects.requireNonNull(element, "element"), this, size + 1);
    }

    public E peek() {
        if (size == 0) throw new NoSuchElementException("pile vide");
        return head;
    }

    public PStack<E> pop() {
        if (size == 0) throw new NoSuchElementException("pile vide");
        return tail;
    }

    public int size() { return size; }

    public boolean isEmpty() { return size == 0; }

    public PStack<E> reverse() {
        PStack<E> r = empty();
        for (E e : this) r = r.push(e);
        return r;
    }

    @Override
    public Iterator<E> iterator() {
        return new Iterator<>() {
            private PStack<E> cursor = PStack.this;

            @Override
            public boolean hasNext() { return cursor.size > 0; }

            @Override
            public E next() {
                if (cursor.size == 0) throw new NoSuchElementException();
                E e = cursor.head;
                cursor = cursor.tail;
                return e;
            }
        };
    }

    // Itératifs, jamais récursifs : une pile de 500 000 éléments ferait déborder la pile d'appels.
    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof PStack<?> other) || other.size != size) return false;
        PStack<?> a = this, b = other;
        while (a.size > 0) {
            if (a == b) return true;   // reste partagé : forcément égal
            if (!a.head.equals(b.head)) return false;
            a = a.tail;
            b = b.tail;
        }
        return true;
    }

    @Override
    public int hashCode() {
        int h = 1;
        for (E e : this) h = 31 * h + e.hashCode();
        return h;
    }

    @Override
    public String toString() {
        StringJoiner j = new StringJoiner(", ", "[", "]");
        for (E e : this) j.add(String.valueOf(e));
        return j.toString();
    }
}
