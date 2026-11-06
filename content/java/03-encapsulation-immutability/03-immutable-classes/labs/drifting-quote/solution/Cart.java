import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Le panier d'un client. Mutable, mais ses lignes, elles, sont immuables. */
public class Cart {
    private final List<LineItem> items = new ArrayList<>();

    public void add(String sku, String label, long unitCents, int quantity) {
        items.add(new LineItem(sku, label, unitCents, quantity));
    }

    public void setQuantity(String sku, int quantity) {
        for (int i = 0; i < items.size(); i++) {
            if (items.get(i).sku().equals(sku)) {
                items.set(i, items.get(i).withQuantity(quantity));   // remplacer, pas modifier
                return;
            }
        }
        throw new IllegalArgumentException("article absent du panier : " + sku);
    }

    /** Une vue en lecture seule : le panier reste seul maître de sa liste. */
    public List<LineItem> items() { return Collections.unmodifiableList(items); }

    public long totalCents() {
        long sum = 0;
        for (LineItem item : items) sum += item.totalCents();
        return sum;
    }
}
