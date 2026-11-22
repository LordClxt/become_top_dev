import java.util.Arrays;
import java.util.NoSuchElementException;

/**
 * Les N derniers éléments reçus (les derniers prix d'un titre) : quand le tampon est plein, le plus ancien est écrasé.
 */
public class RingBuffer<E> {
    private final E[] elements;
    private int head;   // indice du plus ancien
    private int size;

    public RingBuffer(int capacity) {
        if (capacity < 1) throw new IllegalArgumentException("capacité d'au moins 1 attendue : " + capacity);
        elements = (E[]) new Object[capacity];
    }

    public void push(E e) {
        int tail = (head + size) % elements.length;
        elements[tail] = e;
        if (size < elements.length) size++;
        else head = (head + 1) % elements.length;
    }

    /** Retire et renvoie le plus ancien. */
    public E poll() {
        if (size == 0) throw new NoSuchElementException("tampon vide");
        E e = elements[head];
        head = (head + 1) % elements.length;
        size--;
        return e;
    }

    public int size() {
        return size;
    }

    /** Les éléments, du plus ancien au plus récent. */
    public E[] snapshot() {
        E[] out = (E[]) new Object[size];
        for (int i = 0; i < size; i++) out[i] = elements[(head + i) % elements.length];
        return out;
    }
}
