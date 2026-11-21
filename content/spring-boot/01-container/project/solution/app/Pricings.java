package app;

/** Les politiques de prix. Fourni : ne pas modifier. */
public final class Pricings {
    private Pricings() { }

    /** Prix de base × places. */
    public static final class Standard implements PricingPolicy {
        public int price(Event event, int seats) { return event.basePriceCents() * seats; }
    }

    /** Festivals : 10 % de remise à partir de 4 places. */
    public static final class Festival implements PricingPolicy {
        public int price(Event event, int seats) {
            int total = event.basePriceCents() * seats;
            return seats >= 4 ? total * 90 / 100 : total;
        }
    }
}
