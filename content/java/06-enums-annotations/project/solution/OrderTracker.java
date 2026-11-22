import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/** Suit le statut de chaque ordre à partir des événements du bus, et refuse les transitions impossibles. */
public final class OrderTracker {
    private final Map<String, OrderStatus> statuses = new HashMap<>();
    private final List<String> anomalies = new ArrayList<>();
    private final List<OrderCheck> checks = new ArrayList<>();
    private final Map<String, List<OrderCheck>> rejections = new HashMap<>();

    public OrderTracker(EventBus bus) {
        bus.subscribe(OrderEvent.class, this::on);
    }

    private void on(OrderEvent event) {
        String id = event.orderId();
        OrderStatus current = statuses.getOrDefault(id, OrderStatus.NEW);
        List<OrderCheck> failed = List.of();
        OrderStatus target;
        switch (event) {
            case OrderEvent.Accepted a -> {
                failed = failing(a.order());
                target = failed.isEmpty() ? OrderStatus.ACCEPTED : OrderStatus.REJECTED;
            }
            case OrderEvent.Filled f -> target = f.order().isFilled() ? OrderStatus.FILLED : OrderStatus.PARTIALLY_FILLED;
            case OrderEvent.Cancelled c -> target = OrderStatus.CANCELLED;
        }
        if (!current.canMoveTo(target)) {
            anomalies.add(id + ": " + current + " -> " + target);
            return;
        }
        statuses.put(id, target);
        if (target == OrderStatus.REJECTED) rejections.put(id, failed);
    }

    private List<OrderCheck> failing(Order order) {
        List<OrderCheck> out = new ArrayList<>();
        for (OrderCheck c : checks) if (!c.passes(order)) out.add(c);
        return List.copyOf(out);
    }

    /** Le statut actuel de cet ordre, vide s'il n'a jamais été vu. */
    public Optional<OrderStatus> status(String orderId) {
        return Optional.ofNullable(statuses.get(orderId));
    }

    /** Le nombre d'ordres dans chaque statut : tous les statuts, dans l'ordre de déclaration. */
    public Map<OrderStatus, Long> countByStatus() {
        Map<OrderStatus, Long> out = new EnumMap<>(OrderStatus.class);
        for (OrderStatus s : OrderStatus.values()) out.put(s, 0L);
        for (OrderStatus s : statuses.values()) out.merge(s, 1L, Long::sum);
        return Collections.unmodifiableMap(out);
    }

    /** Les événements refusés, dans l'ordre : "id: DE -> VERS". */
    public List<String> anomalies() {
        return List.copyOf(anomalies);
    }

    /** Exige tous les contrôles d'un enum, dans l'ordre de déclaration. */
    public <T extends Enum<T> & OrderCheck> OrderTracker requireAll(Class<T> type) {
        checks.addAll(List.of(type.getEnumConstants()));
        return this;
    }

    /** Exige ces contrôles, d'enums éventuellement différents. */
    public OrderTracker require(Collection<? extends OrderCheck> more) {
        for (OrderCheck c : more) checks.add(Objects.requireNonNull(c, "check"));
        return this;
    }

    /** Les contrôles qui ont fait rejeter cet ordre, dans l'ordre où ils ont été exigés. */
    public List<OrderCheck> rejections(String orderId) {
        return rejections.getOrDefault(orderId, List.of());
    }
}
