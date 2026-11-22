import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** Le statut d'un ordre, et son code d'une lettre dans les messages de la passerelle. */
public enum OrderStatus {
    NEW("N", false),
    PARTIAL("P", false),
    FILLED("F", true),
    CANCELLED("C", true),
    REJECTED("R", true);

    private final String code;
    private final boolean terminal;

    /** Chaque constante dit elle-même son code et si elle est terminale : impossible d'en oublier une. */
    OrderStatus(String code, boolean terminal) {
        this.code = code;
        this.terminal = terminal;
    }

    public String code() {
        return code;
    }

    /** Un ordre terminé n'évolue plus. */
    public boolean isTerminal() {
        return terminal;
    }

    /** Remplie après la création des constantes (jamais depuis le constructeur). */
    private static final Map<String, OrderStatus> BY_CODE =
            Stream.of(values()).collect(Collectors.toUnmodifiableMap(OrderStatus::code, Function.identity()));

    public static Optional<OrderStatus> fromCode(String code) {
        return Optional.ofNullable(BY_CODE.get(code));
    }
}
