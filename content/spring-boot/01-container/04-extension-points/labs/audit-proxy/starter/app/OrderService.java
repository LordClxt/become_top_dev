package app;

import jakarta.annotation.PostConstruct;

/** Passe les commandes. Audité. Fourni : ne pas modifier. */
@Audited
public class OrderService implements Orders {
    private boolean ready;

    @PostConstruct
    void warmUp() {
        ready = true;
    }

    @Override
    public String place(String eventId, int seats) {
        if (!ready) throw new IllegalStateException("OrderService utilisé avant son initialisation");
        if (seats <= 0) throw new IllegalArgumentException("nombre de places invalide : " + seats);
        return "order:" + eventId + "x" + seats;
    }

    @Override
    public String toString() { return "OrderService"; }
}
