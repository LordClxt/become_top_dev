import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Un instantané d'un côté du carnet, agrégé par prix, du meilleur au moins bon. Immuable : partageable avec
 * l'affichage, les rapports et d'autres threads, sans copie ni verrou.
 */
public record BookSnapshot(Side side, String symbol, List<Level> levels) {
    /** Un niveau de prix : la quantité totale restante et le nombre d'ordres à ce prix. */
    public record Level(Money price, long quantity, int orders) {
        public Level {
            Objects.requireNonNull(price, "price");
            if (!price.isPositive()) throw new IllegalArgumentException("prix positif attendu : " + price);
            if (quantity <= 0) throw new IllegalArgumentException("quantité positive attendue : " + quantity);
            if (orders <= 0 || orders > quantity) throw new IllegalArgumentException("nombre d'ordres incohérent : " + orders);
        }
    }

    public BookSnapshot {
        Objects.requireNonNull(side, "side");
        Objects.requireNonNull(symbol, "symbol");
        levels = List.copyOf(levels);   // copie non modifiable : la liste de l'appelant peut changer, pas nous
        for (int i = 1; i < levels.size(); i++) {
            int c = levels.get(i - 1).price().compareTo(levels.get(i).price());   // devises différentes : IAE
            boolean better = side == Side.BUY ? c > 0 : c < 0;
            if (!better) throw new IllegalArgumentException("niveaux non strictement ordonnés : " + levels);
        }
    }

    public Optional<Level> best() {
        return levels.isEmpty() ? Optional.empty() : Optional.of(levels.get(0));
    }

    public long totalQuantity() {
        long sum = 0;
        for (Level l : levels) sum += l.quantity();
        return sum;
    }
}
