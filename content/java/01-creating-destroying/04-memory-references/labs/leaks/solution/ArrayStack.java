import java.util.Arrays;
import java.util.EmptyStackException;

/** Pile sur tableau. Elle gère sa propre mémoire : c'est à elle d'oublier ce qu'elle a dépilé. */
public final class ArrayStack<E> {
    private Object[] elements = new Object[4];
    private int size;

    public void push(E e) {
        if (size == elements.length) {
            elements = Arrays.copyOf(elements, 2 * size + 1);
        }
        elements[size++] = e;
    }

    public E pop() {
        if (size == 0) throw new EmptyStackException();
        @SuppressWarnings("unchecked") // seul push écrit dans le tableau, avec des E
        E result = (E) elements[--size];
        elements[size] = null; // référence obsolète : on la retire pour que le GC puisse récupérer l'objet
        return result;
    }

    public void clear() {
        Arrays.fill(elements, 0, size, null);
        size = 0;
    }

    public int size() { return size; }
}
