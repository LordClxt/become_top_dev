package app;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Les routes « de moi » : elles ne lisent plus l'en-tête elles-mêmes. */
@RestController
public class MeController {
    private final ReservationStore reservations;

    public MeController(ReservationStore reservations) {
        this.reservations = reservations;
    }

    @GetMapping("/me")
    public Customer me(@CurrentCustomer Customer customer) {
        return customer;
    }

    @GetMapping("/me/reservations")
    public List<Reservation> mine(@CurrentCustomer Customer customer) {
        return reservations.of(customer.id());
    }

    /** lang vient de la requête : ?lang=en. */
    @GetMapping("/me/greeting")
    public String greeting(@CurrentCustomer Customer customer, String lang) {
        return "Bonjour " + customer.name() + " (" + lang + ")";
    }
}
