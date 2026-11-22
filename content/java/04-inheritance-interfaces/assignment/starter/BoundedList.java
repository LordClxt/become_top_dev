import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/** Une liste qui ne dépasse jamais sa capacité : le tampon des ordres en attente d'envoi. */
public class BoundedList<E> extends ArrayList<E> {
    private final int capacity;

    public BoundedList(int capacity) {
        this.capacity = capacity;
    }

    /** Une liste bornée qui reprend le contenu de {@code list}. */
    public static <E> BoundedList<E> wrap(List<E> list, int capacity) {
        BoundedList<E> b = new BoundedList<>(capacity);
        b.addAll(list);
        return b;
    }

    public int capacity() {
        return capacity;
    }

    @Override
    public boolean add(E e) {
        if (size() >= capacity) throw new IllegalStateException("capacité atteinte : " + capacity);
        return super.add(e);
    }

    @Override
    public boolean addAll(Collection<? extends E> c) {
        if (size() + c.size() > capacity) throw new IllegalStateException("capacité atteinte : " + capacity);
        return super.addAll(c);
    }
}
