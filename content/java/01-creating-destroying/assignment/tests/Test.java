import java.lang.reflect.Modifier;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;

public class Test {
    static final long[] TICKS = {0};

    static MetricRegistry registry(int maxSamples) {
        return MetricRegistry.builder().ticker(() -> TICKS[0]).maxSamples(maxSamples).build();
    }

    static void measure(Timer t, long millis) {
        try (Timer.Sample s = t.start()) {
            TICKS[0] += millis * 1_000_000;
        }
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("le registre ne se construit que par son builder", () -> {
            Spec.check(Arrays.stream(MetricRegistry.class.getConstructors()).findAny().isEmpty(),
                    "MetricRegistry a un constructeur public : passe par builder()");
            Spec.check(Arrays.stream(Counter.class.getConstructors()).findAny().isEmpty()
                            && Arrays.stream(Timer.class.getConstructors()).findAny().isEmpty(),
                    "Counter et Timer s'obtiennent par le registre : pas de constructeur public, sinon un nom pourrait désigner deux compteurs");
            Spec.check(MetricRegistry.builder().build() != null, "builder().build() avec les valeurs par défaut");
        });

        Spec.test("le builder valide dès l'appel", () -> {
            Spec.raises(NullPointerException.class, () -> MetricRegistry.builder().ticker(null), "ticker(null)");
            Spec.raises(IllegalArgumentException.class, () -> MetricRegistry.builder().maxSamples(0), "maxSamples(0)");
        });

        Spec.test("compteur : un nom, une instance", () -> {
            var r = registry(10);
            Counter c = r.counter("http.requests");
            c.increment();
            c.add(4);
            Spec.eq(c.count(), 5L, "count() après increment() puis add(4)");
            Spec.check(r.counter("http.requests") == c, "counter(\"http.requests\") doit renvoyer la même instance à chaque appel");
            Spec.eq(c.name(), "http.requests", "name()");
            Spec.raises(IllegalArgumentException.class, () -> c.add(-1), "add(-1)");
            Spec.eq(c.count(), 5L, "count() après un add refusé");
        });

        Spec.test("noms valides et invalides", () -> {
            var r = registry(10);
            r.counter("db.query2");
            r.counter("jobs");
            for (String bad : List.of("Http.requests", "http..requests", ".http", "http.", "2xx", "http requests", "")) {
                var e = Spec.raises(IllegalArgumentException.class, () -> r.counter(bad), "counter(\"" + bad + "\")");
                Spec.check(bad.isEmpty() || (e.getMessage() != null && e.getMessage().contains(bad)),
                        "le message doit citer le nom refusé : " + e.getMessage());
            }
        });

        Spec.test("un nom ne change pas de type", () -> {
            var r = registry(10);
            r.counter("db.query");
            Spec.raises(IllegalArgumentException.class, () -> r.timer("db.query"), "timer(\"db.query\") après counter(\"db.query\")");
            r.timer("db.latency");
            Spec.raises(IllegalArgumentException.class, () -> r.counter("db.latency"), "counter(\"db.latency\") après timer");
        });

        Spec.test("names() : trié et non modifiable", () -> {
            var r = registry(10);
            r.timer("zeta");
            r.counter("alpha");
            r.counter("mid.point");
            Spec.eq(List.copyOf(r.names()), List.of("alpha", "mid.point", "zeta"), "names()");
            Spec.raises(UnsupportedOperationException.class, () -> r.names().add("x"), "names().add(…)");
        });

        Spec.test("timer : mesure avec l'horloge injectée", () -> {
            var r = registry(10);
            Timer t = r.timer("db.query");
            Spec.check(r.timer("db.query") == t, "timer(\"db.query\") doit renvoyer la même instance");
            Spec.eq(t.max(), Duration.ZERO, "max() sans mesure");
            measure(t, 2);
            measure(t, 7);
            measure(t, 3);
            Spec.eq(t.count(), 3L, "count()");
            Spec.eq(t.recent(), List.of(Duration.ofMillis(2), Duration.ofMillis(7), Duration.ofMillis(3)), "recent()");
            Spec.eq(t.max(), Duration.ofMillis(7), "max()");
            Spec.raises(UnsupportedOperationException.class, () -> t.recent().add(Duration.ZERO), "recent().add(…)");
        });

        Spec.test("fermer deux fois n'enregistre qu'une mesure", () -> {
            Timer t = registry(10).timer("job");
            Timer.Sample s = t.start();
            TICKS[0] += 5_000_000;
            s.close();
            TICKS[0] += 5_000_000;
            s.close();
            Spec.eq(t.count(), 1L, "count() après deux close()");
            Spec.eq(t.recent(), List.of(Duration.ofMillis(5)), "recent()");
        });

        Spec.test("la fenêtre est bornée", () -> {
            Timer t = registry(3).timer("hot.path");
            for (long ms = 1; ms <= 1000; ms++) measure(t, ms);
            Spec.eq(t.count(), 1000L, "count() compte toutes les mesures");
            Spec.eq(t.recent(), List.of(Duration.ofMillis(998), Duration.ofMillis(999), Duration.ofMillis(1000)), "recent() garde les 3 dernières");
            Spec.eq(t.max(), Duration.ofMillis(1000), "max() sur la fenêtre");
        });

        Spec.test("un builder réutilisé ne modifie pas les registres déjà construits", () -> {
            var b = MetricRegistry.builder().ticker(() -> TICKS[0]).maxSamples(1);
            MetricRegistry first = b.build();
            b.maxSamples(5);
            Timer t = first.timer("a");
            measure(t, 1);
            measure(t, 2);
            Spec.eq(t.recent().size(), 1, "recent().size() du premier registre (maxSamples 1 au build)");
            Spec.check(b.build() != first, "chaque build() renvoie un nouveau registre");
        });

        Spec.test("Timer.Sample s'utilise dans un try-with-resources", () -> {
            Spec.check(AutoCloseable.class.isAssignableFrom(Timer.Sample.class), "Sample doit implémenter AutoCloseable");
            Spec.check(!Modifier.isPublic(fieldsOrNone(Timer.class)), "les champs de Timer ne doivent pas être publics");
        });

        Spec.done();
    }

    /** Renvoie les modificateurs combinés des champs déclarés (0 si aucun) pour repérer un champ public. */
    static int fieldsOrNone(Class<?> c) {
        return Arrays.stream(c.getDeclaredFields()).mapToInt(f -> f.getModifiers() & Modifier.PUBLIC).reduce(0, (a, b) -> a | b);
    }
}
