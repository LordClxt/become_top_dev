import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Suit le statut de chaque ordre à partir des événements du bus. À écrire. */
public final class OrderTracker {

    public OrderTracker(EventBus bus) {
        // TODO : s'abonner aux événements
    }

    /** Le statut actuel de cet ordre, vide s'il n'a jamais été vu. */
    public Optional<OrderStatus> status(String orderId) {
        return Optional.empty();
    }

    /** Le nombre d'ordres dans chaque statut : tous les statuts, dans l'ordre de déclaration. */
    public Map<OrderStatus, Long> countByStatus() {
        return Map.of();
    }

    /** Les événements refusés, dans l'ordre : "id: DE -> VERS". */
    public List<String> anomalies() {
        return List.of();
    }

    /** M3 : exige tous les contrôles d'un enum. */
    public <T extends Enum<T> & OrderCheck> OrderTracker requireAll(Class<T> checks) {
        return this;
    }

    /** M3 : exige ces contrôles, d'enums éventuellement différents. */
    public OrderTracker require(Collection<? extends OrderCheck> checks) {
        return this;
    }

    /** M3 : les contrôles qui ont fait rejeter cet ordre, dans l'ordre où ils ont été exigés. */
    public List<OrderCheck> rejections(String orderId) {
        return List.of();
    }
}
