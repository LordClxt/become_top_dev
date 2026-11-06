import java.util.List;
import java.util.Optional;

/** Un instantané d'un côté du carnet, agrégé par prix. TODO (M3) : le rendre vraiment immuable et validé. */
public record BookSnapshot(Side side, String symbol, List<Level> levels) {
    /** Un niveau de prix : la quantité totale restante et le nombre d'ordres à ce prix. */
    public record Level(Money price, long quantity, int orders) { }

    public Optional<Level> best() {
        return levels.isEmpty() ? Optional.empty() : Optional.of(levels.get(0));
    }

    public long totalQuantity() {
        long sum = 0;
        for (Level l : levels) sum += l.quantity();
        return sum;
    }
}
