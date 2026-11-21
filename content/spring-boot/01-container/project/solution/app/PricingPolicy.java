package app;

/** Calcule le prix total (en centimes) de n places pour un événement. Fourni : ne pas modifier. */
public interface PricingPolicy {
    int price(Event event, int seats);
}
