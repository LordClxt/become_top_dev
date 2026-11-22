import java.util.EnumSet;
import java.util.Set;

/** Le statut d'un ordre. REJECTED a été ajouté récemment, entre ACCEPTED et PARTIALLY_FILLED. */
public enum OrderStatus {
    NEW, ACCEPTED, REJECTED, PARTIALLY_FILLED, FILLED, CANCELLED;

    // Écrit avant l'arrivée de REJECTED : lignes et colonnes NEW, ACCEPTED, PARTIALLY_FILLED, FILLED, CANCELLED.
    private static final boolean[][] ALLOWED = {
        { false, true,  false, false, false },
        { false, false, true,  true,  true  },
        { false, false, true,  true,  true  },
        { false, false, false, false, false },
        { false, false, false, false, false },
    };

    /** Les statuts atteignables directement depuis celui-ci, dans l'ordre de déclaration. */
    public Set<OrderStatus> next() {
        Set<OrderStatus> out = EnumSet.noneOf(OrderStatus.class);
        if (ordinal() >= ALLOWED.length) return out;
        for (OrderStatus s : values()) {
            if (s.ordinal() < ALLOWED[ordinal()].length && ALLOWED[ordinal()][s.ordinal()]) out.add(s);
        }
        return out;
    }

    public boolean canMoveTo(OrderStatus target) { return next().contains(target); }

    /** Un statut final : plus aucune transition possible. */
    public boolean isTerminal() { return next().isEmpty(); }
}
