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

    /** Point d'entrée appelé par l'API. */
    public String book(String eventId, int firstSeat, int count, String card) throws PaymentDeclinedException, CardExpiredException {
        if (count <= 0) throw new IllegalArgumentException("nombre de places invalide");
        return sellAndCharge(eventId, firstSeat, count, card);
    }

    @Transactional
    public String sellAndCharge(String eventId, int firstSeat, int count, String card)
            throws PaymentDeclinedException, CardExpiredException {
        for (int i = 0; i < count; i++) seats.sell(eventId, firstSeat + i);
        return payments.charge(card, 4500 * count);
    }
}
