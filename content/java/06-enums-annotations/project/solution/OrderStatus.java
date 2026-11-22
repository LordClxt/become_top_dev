import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Le statut d'un ordre. Les transitions sont des constantes qui disent d'où elles partent et où elles vont :
 * ajouter un statut, c'est ajouter la constante et ses transitions, sans rien recompter.
 */
public enum OrderStatus {
    NEW, ACCEPTED, REJECTED, PARTIALLY_FILLED, FILLED, CANCELLED;

    private enum Transition {
        ACCEPT(NEW, ACCEPTED),
        REJECT(NEW, REJECTED),
        FILL_PART(ACCEPTED, PARTIALLY_FILLED),
        FILL(ACCEPTED, FILLED),
        CANCEL(ACCEPTED, CANCELLED),
        FILL_MORE(PARTIALLY_FILLED, PARTIALLY_FILLED),
        FILL_REST(PARTIALLY_FILLED, FILLED),
        CANCEL_REST(PARTIALLY_FILLED, CANCELLED);

        private final OrderStatus from;
        private final OrderStatus to;

        Transition(OrderStatus from, OrderStatus to) {
            this.from = from;
            this.to = to;
        }
    }

    /** Construite une fois les constantes créées (les champs statiques s'initialisent après elles). */
    private static final Map<OrderStatus, Set<OrderStatus>> NEXT = buildTable();

    private static Map<OrderStatus, Set<OrderStatus>> buildTable() {
        Map<OrderStatus, Set<OrderStatus>> table = new EnumMap<>(OrderStatus.class);
        for (OrderStatus s : values()) table.put(s, EnumSet.noneOf(OrderStatus.class));
        for (Transition t : Transition.values()) table.get(t.from).add(t.to);
        table.replaceAll((s, next) -> Collections.unmodifiableSet(next));
        return table;
    }

    /** Les statuts atteignables directement depuis celui-ci, dans l'ordre de déclaration. */
    public Set<OrderStatus> next() {
        return NEXT.get(this);
    }

    public boolean canMoveTo(OrderStatus target) {
        return NEXT.get(this).contains(target);
    }

    /** Un statut final : plus aucune transition possible. */
    public boolean isTerminal() {
        return NEXT.get(this).isEmpty();
    }
}
