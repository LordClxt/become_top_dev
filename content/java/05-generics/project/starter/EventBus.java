import java.util.List;
import java.util.function.Consumer;

/** Distribue les événements d'ordres à leurs abonnés. */
public final class EventBus {

    /** Abonne handler aux événements de ce type (et de ses sous-types) ; fermer le résultat désabonne. */
    public <E extends OrderEvent> AutoCloseable subscribe(Class<E> type, Consumer<E> handler) {
        throw new UnsupportedOperationException("subscribe");
    }

    /** Publie un événement : chaque abonné dont le type correspond le reçoit, dans l'ordre d'abonnement. */
    public void publish(OrderEvent event) {
        throw new UnsupportedOperationException("publish");
    }

    /** Publie plusieurs événements, dans l'ordre. */
    public void publishAll(List<OrderEvent> events) {
        throw new UnsupportedOperationException("publishAll");
    }

    /** Les événements déjà publiés de ce type (et de ses sous-types), dans l'ordre. */
    public <E extends OrderEvent> List<E> history(Class<E> type) {
        throw new UnsupportedOperationException("history");
    }
}
