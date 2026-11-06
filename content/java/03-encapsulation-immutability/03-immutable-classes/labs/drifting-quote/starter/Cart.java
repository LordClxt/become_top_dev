import java.util.ArrayList;
import java.util.List;

/** Le panier d'un client. Mutable par nature : il change jusqu'à l'émission du devis, et après. */
public class Cart {
    private final List<LineItem> items = new ArrayList<>();

    public void add(String sku, String label, long unitCents, int quantity) {
        items.add(new LineItem(sku, label, unitCents, quantity));
    }

    public void setQuantity(String sku, int quantity) {
        for (LineItem item : items) {
            if (item.sku().equals(sku)) {
                item.setQuantity(quantity);
                return;
            }
        }
        throw new IllegalArgumentException("article absent du panier : " + sku);
    }

    public List<LineItem> items() { return items; }

    public long totalCents() {
        long sum = 0;
        for (LineItem item : items) sum += item.totalCents();
        return sum;
    }
}
