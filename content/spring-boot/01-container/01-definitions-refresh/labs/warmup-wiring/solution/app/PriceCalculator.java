package app;

/** Prix d'une place, frais de service compris (en centimes). Fourni : ne pas modifier. */
public class PriceCalculator {
    private final int serviceFeeCents;

    public PriceCalculator(int serviceFeeCents) {
        this.serviceFeeCents = serviceFeeCents;
    }

    public int total(int basePriceCents, int seats) {
        return (basePriceCents + serviceFeeCents) * seats;
    }
}
