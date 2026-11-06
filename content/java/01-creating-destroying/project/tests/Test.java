import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Objects;

public class Test {
    static final Clock NOON = Clock.fixed(Instant.parse("2026-11-05T12:00:00Z"), ZoneOffset.UTC);

    static final class FakeSink implements Sink {
        final List<List<String>> batches = new ArrayList<>();
        boolean failWrite, failClose;
        int closes;
        @Override public void write(List<String> lines) throws IOException {
            if (failWrite) throw new IOException("disque plein");
            batches.add(List.copyOf(lines));
        }
        @Override public void close() throws IOException {
            closes++;
            if (failClose) throw new IOException("fermeture impossible");
        }
    }

    static Money eur(String s) { return Money.parse(s, Currency.EUR); }

    static Order buy(String id, long qty) {
        return new Order.Builder(id, Side.BUY, "ACME").quantity(qty).limit(eur("12.50")).build();
    }

    public static void main(String[] args) {
        Spec.only(args);

        // ---------------- M1
        Spec.test("M1 fabriques nommées, pas de constructeur public", () -> {
            Spec.check(Arrays.stream(Money.class.getConstructors()).findAny().isEmpty(), "Money a un constructeur public");
            Spec.eq(Money.ofMinor(1250, Currency.EUR).toString(), "12.50 EUR", "ofMinor(1250, EUR)");
            Spec.eq(Money.ofMinor(-5, Currency.USD).toString(), "-0.05 USD", "ofMinor(-5, USD)");
            Spec.eq(Money.ofMinor(1500, Currency.JPY).toString(), "1500 JPY", "ofMinor(1500, JPY)");
            Spec.eq(Money.ofMinor(100007, Currency.EUR).toString(), "1000.07 EUR", "ofMinor(100007, EUR)");
        });

        Spec.test("M1 parse", () -> {
            Spec.eq(eur("12.5").minorUnits(), 1250L, "parse(\"12.5\", EUR)");
            Spec.eq(eur("12").minorUnits(), 1200L, "parse(\"12\", EUR)");
            Spec.eq(eur("-0.05").minorUnits(), -5L, "parse(\"-0.05\", EUR)");
            Spec.eq(Money.parse("1500", Currency.JPY).minorUnits(), 1500L, "parse(\"1500\", JPY)");
            Spec.eq(eur("0.1").plus(eur("0.2")).toString(), "0.30 EUR", "0.1 + 0.2");
            for (String bad : List.of("12.345", "12.", "abc", "", "1,5", "+3")) {
                var e = Spec.raises(IllegalArgumentException.class, () -> eur(bad), "parse(\"" + bad + "\", EUR)");
                Spec.check(e.getMessage() != null && e.getMessage().contains("\"" + bad + "\""), "le message doit citer le texte refusé entre guillemets : " + e.getMessage());
            }
            Spec.raises(IllegalArgumentException.class, () -> Money.parse("1.5", Currency.JPY), "parse(\"1.5\", JPY)");
        });

        Spec.test("M1 zéro est unique par devise", () -> {
            Money z = Money.zero(Currency.EUR);
            Spec.check(Money.zero(Currency.EUR) == z, "zero(EUR) doit toujours renvoyer la même instance");
            Spec.check(Money.ofMinor(0, Currency.EUR) == z, "ofMinor(0, EUR) doit renvoyer l'instance de zero(EUR)");
            Spec.check(eur("0") == z && eur("-0.00") == z, "parse(\"0\") doit renvoyer l'instance de zero(EUR)");
            Spec.check(eur("3").plus(eur("-3")) == z, "3 + (-3) doit renvoyer l'instance de zero(EUR)");
            Spec.check(Money.zero(Currency.USD) != (Object) z, "zero(USD) et zero(EUR) sont deux montants différents");
            Spec.eq(z.toString(), "0.00 EUR", "zero(EUR).toString()");
            Spec.check(!z.isPositive() && eur("0.01").isPositive(), "isPositive()");
        });

        Spec.test("M1 plus vérifie la devise et le dépassement", () -> {
            Spec.raises(IllegalArgumentException.class, () -> eur("1").plus(Money.parse("1", Currency.USD)), "EUR + USD");
            Spec.raises(ArithmeticException.class, () -> Money.ofMinor(Long.MAX_VALUE, Currency.EUR).plus(Money.ofMinor(1, Currency.EUR)), "dépassement");
            Spec.eq(Money.parse("7", Currency.JPY).currency(), Currency.JPY, "currency()");
        });

        // ---------------- M2
        Spec.test("M2 ordre à cours limité", () -> {
            Order o = buy("ord-1", 10);
            Spec.eq(o.toString(), "ord-1 BUY 10 ACME @ 12.50 EUR", "toString()");
            Spec.eq(o.side(), Side.BUY, "side()");
            Spec.eq(o.symbol(), "ACME", "symbol()");
            Spec.eq(o.quantity(), 10L, "quantity()");
            Spec.eq(o.limit().map(Money::toString).orElse("vide"), "12.50 EUR", "limit()");
            Spec.check(!o.isMarket() && !o.isAllOrNone(), "isMarket() / isAllOrNone()");
        });

        Spec.test("M2 ordre au marché et all-or-none", () -> {
            Order m = new Order.Builder("ord-2", Side.SELL, "ACME").quantity(5).build();
            Spec.eq(m.toString(), "ord-2 SELL 5 ACME @ MKT", "ordre au marché");
            Spec.check(m.isMarket() && m.limit().isEmpty(), "isMarket() et limit() vide");
            Order a = new Order.Builder("ord-3", Side.BUY, "XYZ").allOrNone().quantity(100).limit(eur("1")).build();
            Spec.eq(a.toString(), "ord-3 BUY 100 XYZ @ 1.00 EUR AON", "ordre all-or-none");
        });

        Spec.test("M2 validation au bon endroit", () -> {
            Spec.raises(NullPointerException.class, () -> new Order.Builder(null, Side.BUY, "ACME"), "id null");
            Spec.raises(NullPointerException.class, () -> new Order.Builder("x", null, "ACME"), "side null");
            for (String bad : List.of("acme", "TOOLONG", "", "AC1")) {
                Spec.raises(IllegalArgumentException.class, () -> new Order.Builder("x", Side.BUY, bad), "symbol \"" + bad + "\"");
            }
            var b = new Order.Builder("x", Side.BUY, "ACME");
            Spec.raises(IllegalArgumentException.class, () -> b.quantity(0), "quantity(0)");
            Spec.raises(IllegalArgumentException.class, () -> b.limit(Money.zero(Currency.EUR)), "limit(0)");
            Spec.raises(IllegalArgumentException.class, () -> b.limit(eur("-1")), "limit(-1)");
            Spec.raises(IllegalStateException.class, b::build, "build() sans quantité");
            Spec.raises(IllegalStateException.class, () -> new Order.Builder("x", Side.BUY, "ACME").quantity(1).allOrNone().build(),
                    "ordre au marché all-or-none");
        });

        Spec.test("M2 un builder réutilisé ne modifie pas les ordres déjà construits", () -> {
            var b = new Order.Builder("ord-9", Side.BUY, "ACME").quantity(1);
            Order first = b.build();
            b.quantity(2).limit(eur("3"));
            Spec.eq(first.toString(), "ord-9 BUY 1 ACME @ MKT", "premier ordre");
            Spec.eq(b.build().toString(), "ord-9 BUY 2 ACME @ 3.00 EUR", "second ordre");
        });

        // ---------------- M3
        Spec.test("M3 ouverture validée", () -> {
            Spec.check(Arrays.stream(OrderJournal.class.getConstructors()).findAny().isEmpty(), "OrderJournal a un constructeur public : passe par open(…)");
            Spec.raises(NullPointerException.class, () -> OrderJournal.open(null, NOON, 3), "open(null, …)");
            Spec.raises(NullPointerException.class, () -> OrderJournal.open(new FakeSink(), null, 3), "open(…, null, …)");
            Spec.raises(IllegalArgumentException.class, () -> OrderJournal.open(new FakeSink(), NOON, 0), "capacité 0");
        });

        Spec.test("M3 écriture par lots, horodatée par l'horloge injectée", () -> {
            var sink = new FakeSink();
            var j = OrderJournal.open(sink, NOON, 2);
            j.record(buy("a", 1));
            Spec.eq(j.buffered(), 1, "buffered() après un ordre");
            Spec.eq(sink.batches.size(), 0, "rien n'est écrit avant d'atteindre la capacité");
            j.record(buy("b", 2));
            j.record(buy("c", 3));
            Spec.eq(sink.batches, List.of(List.of(
                    "2026-11-05T12:00:00Z a BUY 1 ACME @ 12.50 EUR",
                    "2026-11-05T12:00:00Z b BUY 2 ACME @ 12.50 EUR")), "lots écrits");
            Spec.eq(j.buffered(), 1, "buffered() après le premier lot");
            j.flush();
            j.flush();
            Spec.eq(sink.batches.size(), 2, "flush() sur un tampon vide n'écrit rien");
        });

        Spec.test("M3 un échec d'écriture ne perd aucun ordre", () -> {
            var sink = new FakeSink();
            var j = OrderJournal.open(sink, NOON, 10);
            j.record(buy("a", 1));
            sink.failWrite = true;
            Spec.raises(IOException.class, j::flush, "flush() quand le disque est plein");
            Spec.eq(j.buffered(), 1, "buffered() après un échec : la ligne doit être conservée");
            sink.failWrite = false;
            j.flush();
            Spec.eq(sink.batches.size(), 1, "la ligne est écrite au flush suivant");
        });

        Spec.test("M3 aucune rétention après vidage", () -> {
            var j = OrderJournal.open(new FakeSink(), NOON, 4);
            for (int i = 0; i < 4; i++) j.record(buy("r" + i, 1));
            Spec.eq(j.buffered(), 0, "buffered() après un lot plein");
            for (Field f : OrderJournal.class.getDeclaredFields()) {
                if (Modifier.isStatic(f.getModifiers())) continue;
                f.setAccessible(true);
                Object v = f.get(j);
                if (v instanceof Collection<?> c) {
                    Spec.check(c.isEmpty(), "le champ " + f.getName() + " référence encore " + c.size() + " ligne(s) déjà écrite(s)");
                } else if (v instanceof Object[] a) {
                    long kept = Arrays.stream(a).filter(Objects::nonNull).count();
                    Spec.check(kept == 0, "le tableau " + f.getName() + " référence encore " + kept
                            + " ligne(s) déjà écrite(s) : référence obsolète, le ramasse-miettes ne peut pas les libérer");
                }
            }
        });

        Spec.test("M3 fermeture : support fermé même si le vidage échoue", () -> {
            var sink = new FakeSink();
            var j = OrderJournal.open(sink, NOON, 10);
            j.record(buy("a", 1));
            sink.failWrite = true;
            sink.failClose = true;
            var e = Spec.raises(IOException.class, j::close, "close() quand l'écriture et la fermeture échouent");
            Spec.eq(e.getMessage(), "disque plein", "exception principale");
            Spec.check(e.getSuppressed().length == 1 && "fermeture impossible".equals(e.getSuppressed()[0].getMessage()),
                    "l'échec de fermeture doit être attaché comme exception supprimée");
            Spec.eq(sink.closes, 1, "le support est fermé même si le vidage a échoué");
        });

        Spec.test("M3 try-with-resources, close idempotent, puis record refusé", () -> {
            var sink = new FakeSink();
            OrderJournal kept;
            try (OrderJournal j = OrderJournal.open(sink, NOON, 10)) {
                j.record(buy("a", 1));
                kept = j;
            }
            Spec.eq(sink.batches.size(), 1, "close() vide le tampon");
            kept.close();
            Spec.eq(sink.closes, 1, "le support n'est fermé qu'une fois");
            Spec.raises(IllegalStateException.class, () -> kept.record(buy("b", 1)), "record après close");
        });

        Spec.done();
    }
}
