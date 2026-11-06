import java.time.Instant;
import java.util.Objects;
import java.util.regex.Pattern;

/** Une transaction : un achat et une vente qui se rencontrent. Immuable, validée à la construction. */
public record Trade(String buyOrderId, String sellOrderId, String symbol, long quantity, Money price, Instant at) {
    private static final Pattern SYMBOL = Pattern.compile("[A-Z]{1,5}");

    public Trade {
        Objects.requireNonNull(buyOrderId, "buyOrderId");
        Objects.requireNonNull(sellOrderId, "sellOrderId");
        Objects.requireNonNull(symbol, "symbol");
        Objects.requireNonNull(price, "price");
        Objects.requireNonNull(at, "at");
        if (buyOrderId.equals(sellOrderId)) throw new IllegalArgumentException("un ordre ne peut pas s'exécuter contre lui-même : " + buyOrderId);
        if (!SYMBOL.matcher(symbol).matches()) throw new IllegalArgumentException("symbole invalide : " + symbol);
        if (quantity <= 0) throw new IllegalArgumentException("quantité positive attendue : " + quantity);
        if (!price.isPositive()) throw new IllegalArgumentException("prix positif attendu : " + price);
    }

    /** Le montant total échangé : prix × quantité. */
    public Money notional() {
        return price.times(quantity);
    }
}
