import java.util.Iterator;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.StringJoiner;

/**
 * Une file persistante à deux piles : on retire de {@code front}, on ajoute sur {@code back}. Quand front se
 * vide, back est inversée une fois : chaque élément est déplacé au plus une fois, d'où O(1) amorti en usage linéaire.
 * Invariant : front n'est vide que si la file est vide.
 */
public final class PQueue<E> implements Iterable<E> {
    private static final PQueue<Object> EMPTY = new PQueue<>(PStack.empty(), PStack.empty());

    private final PStack<E> front;
    private final PStack<E> back;

    private PQueue(PStack<E> front, PStack<E> back) {
        this.front = front;
        this.back = back;
    }

    @SuppressWarnings("unchecked") // sûr : la file vide ne contient aucun E
    public static <E> PQueue<E> empty() {
        return (PQueue<E>) EMPTY;
    }

    /** Rétablit l'invariant. */
    private static <E> PQueue<E> of(PStack<E> front, PStack<E> back) {
        if (!front.isEmpty()) return new PQueue<>(front, back);
        return back.isEmpty() ? empty() : new PQueue<>(back.reverse(), PStack.empty());
    }

    public PQueue<E> enqueue(E element) {
        return of(front, back.push(Objects.requireNonNull(element, "element")));
    }

    public E peek() {
        if (front.isEmpty()) throw new NoSuchElementException("file vide");
        return front.peek();
    }

    public PQueue<E> dequeue() {
        if (front.isEmpty()) throw new NoSuchElementException("file vide");
        return of(front.pop(), back);
    }

    public int size() { return front.size() + back.size(); }

    public boolean isEmpty() { return front.isEmpty(); }

    @Override
    public Iterator<E> iterator() {
        return new Iterator<>() {
            private Iterator<E> current = front.iterator();
            private boolean inBack;

            @Override
            public boolean hasNext() {
                if (!current.hasNext() && !inBack) {
                    current = back.reverse().iterator();
                    inBack = true;
                }
                return current.hasNext();
            }

            @Override
            public E next() {
                if (!hasNext()) throw new NoSuchElementException();
                return current.next();
            }
        };
    }

    /** Égalité de contenu : deux files égales peuvent répartir leurs éléments différemment entre front et back. */
    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof PQueue<?> other) || other.size() != size()) return false;
        Iterator<?> a = iterator(), b = other.iterator();
        while (a.hasNext()) {
            if (!a.next().equals(b.next())) return false;
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
