import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.toMap;

import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;

/** Les changements de phase autorisés pendant une séance. Chacun dit d'où il part et où il va. */
public enum PhaseChange {
    OPEN_AUCTION(SessionPhase.PRE_OPEN, SessionPhase.AUCTION),
    START_TRADING(SessionPhase.AUCTION, SessionPhase.OPEN),
    CLOSE(SessionPhase.OPEN, SessionPhase.CLOSED),
    HALT(SessionPhase.OPEN, SessionPhase.HALTED),
    RESUME(SessionPhase.HALTED, SessionPhase.AUCTION),
    HALT_AUCTION(SessionPhase.AUCTION, SessionPhase.HALTED);

    private final SessionPhase from;
    private final SessionPhase to;

    PhaseChange(SessionPhase from, SessionPhase to) {
        this.from = from;
        this.to = to;
    }

    public SessionPhase from() { return from; }

    public SessionPhase to() { return to; }

    /** Départ → (arrivée → changement), construite à partir des constantes : une phase ajoutée ne décale rien. */
    private static final Map<SessionPhase, Map<SessionPhase, PhaseChange>> TABLE = Stream.of(values())
            .collect(groupingBy(c -> c.from, () -> new EnumMap<>(SessionPhase.class),
                    toMap(c -> c.to, c -> c, (x, y) -> { throw new IllegalStateException("deux changements pour " + x.from + " → " + x.to); },
                            () -> new EnumMap<>(SessionPhase.class))));

    /** Le changement qui mène de from à to, s'il est autorisé. */
    public static Optional<PhaseChange> between(SessionPhase from, SessionPhase to) {
        return Optional.ofNullable(TABLE.getOrDefault(from, Map.of()).get(to));
    }

    /** Les phases qu'on peut atteindre depuis from, dans l'ordre de déclaration. */
    public static Set<SessionPhase> reachableFrom(SessionPhase from) {
        Map<SessionPhase, PhaseChange> next = TABLE.get(from);
        return Collections.unmodifiableSet(next == null ? EnumSet.noneOf(SessionPhase.class) : EnumSet.copyOf(next.keySet()));
    }
}
