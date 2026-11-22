import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/** Applique des règles à un ordre. L'API ne parle que d'OrderRule : tout enum qui l'implémente convient. */
public final class RuleEngine {
    private RuleEngine() { }

    /** Toutes les règles d'un enum, dans l'ordre : « NOM: problème » pour chaque règle violée. */
    public static <T extends Enum<T> & OrderRule> List<String> checkAll(Order order, Class<T> rules) {
        List<String> out = new ArrayList<>();
        for (T rule : rules.getEnumConstants()) {
            rule.violation(order).ifPresent(v -> out.add(rule.name() + ": " + v));
        }
        return out;
    }

    /** Les règles d'un enum que l'ordre viole. */
    public static <T extends Enum<T> & OrderRule> Set<T> failing(Order order, Class<T> rules) {
        Set<T> out = EnumSet.noneOf(rules);
        for (T rule : rules.getEnumConstants()) {
            if (rule.violation(order).isPresent()) out.add(rule);
        }
        return out;
    }

    /** Les règles données, de n'importe quels enums, dans l'ordre : les problèmes seuls. */
    public static List<String> check(Order order, Collection<? extends OrderRule> rules) {
        List<String> out = new ArrayList<>();
        for (OrderRule rule : rules) rule.violation(order).ifPresent(out::add);
        return out;
    }
}
