import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Un journal qui compte les ordres enregistrés, par symbole, en enveloppant n'importe quel autre journal
 * (composition). Seul record compte : recordAll, hérité de Journal, passe par lui.
 */
public final class CountingJournal implements Journal {
    private final Journal inner;
    private final Map<String, Integer> counts = new HashMap<>();
    private int total;

    public CountingJournal(Journal inner) {
        this.inner = Objects.requireNonNull(inner, "inner");
    }

    public int count(String symbol) {
        return counts.getOrDefault(symbol, 0);
    }

    public int total() {
        return total;
    }

    @Override
    public void record(Order order) throws IOException {
        inner.record(order);                     // d'abord l'écriture : un ordre refusé n'est pas compté
        counts.merge(order.symbol(), 1, Integer::sum);
        total++;
    }

    @Override
    public void flush() throws IOException {
        inner.flush();
    }

    @Override
    public void close() throws IOException {
        inner.close();
    }
}
