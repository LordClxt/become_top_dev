package app;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Réserve des places puis débite la carte : tout ou rien. */
@Service
public class BookingService {
    private final SeatRepository seats;
    private final PaymentGateway payments;

    public BookingService(SeatRepository seats, PaymentGateway payments) {
        this.seats = seats;
        this.payments = payments;
    }

    /**
     * Point d'entrée appelé par l'API, donc à travers le proxy : c'est ICI que la transaction doit commencer.
     * (Un @Transactional sur une méthode appelée par this.xxx() n'est jamais vu par le proxy.)
     */
    @Transactional
    public String book(String eventId, int firstSeat, int count, String card) throws PaymentDeclinedException, CardExpiredException {
        if (count <= 0) throw new IllegalArgumentException("nombre de places invalide");
        for (int i = 0; i < count; i++) seats.sell(eventId, firstSeat + i);
        return payments.charge(card, 4500 * count);
    }
}
