import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.TreeSet;

public class Test {
    static Money eur(String s) { return Money.parse(s, Currency.EUR); }

    static Order limit(String id, Side side, long qty, String price) {
        return new Order.Builder(id, side, "ACME").quantity(qty).limit(eur(price)).build();
    }

    static List<String> ids(BookSide b) { return b.orders().stream().map(Order::id).toList(); }

    public static void main(String[] args) {
        Spec.only(args);

        // ---------------- M1
        Spec.test("M1 equals et hashCode", () -> {
            Spec.eq(eur("12.5"), Money.ofMinor(1250, Currency.EUR), "12.5 EUR et 1250 centimes");
            Spec.eq(eur("12.5").hashCode(), Money.ofMinor(1250, Currency.EUR).hashCode(), "leurs hash");
            Spec.check(!eur("12.5").equals(Money.parse("12.5", Currency.USD)), "12.50 EUR ≠ 12.50 USD");
            Spec.check(!eur("1").equals(null) && !eur("1").equals("1.00 EUR"), "equals(null), equals(String)");
            Spec.eq(new HashSet<>(List.of(eur("1"), eur("1.00"), eur("2"))).size(), 2, "HashSet de 1, 1.00 et 2 EUR");
        });

        Spec.test("M1 ordre naturel", () -> {
            List<Money> list = new ArrayList<>(List.of(eur("3"), eur("-1"), eur("0.5"), eur("100"), eur("-0.01")));
            list.sort(null);
            Spec.eq(list.toString(), "[-1.00 EUR, -0.01 EUR, 0.50 EUR, 3.00 EUR, 100.00 EUR]", "tri");
            Spec.check(Money.ofMinor(Long.MAX_VALUE, Currency.EUR).compareTo(Money.ofMinor(Long.MIN_VALUE, Currency.EUR)) > 0,
                    "comparaison sans débordement aux extrêmes");
            Spec.raises(IllegalArgumentException.class, () -> eur("1").compareTo(Money.parse("1", Currency.USD)), "EUR comparé à USD");
            Spec.raises(IllegalArgumentException.class, () -> Money.parse("1", Currency.USD).compareTo(eur("1")), "USD comparé à EUR");
            List<Money> ms = List.of(eur("1"), eur("1.00"), eur("2"), eur("0"), Money.zero(Currency.EUR));
            Spec.eq(new TreeSet<>(ms).size(), new HashSet<>(ms).size(), "TreeSet et HashSet : ordre cohérent avec equals");
        });

        Spec.test("M1 valueOf : aller-retour", () -> {
            Random rnd = new Random(3);
            for (int i = 0; i < 300; i++) {
                Currency c = Currency.values()[rnd.nextInt(3)];
                Money m = Money.ofMinor(rnd.nextLong() >> rnd.nextInt(60), c);
                Spec.eq(Money.valueOf(m.toString()), m, "valueOf(\"" + m + "\")");
            }
            Spec.eq(Money.valueOf("-0.05 USD"), Money.ofMinor(-5, Currency.USD), "valueOf(\"-0.05 USD\")");
            for (String bad : List.of("12.50", "12.50 GBP", "douze EUR", "12.505 EUR", "", "EUR")) {
                var e = Spec.raises(IllegalArgumentException.class, () -> Money.valueOf(bad), "valueOf(\"" + bad + "\")");
                Spec.check(e.getMessage() != null && e.getMessage().contains("\"" + bad + "\""), "le message doit citer le texte : " + e.getMessage());
            }
        });

        // ---------------- M2
        Spec.test("M2 achats : le plus offrant d'abord, puis le premier arrivé", () -> {
            BookSide bids = BookSide.of(Side.BUY, "ACME");
            bids.add(limit("a", Side.BUY, 10, "12.00"));
            bids.add(limit("b", Side.BUY, 5, "12.50"));
            bids.add(limit("c", Side.BUY, 10, "12.00"));
            bids.add(limit("d", Side.BUY, 1, "11.00"));
            Spec.eq(ids(bids), List.of("b", "a", "c", "d"), "ordres par priorité");
            Spec.eq(bids.best().map(Order::id).orElse("vide"), "b", "best()");
            Spec.eq(bids.size(), 4, "size()");
        });

        Spec.test("M2 ventes : le moins cher d'abord", () -> {
            BookSide asks = BookSide.of(Side.SELL, "ACME");
            asks.add(limit("x", Side.SELL, 3, "13.00"));
            asks.add(limit("y", Side.SELL, 3, "12.75"));
            asks.add(limit("z", Side.SELL, 3, "13.00"));
            Spec.eq(ids(asks), List.of("y", "x", "z"), "ordres par priorité");
        });

        Spec.test("M2 deux ordres identiques sauf l'id ne sont jamais confondus", () -> {
            BookSide bids = BookSide.of(Side.BUY, "ACME");
            for (int i = 0; i < 500; i++) bids.add(limit("o" + i, Side.BUY, 10, "12.00"));
            Spec.eq(bids.size(), 500, "size() après 500 ordres de même prix et même quantité");
            Spec.eq(ids(bids).subList(0, 3), List.of("o0", "o1", "o2"), "premiers arrivés en tête");
        });

        Spec.test("M2 remove et refus", () -> {
            BookSide bids = BookSide.of(Side.BUY, "ACME");
            bids.add(limit("a", Side.BUY, 10, "12.00"));
            bids.add(limit("b", Side.BUY, 10, "12.00"));
            Spec.check(bids.remove("a"), "remove(\"a\")");
            Spec.check(!bids.remove("a"), "remove(\"a\") une seconde fois");
            Spec.eq(ids(bids), List.of("b"), "après remove");
            Spec.raises(IllegalArgumentException.class, () -> bids.add(limit("b", Side.BUY, 1, "13")), "identifiant déjà présent");
            Spec.raises(IllegalArgumentException.class, () -> bids.add(limit("s", Side.SELL, 1, "13")), "ordre de vente");
            Spec.raises(IllegalArgumentException.class, () -> bids.add(new Order.Builder("m", Side.BUY, "ACME").quantity(1).build()), "ordre au marché");
            Spec.raises(IllegalArgumentException.class, () -> bids.add(new Order.Builder("o", Side.BUY, "XYZ").quantity(1).limit(eur("1")).build()), "autre symbole");
            Spec.raises(IllegalArgumentException.class,
                    () -> bids.add(new Order.Builder("u", Side.BUY, "ACME").quantity(1).limit(Money.parse("1", Currency.USD)).build()), "autre devise");
            Spec.raises(UnsupportedOperationException.class, () -> bids.orders().clear(), "orders() non modifiable");
            Spec.check(BookSide.of(Side.SELL, "ACME").best().isEmpty(), "best() d'un côté vide");
        });

        // ---------------- M3
        Spec.test("M3 copyOf : une copie indépendante", () -> {
            BookSide bids = BookSide.of(Side.BUY, "ACME");
            bids.add(limit("a", Side.BUY, 10, "12.00"));
            bids.add(limit("b", Side.BUY, 10, "12.00"));
            BookSide snap = BookSide.copyOf(bids);
            snap.remove("a");
            snap.add(limit("c", Side.BUY, 10, "12.00"));
            bids.add(limit("d", Side.BUY, 10, "13.00"));
            Spec.eq(ids(bids), List.of("d", "a", "b"), "original");
            Spec.eq(ids(snap), List.of("b", "c"), "copie : c, ajouté après, passe derrière b à prix égal");
        });

        Spec.test("M3 la copie garde la priorité temporelle", () -> {
            BookSide bids = BookSide.of(Side.BUY, "ACME");
            bids.add(limit("early", Side.BUY, 1, "10"));
            BookSide snap = BookSide.copyOf(bids);
            snap.add(limit("late", Side.BUY, 1, "10"));
            Spec.eq(ids(snap), List.of("early", "late"), "un ordre ajouté à la copie passe après ceux qu'elle contenait");
            snap.add(limit("x", Side.BUY, 1, "10"));
            bids.add(limit("x", Side.BUY, 1, "10"));
            Spec.eq(bids.size(), 2, "l'original n'a pas vu les ajouts de la copie");
        });

        Spec.test("M3 toString : un résumé", () -> {
            BookSide bids = BookSide.of(Side.BUY, "ACME");
            Spec.eq(bids.toString(), "BUY ACME : vide", "côté vide");
            bids.add(limit("a", Side.BUY, 10, "12.00"));
            Spec.eq(bids.toString(), "BUY ACME : 1 ordre, meilleur 12.00 EUR", "un ordre");
            for (int i = 0; i < 1000; i++) bids.add(limit("o" + i, Side.BUY, 1, "11.00"));
            bids.add(limit("top", Side.BUY, 1, "12.50"));
            String s = bids.toString();
            Spec.eq(s, "BUY ACME : 1002 ordres, meilleur 12.50 EUR", "mille ordres");
        });

        Spec.done();
    }
}
