package app;

import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.function.Supplier;

import org.springframework.beans.factory.ObjectProvider;

/** Réserve des places : prix selon la catégorie, capacité, code promo (M3). */
public class ReservationService {
    private final EventCatalog catalog;
    private final Map<String, PricingPolicy> pricings;
    private final PricingPolicy standard;
    private final Clock clock;
    private final Supplier<String> ids;
    private final ReservationJournal journal;
    private final ObjectProvider<Promotion> promotions;
    private final Map<String, Integer> sold = new HashMap<>();

    public ReservationService(EventCatalog catalog, Map<String, PricingPolicy> pricings, Clock clock,
            Supplier<String> ids, ReservationJournal journal, ObjectProvider<Promotion> promotions) {
        this.catalog = Objects.requireNonNull(catalog);
        this.pricings = Map.copyOf(pricings);
        this.standard = Objects.requireNonNull(pricings.get("standardPricing"), "bean standardPricing manquant");
        this.clock = Objects.requireNonNull(clock);
        this.ids = Objects.requireNonNull(ids);
        this.journal = Objects.requireNonNull(journal);
        this.promotions = Objects.requireNonNull(promotions);
    }

    /** promoCode peut être null (M3). */
    public synchronized Reservation reserve(String eventId, int seats, String customer, String promoCode) {
        if (seats <= 0) throw new IllegalArgumentException("nombre de places invalide : " + seats);
        Event event = catalog.find(eventId)
                .orElseThrow(() -> new IllegalArgumentException("événement inconnu : " + eventId));
        int remaining = event.capacity() - sold.getOrDefault(eventId, 0);
        if (seats > remaining) throw new SoldOutException(eventId, remaining);

        int total = pricings.getOrDefault(event.category() + "Pricing", standard).price(event, seats);
        if (promoCode != null) total = promotion(promoCode).apply(total);

        sold.merge(eventId, seats, Integer::sum);
        Reservation reservation = new Reservation(ids.get(), eventId, customer, seats, total, clock.instant());
        journal.record(reservation);
        return reservation;
    }

    private Promotion promotion(String code) {
        return promotions.stream()
                .filter(p -> p.code().equals(code))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("code promo inconnu : " + code));
    }
}
