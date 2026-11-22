package app;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ApiController {
    private final EventStore events;
    private final AtomicLong ids = new AtomicLong(1000);

    public ApiController(EventStore events) {
        this.events = events;
    }

    @GetMapping("/events")
    public List<EventView.V1> list() {
        return events.all().stream().map(EventView.V1::of).toList();
    }

    @GetMapping(path = "/events/{id}", version = "1")
    public EventView.V1 v1(@PathVariable long id) {
        return EventView.V1.of(find(id));
    }

    @GetMapping(path = "/events/{id}", version = "2+")
    public EventView.V2 v2(@PathVariable long id) {
        return EventView.V2.of(find(id));
    }

    @PostMapping("/events/{id}/reservations")
    public ResponseEntity<Reservation> reserve(@PathVariable long id, @CurrentCustomer Customer customer,
                                               @Valid @RequestBody ReservationRequest request) {
        find(id);
        if (!events.take(id, request.seats())) {
            throw Problems.soldOut(id, request.seats());
        }
        var reservation = new Reservation(ids.incrementAndGet(), id, customer.id(), request.seats(), request.email());
        return ResponseEntity.created(URI.create("/api/reservations/" + reservation.id())).body(reservation);
    }

    private Event find(long id) {
        return events.find(id).orElseThrow(() -> Problems.eventNotFound(id));
    }
}
