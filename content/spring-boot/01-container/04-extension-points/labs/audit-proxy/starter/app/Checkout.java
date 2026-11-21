package app;

/** Dépend des interfaces, jamais des classes concrètes. Fourni : ne pas modifier. */
public class Checkout {
    private final Orders orders;
    private final Pricing pricing;

    public Checkout(Orders orders, Pricing pricing) {
        this.orders = orders;
        this.pricing = pricing;
    }

    public String buy(String eventId, int seats) {
        return orders.place(eventId, seats) + "@" + pricing.price(eventId) * seats;
    }
}
