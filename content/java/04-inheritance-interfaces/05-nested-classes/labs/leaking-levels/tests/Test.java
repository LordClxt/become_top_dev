import java.lang.ref.WeakReference;
import java.lang.reflect.Modifier;
import java.util.Comparator;
import java.util.List;

public class Test {
    static final long[][] LEVELS = { { 12_450, 300 }, { 12_500, 100 }, { 12_480, 50 } };

    static boolean freed(WeakReference<?> ref) throws InterruptedException {
        for (int i = 0; i < 20 && ref.get() != null; i++) {
            System.gc();
            Thread.sleep(10);
        }
        return ref.get() == null;
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("les niveaux sont triés du meilleur prix au moins bon", () -> {
            var bids = new OrderBook("EUR", true, 10).levels(LEVELS);
            Spec.eq(bids.toString(), "[100 @ 125.00 EUR, 50 @ 124.80 EUR, 300 @ 124.50 EUR]", "achats (prix décroissants)");
            var asks = new OrderBook("USD", false, 10).levels(LEVELS);
            Spec.eq(asks.get(0).priceCents(), 12_450L, "meilleure offre de vente (prix le plus bas)");
            Spec.eq(asks.get(0).quantity(), 300L, "sa quantité");
        });

        Spec.test("garder les niveaux ne retient pas le carnet", () -> {
            var book = new OrderBook("EUR", true, 1_000_000);
            List<OrderBook.Level> cached = book.levels(LEVELS);
            var ref = new WeakReference<>(book);
            book = null;
            Spec.check(freed(ref), "le carnet (8 Mo) reste en mémoire tant que la diffusion garde ses niveaux");
            Spec.eq(cached.size(), 3, "les niveaux gardés restent utilisables");
            Spec.eq(cached.get(0).toString(), "100 @ 125.00 EUR", "premier niveau gardé");
        });

        Spec.test("garder le comparateur ne retient pas le carnet", () -> {
            var book = new OrderBook("EUR", true, 1_000_000);
            Comparator<OrderBook.Level> order = book.byPrice();
            var ref = new WeakReference<>(book);
            book = null;
            Spec.check(freed(ref), "le carnet (8 Mo) reste en mémoire tant que quelqu'un garde son comparateur");
            Spec.check(order != null, "le comparateur reste utilisable");
        });

        Spec.test("Level est une classe membre statique", () -> {
            Spec.check(Modifier.isStatic(OrderBook.Level.class.getModifiers()),
                    "OrderBook.Level n'a pas besoin du carnet : déclare-la static");
        });

        Spec.done();
    }
}
