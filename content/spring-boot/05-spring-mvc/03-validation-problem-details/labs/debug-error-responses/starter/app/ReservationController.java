package app;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReservationController {
    private final ReservationService reservations;
    private final EventCatalog catalog;

    public ReservationController(ReservationService reservations, EventCatalog catalog) {
        this.reservations = reservations;
        this.catalog = catalog;
    }

    @GetMapping("/events/{id}")
    public Event event(@PathVariable long id) {
        return catalog.get(id);
    }

    @PostMapping("/reservations")
    @ResponseStatus(HttpStatus.CREATED)
    public Reservation book(@RequestBody NewReservation request) {
        return reservations.book(request);
    }

    @GetMapping("/reservations/{id}")
    public Reservation one(@PathVariable long id) {
        return reservations.find(id);
    }
}
