package app;

/** Réserve des places : dépend du catalogue et du calcul de prix. Fourni : ne pas modifier. */
public class ReservationService {
    private final EventCatalog catalog;
    private final PriceCalculator prices;

    public ReservationService(EventCatalog catalog, PriceCalculator prices) {
        this.catalog = catalog;
        this.prices = prices;
    }

    public int quote(String eventId, int seats) {
        int base = catalog.basePrice(eventId)
                .orElseThrow(() -> new IllegalArgumentException("événement inconnu : " + eventId));
        return prices.total(base, seats);
    }

    EventCatalog catalog() { return catalog; }
}
