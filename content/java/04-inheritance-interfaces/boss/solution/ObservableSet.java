import java.util.AbstractSet;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

/**
 * Un ensemble qui prévient ses écouteurs de chaque changement réel, une seule fois par élément.
 *
 * <p>Composition : il enveloppe n'importe quel Set. Squelette : AbstractSet route addAll vers add, et
 * removeAll, retainAll et removeIf vers remove ou vers l'itérateur ; il suffit donc d'observer add, remove,
 * Iterator.remove et clear. Finale : pas conçue pour l'héritage.
 */
public final class ObservableSet<E> {
    private final Set<E> set;
    private final List<Consumer<? super SetEvent<E>>> listeners = new CopyOnWriteArrayList<>();
    private final View view = new View();

    public ObservableSet(Set<E> set) {
        this.set = Objects.requireNonNull(set, "set");
    }

    /** Abonne un écouteur ; fermer le résultat le désabonne (une seule fois). */
    public AutoCloseable onChange(Consumer<? super SetEvent<E>> listener) {
        Objects.requireNonNull(listener, "listener");
        listeners.add(listener);
        return new Registration<>(listeners, listener);
    }

    /** Cet ensemble, vu comme un Set : toute modification passe par les écouteurs. */
    public Set<E> asSet() {
        return view;
    }

    private void fire(SetEvent<E> event) {
        for (var l : listeners) l.accept(event);
    }

    /**
     * Statique : garder un abonnement ne retient que la liste des écouteurs, pas l'ensemble (ni son contenu).
     */
    private static final class Registration<T> implements AutoCloseable {
        private final List<T> listeners;
        private T listener;

        Registration(List<T> listeners, T listener) {
            this.listeners = listeners;
            this.listener = listener;
        }

        @Override
        public void close() {
            if (listener != null) {
                listeners.remove(listener);
                listener = null;
            }
        }
    }

    /** Vue interne : elle lit et modifie l'ensemble englobant, c'est son rôle. */
    private final class View extends AbstractSet<E> {
        @Override
        public int size() {
            return set.size();
        }

        @Override
        public boolean contains(Object o) {
            return set.contains(o);
        }

        @Override
        public boolean add(E e) {
            boolean changed = set.add(e);
            if (changed) fire(new SetEvent.Added<>(e));
            return changed;
        }

        @Override
        @SuppressWarnings("unchecked")
        public boolean remove(Object o) {
            boolean changed = set.remove(o);
            if (changed) fire(new SetEvent.Removed<>((E) o));
            return changed;
        }

        @Override
        public void clear() {
            if (set.isEmpty()) return;
            Set<E> removed = new HashSet<>(set);
            set.clear();
            fire(new SetEvent.Cleared<>(removed));
        }

        @Override
        public Iterator<E> iterator() {
            Iterator<E> it = set.iterator();
            return new Iterator<>() {
                private E last;

                @Override
                public boolean hasNext() {
                    return it.hasNext();
                }

                @Override
                public E next() {
                    last = it.next();
                    return last;
                }

                @Override
                public void remove() {
                    it.remove();
                    fire(new SetEvent.Removed<>(last));
                }
            };
        }
    }
}
