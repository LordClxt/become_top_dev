import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

/**
 * Distribue les événements d'ordres à leurs abonnés. Un conteneur hétérogène typé : chaque abonnement porte son
 * jeton de type (Class<E>), et type.cast rétablit le type à la livraison, sans aucun cast non vérifié.
 */
public final class EventBus {

    /** Un abonnement : son type et son consommateur, liés par le même E. */
    private record Subscription<E extends OrderEvent>(Class<E> type, Consumer<? super E> handler) {
        void deliver(OrderEvent event) {
            if (type.isInstance(event)) handler.accept(type.cast(event));
        }
    }

    private final List<Subscription<?>> subscriptions = new CopyOnWriteArrayList<>();
    private final List<OrderEvent> published = new ArrayList<>();

    /** Abonne handler aux événements de ce type (et de ses sous-types) ; fermer le résultat désabonne. */
    public <E extends OrderEvent> AutoCloseable subscribe(Class<E> type, Consumer<? super E> handler) {
        Subscription<E> s = new Subscription<>(Objects.requireNonNull(type, "type"), Objects.requireNonNull(handler, "handler"));
        subscriptions.add(s);
        return () -> subscriptions.remove(s);
    }

    /** Publie un événement : chaque abonné dont le type correspond le reçoit, dans l'ordre d'abonnement. */
    public void publish(OrderEvent event) {
        Objects.requireNonNull(event, "event");
        published.add(event);
        for (Subscription<?> s : subscriptions) s.deliver(event);
    }

    /** Publie plusieurs événements, dans l'ordre. */
    public void publishAll(List<? extends OrderEvent> events) {
        for (OrderEvent e : events) publish(e);
    }

    /** Les événements déjà publiés de ce type (et de ses sous-types), dans l'ordre. */
    public <E extends OrderEvent> List<E> history(Class<E> type) {
        List<E> out = new ArrayList<>();
        for (OrderEvent e : published) {
            if (type.isInstance(e)) out.add(type.cast(e));
        }
        return List.copyOf(out);
    }
}
