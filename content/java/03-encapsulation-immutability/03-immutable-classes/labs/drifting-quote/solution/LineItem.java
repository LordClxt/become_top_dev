import java.util.Objects;

/** Une ligne de panier ou de devis. Immuable : la partager entre un panier et un devis est sans danger. */
public record LineItem(String sku, String label, long unitCents, int quantity) {
    public LineItem {
        Objects.requireNonNull(sku, "sku");
        Objects.requireNonNull(label, "label");
        if (quantity <= 0) throw new IllegalArgumentException("quantité positive attendue : " + quantity);
    }

    /** Une nouvelle ligne : celle-ci ne change pas (approche fonctionnelle). */
    public LineItem withQuantity(int quantity) {
        return new LineItem(sku, label, unitCents, quantity);
    }

    public long totalCents() { return unitCents * quantity; }
}
