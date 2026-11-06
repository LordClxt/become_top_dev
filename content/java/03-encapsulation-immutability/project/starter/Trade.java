import java.time.Instant;

/** Une transaction : un achat et une vente qui se rencontrent. TODO (M1) : un record validé. */
public class Trade {
    private final String buyOrderId;
    private final String sellOrderId;
    private final String symbol;
    private final long quantity;
    private final Money price;
    private final Instant at;

    public Trade(String buyOrderId, String sellOrderId, String symbol, long quantity, Money price, Instant at) {
        this.buyOrderId = buyOrderId;
        this.sellOrderId = sellOrderId;
        this.symbol = symbol;
        this.quantity = quantity;
        this.price = price;
        this.at = at;
    }

    public String buyOrderId() { return buyOrderId; }

    public String sellOrderId() { return sellOrderId; }

    public String symbol() { return symbol; }

    public long quantity() { return quantity; }

    public Money price() { return price; }

    public Instant at() { return at; }

    /** Le montant total échangé : prix × quantité. TODO (M1). */
    public Money notional() {
        throw new UnsupportedOperationException("TODO M1");
    }
}
