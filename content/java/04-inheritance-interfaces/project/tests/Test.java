import java.io.IOException;
import java.lang.reflect.Modifier;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Test {
    static final Clock NOON = Clock.fixed(Instant.parse("2026-11-05T12:00:00Z"), ZoneOffset.UTC);
    static final Instant T0 = Instant.parse("2026-01-05T09:30:00Z");

    static final class FakeSink implements Sink {
        final List<List<String>> batches = new ArrayList<>();
        int closes;
        @Override public void write(List<String> lines) { batches.add(List.copyOf(lines)); }
        @Override public void close() { closes++; }
    }

    /** Un journal d'une autre équipe : son recordAll est le sien, et il appelle record. */
    static final class ListJournal implements Journal {
        final List<String> ids = new ArrayList<>();
        boolean closed;
        @Override public void record(Order order) { ids.add(order.id()); }
        @Override public void recordAll(List<Order> orders) throws IOException { for (Order o : orders) record(o); }
        @Override public void flush() { }
        @Override public void close() { closed = true; }
    }

    static Money eur(String s) { return Money.parse(s, Currency.EUR); }

    static Order limit(String id, Side side, String symbol, String price) {
        return new Order.Builder(id, side, symbol).quantity(10).limit(eur(price)).build();
    }

    static Order market(String id, Side side) {
        return new Order.Builder(id, side, "ACME").quantity(10).build();
    }

    public static void main(String[] args) {
        Spec.only(args);

        // ---------------- M1
        Spec.test("M1 Pricing est une interface scellée de records", () -> {
            Spec.check(Pricing.class.isInterface() && Pricing.class.isSealed(), "Pricing doit être une interface scellée");
            Spec.check(Arrays.stream(Pricing.class.getPermittedSubclasses()).allMatch(Class::isRecord), "chaque sorte de prix doit être un record");
            Spec.eq(Pricing.class.getPermittedSubclasses().length, 2, "sortes de prix");
        });

        Spec.test("M1 un ordre dit comment il fixe son prix", () -> {
            Spec.eq(limit("b-1", Side.BUY, "ACME", "12.50").pricing(), new Pricing.Limit(eur("12.50")), "ordre à cours limité");
            Spec.eq(market("b-2", Side.BUY).pricing(), new Pricing.Market(), "ordre au marché");
            Spec.eq(limit("b-1", Side.BUY, "ACME", "12.50").limit().orElseThrow(), eur("12.50"), "limit() reste disponible");
            Spec.check(market("b-2", Side.BUY).isMarket(), "isMarket() reste disponible");
            Spec.raises(IllegalArgumentException.class, () -> new Pricing.Limit(eur("0")), "limite nulle");
            Spec.raises(NullPointerException.class, () -> new Pricing.Limit(null), "limite null");
        });

        Spec.test("M1 accepts : la limite ou mieux, et toujours au marché", () -> {
            Order buy = limit("b-1", Side.BUY, "ACME", "12.50");
            Order sell = limit("s-1", Side.SELL, "ACME", "12.50");
            Spec.check(buy.accepts(eur("12.50")) && buy.accepts(eur("12.40")), "un achat accepte sa limite ou moins cher");
            Spec.check(!buy.accepts(eur("12.51")), "un achat refuse plus cher que sa limite");
            Spec.check(sell.accepts(eur("12.50")) && sell.accepts(eur("12.60")), "une vente accepte sa limite ou plus cher");
            Spec.check(!sell.accepts(eur("12.49")), "une vente refuse moins cher que sa limite");
            Spec.check(market("b-2", Side.BUY).accepts(eur("999")), "un ordre au marché accepte tout prix");
            Spec.raises(IllegalArgumentException.class, () -> buy.accepts(Money.parse("12", Currency.USD)), "prix dans une autre devise");
        });

        Spec.test("M1 l'exécution partielle garde le prix", () -> {
            Order o = limit("b-1", Side.BUY, "ACME", "12.50").fill(3);
            Spec.eq(o.pricing(), new Pricing.Limit(eur("12.50")), "pricing() après fill(3)");
            Spec.raises(IllegalStateException.class, () -> new Order.Builder("x", Side.BUY, "ACME").quantity(5).allOrNone().build(),
                    "un ordre au marché ne peut toujours pas être all-or-none");
        });

        // ---------------- M2
        Spec.test("M2 compte par symbole, en enveloppant le journal d'Ordo", () -> {
            FakeSink sink = new FakeSink();
            CountingJournal j = new CountingJournal(OrderJournal.open(sink, NOON, 10));
            j.record(limit("b-1", Side.BUY, "ACME", "12.50"));
            j.recordAll(List.of(limit("b-2", Side.BUY, "ACME", "12"), limit("b-3", Side.BUY, "BOLT", "3"), limit("s-1", Side.SELL, "ACME", "13")));
            Spec.eq(j.total(), 4, "total()");
            Spec.eq(j.count("ACME"), 3, "count(ACME)");
            Spec.eq(j.count("BOLT"), 1, "count(BOLT)");
            Spec.eq(j.count("ZED"), 0, "count(ZED)");
            j.flush();
            Spec.eq(sink.batches.size(), 1, "lots écrits après flush()");
            Spec.eq(sink.batches.get(0).size(), 4, "lignes écrites : chaque ordre une seule fois");
        });

        Spec.test("M2 aucun double compte avec un journal qui a son propre recordAll", () -> {
            ListJournal inner = new ListJournal();
            CountingJournal j = new CountingJournal(inner);
            j.recordAll(List.of(limit("b-1", Side.BUY, "ACME", "1"), limit("b-2", Side.BUY, "ACME", "1"), limit("b-3", Side.BUY, "ACME", "1")));
            Spec.eq(j.total(), 3, "total() après recordAll de 3 ordres");
            Spec.eq(inner.ids, List.of("b-1", "b-2", "b-3"), "ordres reçus par le journal enveloppé");
        });

        Spec.test("M2 close ferme le journal enveloppé, et CountingJournal est finale", () -> {
            ListJournal inner = new ListJournal();
            new CountingJournal(inner).close();
            Spec.check(inner.closed, "close() doit fermer le journal enveloppé");
            Spec.check(Modifier.isFinal(CountingJournal.class.getModifiers()), "CountingJournal n'est pas conçue pour l'héritage");
            Spec.raises(NullPointerException.class, () -> new CountingJournal(null), "journal null");
        });

        // ---------------- M3
        Spec.test("M3 Commission est une interface scellée de records", () -> {
            Spec.check(Commission.class.isInterface() && Commission.class.isSealed(), "Commission doit être une interface scellée");
            Spec.check(Arrays.stream(Commission.class.getPermittedSubclasses()).allMatch(Class::isRecord), "chaque sorte de commission doit être un record");
        });

        Spec.test("M3 commission d'une transaction : forfait et taux", () -> {
            Trade t = new Trade("b-1", "s-7", "ACME", 30, eur("12.50"), T0);   // 375 EUR
            Spec.eq(t.commission(new Commission.Flat(eur("2"))), eur("2"), "forfait de 2 EUR");
            Spec.eq(t.commission(new Commission.Rate(25)), eur("0.93"), "25 pb sur 375 EUR (0,9375 arrondi vers le bas)");
            Spec.eq(t.commission(new Commission.Rate(0)), eur("0"), "taux nul");
            Spec.raises(IllegalArgumentException.class, () -> t.commission(new Commission.Flat(Money.parse("2", Currency.USD))), "forfait en USD sur une transaction en EUR");
        });

        Spec.test("M3 chaque sorte valide ses données", () -> {
            Spec.raises(IllegalArgumentException.class, () -> new Commission.Rate(-1), "taux négatif");
            Spec.raises(IllegalArgumentException.class, () -> new Commission.Rate(10_001), "taux au-delà de 100 %");
            Spec.raises(NullPointerException.class, () -> new Commission.Flat(null), "forfait null");
        });

        Spec.done();
    }
}
