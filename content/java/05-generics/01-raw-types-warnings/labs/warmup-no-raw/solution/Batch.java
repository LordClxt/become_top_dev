import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/** Un lot d'éléments à envoyer ensemble (identifiants d'ordres, lignes de journal…). */
public class Batch<E> {
    private final List<E> items = new ArrayList<>();

    public void add(E item) {
        items.add(item);
    }

    public void addAll(Collection<? extends E> more) {
        items.addAll(more);
    }

    public E get(int index) {
        return items.get(index);
    }

    public int size() {
        return items.size();
    }

    /** Vide le lot et renvoie son contenu. */
    public List<E> drain() {
        List<E> out = new ArrayList<>(items);
        items.clear();
        return out;
    }
}
