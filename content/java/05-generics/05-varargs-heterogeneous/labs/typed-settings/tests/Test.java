import java.time.Duration;
import java.util.NoSuchElementException;
import java.util.Optional;

public class Test {
    static final Key<Double> THRESHOLD = Key.of("alert.threshold", Double.class);
    static final Key<String> THRESHOLD_TEXT = Key.of("alert.threshold", String.class);
    static final Key<Duration> TIMEOUT = Key.of("gateway.timeout", Duration.class);

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("chaque réglage garde son type", () -> {
            Settings s = new Settings();
            s.put(THRESHOLD, 0.95);
            s.put(TIMEOUT, Duration.ofSeconds(2));
            Spec.eq(s.get(THRESHOLD), Optional.of(0.95), "seuil");
            Spec.eq(s.require(TIMEOUT), Duration.ofSeconds(2), "délai");
            Spec.eq(s.get(Key.of("absent", Integer.class)), Optional.empty(), "réglage absent");
        });

        Spec.test("un client lit sans cast ni avertissement", () -> {
            var r = Javac.client("SettingsClient", """
                    import java.time.Duration;
                    class SettingsClient {
                        static final Key<Duration> TIMEOUT = Key.of("gateway.timeout", Duration.class);
                        long f(Settings s) { Duration d = s.require(TIMEOUT); return d.toMillis(); }
                    }""", "-Xlint:all", "-Werror");
            Spec.check(r.clean(), r.messages());
        });

        Spec.test("une valeur du mauvais type, glissée par un type brut, est refusée à l'entrée", () -> {
            Settings s = new Settings();
            @SuppressWarnings({ "unchecked", "rawtypes" }) Key<Object> raw = (Key) THRESHOLD;
            Spec.raises(ClassCastException.class, () -> s.put(raw, "0.95"), "ranger une chaîne sous une clé Double");
            Spec.eq(s.get(THRESHOLD), Optional.empty(), "rien n'a été rangé");
        });

        Spec.test("même nom, types différents : deux réglages distincts, jamais de ClassCastException à la lecture", () -> {
            Settings s = new Settings();
            s.put(THRESHOLD_TEXT, "0.95");
            Optional<Double> seuil = s.get(THRESHOLD);
            Spec.eq(seuil, Optional.empty(), "lire la clé Double après avoir rangé la clé String du même nom");
        });

        Spec.test("require nomme le réglage manquant", () -> {
            Settings s = new Settings();
            try {
                s.require(TIMEOUT);
                Spec.check(false, "require d'un réglage absent doit lever NoSuchElementException");
            } catch (NoSuchElementException e) {
                Spec.check(e.getMessage() != null && e.getMessage().contains("gateway.timeout"), "message : " + e.getMessage());
            }
        });

        Spec.test("Settings.java : zéro avertissement (-Xlint:all -Werror)", () -> {
            var r = Javac.file("Settings.java", "-Xlint:all", "-Werror");
            Spec.check(r.clean(), "avertissements :\n" + r.messages());
        });

        Spec.done();
    }
}
