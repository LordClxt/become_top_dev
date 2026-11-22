import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * Les N derniers éléments reçus (les derniers prix d'un titre) : quand le tampon est plein, le plus ancien est écrasé.
 */
public class RingBuffer<E> {
    private final Object[] elements;   // jamais exposé : seuls push et les lectures ci-dessous y accèdent
    private int head;                  // indice du plus ancien
    private int size;

    public RingBuffer(int capacity) {
        if (capacity < 1) throw new IllegalArgumentException("capacité d'au moins 1 attendue : " + capacity);
        elements = new Object[capacity];
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
        E e = at(0);
        elements[head] = null;             // plus de référence vers l'élément retiré
        head = (head + 1) % elements.length;
        size--;
        return e;
    }

    public int size() {
        return size;
    }

    /** Les éléments, du plus ancien au plus récent : une copie indépendante, sûre pour l'appelant. */
    public List<E> snapshot() {
        List<E> out = new ArrayList<>(size);
        for (int i = 0; i < size; i++) out.add(at(i));
        return out;
    }

    private E at(int i) {
        // Sûr : seul push écrit dans elements, et il ne reçoit que des E.
        @SuppressWarnings("unchecked") E e = (E) elements[(head + i) % elements.length];
        return e;
    }
}
