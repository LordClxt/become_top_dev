package app;

import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Service;

@Service
public class ReservationService {
    private final EventCatalog catalog;
    private final AtomicLong ids = new AtomicLong(100);

    public ReservationService(EventCatalog catalog) {
        this.catalog = catalog;
    }

    public Reservation book(NewReservation request) {
        Event event = catalog.get(request.eventId());
        return new Reservation(ids.incrementAndGet(), event.name(), request.seats(), request.email());
    }

    /** La réservation 13 tombe sur une base en panne : une erreur que le client ne doit jamais voir en détail. */
    public Reservation find(long id) {
        if (id == 13) {
            throw new IllegalStateException("Connection refused: db-prod-01.tixa.internal:5432 (user=tixa_rw)");
        }
        return new Reservation(id, "Jazz à Vienne", 2, "ana@example.com");
    }
}
