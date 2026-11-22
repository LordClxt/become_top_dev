package app;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReservationController {
    private final EventStore events;
    private final IdempotencyStore requests;
    private final AtomicLong ids = new AtomicLong(5000);

    public ReservationController(EventStore events, IdempotencyStore requests) {
        this.events = events;
        this.requests = requests;
    }

    @PostMapping("/reservations")
    public synchronized ResponseEntity<Reservation> reserve(@IdempotencyKey String key, @CurrentCustomer Customer customer,
                                                            @Valid @RequestBody ReservationRequest request) {
        var previous = requests.find(key);
        if (previous.isPresent()) {
            if (!previous.get().sameAs(customer.id(), request)) {
                throw Problems.of(HttpStatus.UNPROCESSABLE_CONTENT, "idempotency-key-reused", "Clé déjà utilisée",
                        "La clé " + key + " a déjà servi pour une autre requête");
            }
            return created(previous.get().reservation()).header("Idempotent-Replayed", "true").body(previous.get().reservation());
        }
        long eventId = request.eventId();
        if (events.find(eventId).isEmpty()) {
            throw Problems.of(HttpStatus.NOT_FOUND, "event-not-found", "Événement introuvable", "Aucun événement " + eventId);
        }
        if (!events.take(eventId, request.seats())) {
            throw Problems.of(HttpStatus.CONFLICT, "sold-out", "Plus assez de places", request.seats() + " places demandées");
        }
        var reservation = new Reservation(ids.incrementAndGet(), eventId, customer.id(), request.seats(), request.email());
        requests.save(key, new IdempotencyStore.Entry(customer.id(), request, reservation));
        return created(reservation).body(reservation);
    }

    private static ResponseEntity.BodyBuilder created(Reservation r) {
        return ResponseEntity.created(URI.create("/reservations/" + r.id()));
    }
}
