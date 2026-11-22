import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

/** Un ensemble qui compte les tentatives d'insertion (doublons compris) depuis sa création. */
public class InstrumentedSet<E> extends HashSet<E> {
    private int addCount = 0;

    public InstrumentedSet(Set<E> s) {
        super(s);
    }

    @Override
    public boolean add(E e) {
        addCount++;
        return super.add(e);
    }

    @Override
    public boolean addAll(Collection<? extends E> c) {
        addCount += c.size();
        return super.addAll(c);
    }

    /** Nombre de tentatives d'insertion depuis la création de l'enveloppe. */
    public int addCount() {
        return addCount;
    }
}
