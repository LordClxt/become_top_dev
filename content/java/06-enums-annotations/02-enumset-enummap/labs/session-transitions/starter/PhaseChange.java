import java.util.EnumSet;
import java.util.Optional;
import java.util.Set;

/** Les changements de phase autorisés pendant une séance. */
public enum PhaseChange {
    OPEN_AUCTION, START_TRADING, CLOSE, HALT, RESUME, HALT_AUCTION;

    // Écrit quand il n'y avait que PRE_OPEN, AUCTION, OPEN, CLOSED. Lignes : départ ; colonnes : arrivée.
    private static final PhaseChange[][] TABLE = {
            { null, OPEN_AUCTION, null, null },
            { null, null, START_TRADING, null },
            { null, null, null, CLOSE },
            { null, null, null, null },
    };

    public SessionPhase from() {
        for (int f = 0; f < TABLE.length; f++)
            for (int t = 0; t < TABLE[f].length; t++)
                if (TABLE[f][t] == this) return SessionPhase.values()[f];
        throw new IllegalStateException("transition inconnue : " + this);
    }

    public SessionPhase to() {
        for (int f = 0; f < TABLE.length; f++)
            for (int t = 0; t < TABLE[f].length; t++)
                if (TABLE[f][t] == this) return SessionPhase.values()[t];
        throw new IllegalStateException("transition inconnue : " + this);
    }

    /** Le changement qui mène de from à to, s'il est autorisé. */
    public static Optional<PhaseChange> between(SessionPhase from, SessionPhase to) {
        try {
            return Optional.ofNullable(TABLE[from.ordinal()][to.ordinal()]);
        } catch (ArrayIndexOutOfBoundsException e) {
            return Optional.empty();
        }
    }

    /** Les phases qu'on peut atteindre depuis from, dans l'ordre de déclaration. */
    public static Set<SessionPhase> reachableFrom(SessionPhase from) {
        Set<SessionPhase> out = EnumSet.noneOf(SessionPhase.class);
        for (SessionPhase to : SessionPhase.values()) if (between(from, to).isPresent()) out.add(to);
        return out;
    }
}
