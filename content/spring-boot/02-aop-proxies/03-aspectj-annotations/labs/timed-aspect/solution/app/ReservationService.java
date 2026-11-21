package app;

import org.springframework.stereotype.Component;

/** Fourni : ne pas modifier. */
@Component
public class ReservationService {

    @Timed("reservation.reserve")
    public String reserve(String eventId, int seats) {
        if (seats <= 0) throw new IllegalArgumentException("nombre de places invalide");
        return eventId + "x" + seats;
    }

    public String status() { return "ouvert"; }
}
