import java.util.ArrayList;
import java.util.List;
import java.util.SequencedMap;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;

public class Test {
    /** Faux fournisseur : bloque, mesure la concurrence et note ce qu'il voit. */
    static final class FakeProvider implements QuoteProvider {
        final long sleepMs;
        final AtomicInteger inFlight = new AtomicInteger();
        final AtomicInteger maxInFlight = new AtomicInteger();
        final Set<String> requestIds = ConcurrentHashMap.newKeySet();
        final Set<Boolean> virtual = ConcurrentHashMap.newKeySet();
        final AtomicInteger finished = new AtomicInteger();

        FakeProvider(long sleepMs) { this.sleepMs = sleepMs; }

        @Override public long quote(String symbol) throws Exception {
            int now = inFlight.incrementAndGet();
            maxInFlight.accumulateAndGet(now, Math::max);
            requestIds.add(Aggregator.REQUEST_ID.isBound() ? Aggregator.REQUEST_ID.get() : "<non liée>");
            virtual.add(Thread.currentThread().isVirtual());
            try {
                Thread.sleep(sleepMs);
                if (symbol.startsWith("BAD")) throw new IllegalStateException("symbole inconnu");
                return symbol.length() * 100L;
            } finally {
                inFlight.decrementAndGet();
                finished.incrementAndGet();
            }
        }
    }

    static List<String> symbols(int n) { return IntStream.range(0, n).mapToObj(i -> "S" + i).toList(); }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("ordre et valeurs", () -> {
            var p = new FakeProvider(10);
            SequencedMap<String, Long> got = new Aggregator(p, 4).quoteAll("req-1", List.of("ORA", "AI", "MC", "SAN"));
            Spec.eq(new ArrayList<>(got.sequencedKeySet()), List.of("ORA", "AI", "MC", "SAN"), "clés dans l'ordre des symboles");
            Spec.eq(new ArrayList<>(got.sequencedValues()), List.of(300L, 200L, 200L, 300L), "prix");
        });

        Spec.test("un thread virtuel par appel", () -> {
            var p = new FakeProvider(5);
            new Aggregator(p, 8).quoteAll("req-2", symbols(20));
            Spec.eq(p.virtual, Set.of(true), "Thread.currentThread().isVirtual() vu par le fournisseur");
        });

        Spec.test("REQUEST_ID est lié pendant chaque appel", () -> {
            var p = new FakeProvider(5);
            new Aggregator(p, 8).quoteAll("req-42", symbols(30));
            Spec.eq(p.requestIds, Set.of("req-42"), "identifiants vus par le fournisseur (une ScopedValue ne traverse pas un executor toute seule)");
            Spec.check(!Aggregator.REQUEST_ID.isBound(), "REQUEST_ID ne doit plus être lié après quoteAll");
        });

        Spec.test("au plus maxConcurrent appels simultanés", () -> {
            var p = new FakeProvider(20);
            long start = System.nanoTime();
            new Aggregator(p, 10).quoteAll("req-3", symbols(100));
            long ms = (System.nanoTime() - start) / 1_000_000;
            Spec.check(p.maxInFlight.get() <= 10, "jusqu'à " + p.maxInFlight.get() + " appels simultanés, le contrat en autorise 10");
            Spec.check(p.maxInFlight.get() >= 5, "seulement " + p.maxInFlight.get() + " appel(s) simultané(s) : les appels doivent se chevaucher");
            Spec.check(ms < 1_500, "100 appels de 20 ms à 10 en parallèle ont pris " + ms + " ms (attendu ≈ 200 ms)");
        });

        Spec.test("1 000 cotations de 50 ms en moins de 3 s", () -> {
            var p = new FakeProvider(50);
            long start = System.nanoTime();
            var got = new Aggregator(p, 1_000).quoteAll("req-4", symbols(1_000));
            long ms = (System.nanoTime() - start) / 1_000_000;
            Spec.eq(got.size(), 1_000, "nombre de cotations");
            Spec.check(ms < 3_000, "1 000 appels de 50 ms ont pris " + ms + " ms (en séquence : 50 s)");
            Spec.check(p.maxInFlight.get() >= 100, "seulement " + p.maxInFlight.get() + " appels simultanés au maximum : la concurrence est bridée");
        });

        Spec.test("un échec nomme le symbole, sans laisser de tâche derrière", () -> {
            var p = new FakeProvider(10);
            var list = new ArrayList<>(symbols(50));
            list.set(17, "BAD-17");
            var e = Spec.raises(QuoteException.class, () -> new Aggregator(p, 50).quoteAll("req-5", list), "quoteAll avec un symbole inconnu");
            Spec.check(e.getMessage().contains("BAD-17"), "le message doit nommer le symbole fautif : " + e.getMessage());
            Spec.eq(p.inFlight.get(), 0, "appels encore en cours après quoteAll (fermer l'executor attend les tâches)");
        });

        Spec.done();
    }
}
