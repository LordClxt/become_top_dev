import java.util.Arrays;
import java.util.EmptyStackException;

/** Pile sur tableau. Tous les tests fonctionnels passent… et pourtant elle fuit. */
public final class ArrayStack<E> {
    private Object[] elements = new Object[4];
    private int size;

    public void push(E e) {
        if (size == elements.length) {
            elements = Arrays.copyOf(elements, 2 * size + 1);
        }
        elements[size++] = e;
    }

    /** Pile vide : EmptyStackException. */
    @SuppressWarnings("unchecked")
    public E pop() {
        return (E) elements[--size];
    }

    /** Vide la pile. */
    public void clear() {
        size = 0;
    }

    public int size() { return size; }
}
