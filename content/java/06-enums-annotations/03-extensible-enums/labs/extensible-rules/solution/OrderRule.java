import java.util.Optional;

/** Une règle de validation d'un ordre. Fournie. */
public interface OrderRule {
    /** Le problème, s'il y en a un. */
    Optional<String> violation(Order order);
}
