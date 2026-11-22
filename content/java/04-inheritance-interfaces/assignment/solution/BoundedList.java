import java.util.AbstractList;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.RandomAccess;

/**
 * Une liste qui ne dépasse jamais sa capacité : le tampon des ordres en attente d'envoi.
 *
 * <p>Composition : elle enveloppe n'importe quelle liste. Construite sur AbstractList, elle n'a qu'un seul point
 * d'insertion, {@link #add(int, Object)} : add(E), addAll, listIterator().add et subList(...).add y passent tous.
 * Une méthode d'ajout future de List, par défaut, y passera aussi.
 */
public final class BoundedList<E> extends AbstractList<E> implements RandomAccess {
    private final List<E> list;
    private final int capacity;

    private BoundedList(List<E> list, int capacity) {
        this.list = list;
        this.capacity = capacity;
    }

    /** Enveloppe {@code list}, qui ne doit déjà pas dépasser {@code capacity}. */
    public static <E> BoundedList<E> wrap(List<E> list, int capacity) {
        Objects.requireNonNull(list, "list");
        if (capacity < 0) throw new IllegalArgumentException("capacité négative : " + capacity);
        if (list.size() > capacity) throw new IllegalArgumentException("la liste dépasse déjà la capacité : " + list.size());
        return new BoundedList<>(list, capacity);
    }

    public int capacity() {
        return capacity;
    }

    @Override public E get(int index)              { return list.get(index); }
    @Override public E set(int index, E element)   { return list.set(index, element); }
    @Override public int size()                    { return list.size(); }
    @Override public E remove(int index)           { modCount++; return list.remove(index); }

    /** Le seul point d'insertion. */
    @Override
    public void add(int index, E element) {
        ensureRoom(1);
        list.add(index, element);
        modCount++;
    }

    /** Tout ou rien : un lot qui ne tient pas est refusé entièrement, la liste ne change pas. */
    @Override
    public boolean addAll(int index, Collection<? extends E> c) {
        ensureRoom(c.size());
        modCount++;
        return list.addAll(index, c);
    }

    @Override
    public boolean addAll(Collection<? extends E> c) {
        return addAll(size(), c);
    }

    private void ensureRoom(int extra) {
        if ((long) list.size() + extra > capacity) {
            throw new IllegalStateException("capacité atteinte : " + list.size() + " + " + extra + " > " + capacity);
        }
    }
}
