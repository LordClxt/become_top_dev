/** Une ligne de panier ou de devis : un article, une quantité, un prix unitaire en centimes. */
public class LineItem {
    private final String sku;
    private final String label;
    private final long unitCents;
    private int quantity;

    public LineItem(String sku, String label, long unitCents, int quantity) {
        if (quantity <= 0) throw new IllegalArgumentException("quantité positive attendue : " + quantity);
        this.sku = sku;
        this.label = label;
        this.unitCents = unitCents;
        this.quantity = quantity;
    }

    public String sku() { return sku; }

    public String label() { return label; }

    public long unitCents() { return unitCents; }

    public int quantity() { return quantity; }

    public void setQuantity(int quantity) {
        if (quantity <= 0) throw new IllegalArgumentException("quantité positive attendue : " + quantity);
        this.quantity = quantity;
    }

    public long totalCents() { return unitCents * quantity; }
}
