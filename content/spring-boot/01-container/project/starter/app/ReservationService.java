package app;

import java.time.Clock;
import java.util.Map;
import java.util.function.Supplier;

import org.springframework.beans.factory.ObjectProvider;

/** Réserve des places : prix selon la catégorie, capacité, code promo (M3). */
public class ReservationService {

    public ReservationService(EventCatalog catalog, Map<String, PricingPolicy> pricings, Clock clock,
            Supplier<String> ids, ReservationJournal journal, ObjectProvider<Promotion> promotions) {
        // TODO (M1)
    }

    /** promoCode peut être null (M3). */
    public Reservation reserve(String eventId, int seats, String customer, String promoCode) {
        throw new UnsupportedOperationException("à implémenter (M1)");
    }
}
