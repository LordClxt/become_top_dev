import java.util.Objects;

/** Ce qui arrive à un ordre. Fourni. */
public sealed interface OrderEvent {
    String orderId();

    record Accepted(Order order) implements OrderEvent {
        public Accepted { Objects.requireNonNull(order, "order"); }
        public String orderId() { return order.id(); }
    }

    record Filled(Order order, Trade trade) implements OrderEvent {
        public Filled {
            Objects.requireNonNull(order, "order");
            Objects.requireNonNull(trade, "trade");
        }
        public String orderId() { return order.id(); }
    }

    record Cancelled(String orderId, String reason) implements OrderEvent {
        public Cancelled {
            Objects.requireNonNull(orderId, "orderId");
            Objects.requireNonNull(reason, "reason");
        }
    }
}
