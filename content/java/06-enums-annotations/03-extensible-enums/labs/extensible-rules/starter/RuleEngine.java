import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/** Applique des règles à un ordre. */
public final class RuleEngine {
    private RuleEngine() { }

    /** Toutes les règles d'un enum, dans l'ordre : « NOM: problème » pour chaque règle violée. */
    public static List<String> checkAll(Order order, Class<? extends Enum<?>> rules) {
        List<String> out = new ArrayList<>();
        for (Enum<?> rule : rules.getEnumConstants()) {
            ((OrderRule) rule).violation(order).ifPresent(v -> out.add(rule.name() + ": " + v));
        }
        return out;
    }

    /** Les règles données, dans l'ordre : les problèmes seuls. */
    public static List<String> check(Order order, Collection<OrderRule> rules) {
        List<String> out = new ArrayList<>();
        for (OrderRule rule : rules) rule.violation(order).ifPresent(out::add);
        return out;
    }
}
