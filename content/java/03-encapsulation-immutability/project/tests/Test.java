import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class Test {
    static final Instant T0 = Instant.parse("2026-01-05T09:30:00Z");

    static Money eur(String s) { return Money.parse(s, Currency.EUR); }

    static Order limit(String id, Side side, long qty, String price) {
        return new Order.Builder(id, side, "ACME").quantity(qty).limit(eur(price)).build();
    }

    static BookSnapshot.Level level(String price, long qty, int orders) {
        return new BookSnapshot.Level(eur(price), qty, orders);
    }

    public static void main(String[] args) {
        Spec.only(args);

        // ---------------- M1
        Spec.test("M1 Trade est un record validé", () -> {
            Spec.check(Trade.class.isRecord(), "Trade doit être un record");
            Trade t = new Trade("b-1", "s-7", "ACME", 30, eur("12.50"), T0);
            Spec.eq(t, new Trade("b-1", "s-7", "ACME", 30, eur("12.5"), T0), "deux transactions identiques");
            Spec.raises(NullPointerException.class, () -> new Trade(null, "s", "ACME", 1, eur("1"), T0), "buyOrderId null");
            Spec.raises(NullPointerException.class, () -> new Trade("b", "s", "ACME", 1, null, T0), "prix null");
            Spec.raises(NullPointerException.class, () -> new Trade("b", "s", "ACME", 1, eur("1"), null), "instant null");
            Spec.raises(IllegalArgumentException.class, () -> new Trade("x", "x", "ACME", 1, eur("1"), T0), "même ordre des deux côtés");
            Spec.raises(IllegalArgumentException.class, () -> new Trade("b", "s", "acme", 1, eur("1"), T0), "symbole en minuscules");
            Spec.raises(IllegalArgumentException.class, () -> new Trade("b", "s", "ACME", 0, eur("1"), T0), "quantité 0");
            Spec.raises(IllegalArgumentException.class, () -> new Trade("b", "s", "ACME", 1, eur("0"), T0), "prix nul");
        });

        Spec.test("M1 Money.times et notional", () -> {
            Spec.eq(new Trade("b-1", "s-7", "ACME", 30, eur("12.50"), T0).notional(), eur("375"), "30 × 12.50 EUR");
            Money m = eur("2.25");
            Spec.eq(m.times(4), eur("9"), "2.25 × 4");
            Spec.eq(m, eur("2.25"), "m après times");
            Spec.eq(m.times(-2), eur("-4.50"), "2.25 × -2");
            Spec.check(m.times(0) == Money.zero(Currency.EUR), "× 0 doit renvoyer le zéro unique de la devise");
            Spec.raises(ArithmeticException.class, () -> Money.ofMinor(Long.MAX_VALUE / 2, Currency.EUR).times(3), "débordement");
        });

        // ---------------- M2
        Spec.test("M2 fill renvoie un nouvel ordre", () -> {
            Order o = limit("b-1", Side.BUY, 100, "10.00");
            Order f = o.fill(30);
            Spec.eq(o.quantity(), 100L, "l'ordre d'origine après fill(30)");
            Spec.eq(o.filledQuantity(), 0L, "exécuté de l'ordre d'origine");
            Spec.eq(f.quantity(), 70L, "quantité restante");
            Spec.eq(f.filledQuantity(), 30L, "quantité exécutée");
            Spec.eq(f.originalQuantity(), 100L, "quantité initiale");
            Spec.check(!f.isFilled() && f.fill(70).isFilled(), "isFilled");
            Spec.eq(f.fill(70).quantity(), 0L, "restant après exécution complète");
            Spec.check(f.id().equals("b-1") && f.side() == Side.BUY && f.limit().orElseThrow().equals(eur("10")), "id, côté et limite conservés");
        });

        Spec.test("M2 fill refuse les exécutions impossibles", () -> {
            Order o = limit("b-1", Side.BUY, 100, "10.00").fill(60);
            Spec.raises(IllegalArgumentException.class, () -> o.fill(41), "fill(41) avec 40 restants");
            Spec.raises(IllegalArgumentException.class, () -> o.fill(0), "fill(0)");
            Spec.raises(IllegalArgumentException.class, () -> o.fill(40).fill(1), "fill sur un ordre exécuté");
            Order aon = new Order.Builder("b-2", Side.BUY, "ACME").quantity(50).limit(eur("10")).allOrNone().build();
            Spec.raises(IllegalStateException.class, () -> aon.fill(20), "exécution partielle d'un all-or-none");
            Spec.check(aon.fill(50).isFilled() && aon.fill(50).isAllOrNone(), "exécution complète d'un all-or-none");
        });

        Spec.test("M2 Order reste immuable", () -> {
            Spec.check(Modifier.isFinal(Order.class.getModifiers()), "Order doit être final");
            Spec.eq(Order.class.getConstructors().length, 0, "constructeurs publics d'Order");
            for (Field fl : Order.class.getDeclaredFields()) {
                if (Modifier.isStatic(fl.getModifiers())) continue;
                Spec.check(Modifier.isPrivate(fl.getModifiers()) && Modifier.isFinal(fl.getModifiers()),
                        "Order." + fl.getName() + " doit être private final");
            }
        });

        // ---------------- M3
        Spec.test("M3 snapshot agrégé par prix", () -> {
            BookSide bids = BookSide.of(Side.BUY, "ACME");
            bids.add(limit("b-1", Side.BUY, 3, "10.00"));
            bids.add(limit("b-2", Side.BUY, 2, "10.50"));
            bids.add(limit("b-3", Side.BUY, 4, "10.00"));
            bids.add(limit("b-4", Side.BUY, 1, "9.00"));
            BookSnapshot s = bids.snapshot();
            Spec.eq(s.levels(), List.of(level("10.50", 2, 1), level("10.00", 7, 2), level("9.00", 1, 1)), "niveaux des achats");
            Spec.eq(s.best().orElseThrow().price(), eur("10.50"), "meilleur niveau");
            Spec.eq(s.totalQuantity(), 10L, "quantité totale");

            BookSide asks = BookSide.of(Side.SELL, "ACME");
            asks.add(limit("s-1", Side.SELL, 5, "11.00"));
            asks.add(limit("s-2", Side.SELL, 1, "10.75"));
            asks.add(limit("s-3", Side.SELL, 2, "11.00"));
            Spec.eq(asks.snapshot().levels(), List.of(level("10.75", 1, 1), level("11.00", 7, 2)), "niveaux des ventes");
            Spec.check(BookSide.of(Side.SELL, "ACME").snapshot().best().isEmpty(), "instantané d'un côté vide");
        });

        Spec.test("M3 un instantané ne change jamais", () -> {
            BookSide bids = BookSide.of(Side.BUY, "ACME");
            bids.add(limit("b-1", Side.BUY, 3, "10.00"));
            BookSnapshot s = bids.snapshot();
            bids.add(limit("b-2", Side.BUY, 5, "10.00"));
            bids.add(limit("b-3", Side.BUY, 1, "12.00"));
            bids.remove("b-1");
            Spec.eq(s.levels(), List.of(level("10.00", 3, 1)), "l'instantané après modifications du carnet");
            Spec.raises(UnsupportedOperationException.class, () -> s.levels().add(level("1", 1, 1)), "levels().add");
            Spec.raises(UnsupportedOperationException.class, () -> s.levels().clear(), "levels().clear");
        });

        Spec.test("M3 BookSnapshot valide ce qu'on lui donne", () -> {
            List<BookSnapshot.Level> given = new ArrayList<>(List.of(level("10.50", 2, 1), level("10.00", 7, 2)));
            BookSnapshot s = new BookSnapshot(Side.BUY, "ACME", given);
            given.add(level("11.00", 1, 1));
            given.set(0, level("1.00", 1, 1));
            Spec.eq(s.levels(), List.of(level("10.50", 2, 1), level("10.00", 7, 2)), "l'instantané après modification de la liste de l'appelant");
            Spec.raises(IllegalArgumentException.class,
                    () -> new BookSnapshot(Side.BUY, "ACME", List.of(level("10.00", 1, 1), level("10.50", 1, 1))), "achats dans l'ordre croissant");
            Spec.raises(IllegalArgumentException.class,
                    () -> new BookSnapshot(Side.SELL, "ACME", List.of(level("11.00", 1, 1), level("10.50", 1, 1))), "ventes dans l'ordre décroissant");
            Spec.raises(IllegalArgumentException.class,
                    () -> new BookSnapshot(Side.SELL, "ACME", List.of(level("11.00", 1, 1), level("11.00", 2, 1))), "deux niveaux au même prix");
            Spec.raises(IllegalArgumentException.class, () -> level("10.00", 0, 1), "niveau de quantité nulle");
            Spec.raises(IllegalArgumentException.class, () -> level("10.00", 3, 4), "plus d'ordres que d'unités");
            Spec.raises(IllegalArgumentException.class, () -> level("0", 3, 1), "prix nul");
            Spec.raises(NullPointerException.class, () -> new BookSnapshot(Side.BUY, "ACME", null), "niveaux null");
        });

        Spec.done();
    }
}
