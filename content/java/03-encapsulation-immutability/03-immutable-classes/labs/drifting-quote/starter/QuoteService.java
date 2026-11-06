/** Émet les devis à partir des paniers. */
public class QuoteService {
    private int next = 1;

    public Quote issue(Cart cart) {
        if (cart.items().isEmpty()) throw new IllegalStateException("panier vide");
        return new Quote("D-" + next++, cart.items());
    }
}
