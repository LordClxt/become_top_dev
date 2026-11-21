package app;

import java.util.logging.Logger;

/** Confirme les réservations payées. */
public class ReservationService {
    private static final Logger LOG = Logger.getLogger(ReservationService.class.getName());
    private final ReservationStore store;

    public ReservationService(ReservationStore store) {
        this.store = store;
    }

    public void confirm(String eventId, int seats) {
        if (seats <= 0) throw new IllegalArgumentException("nombre de places invalide : " + seats);
        store.add(eventId, seats);
        LOG.fine(() -> "réservation confirmée : " + eventId + " x" + seats);
    }
}
