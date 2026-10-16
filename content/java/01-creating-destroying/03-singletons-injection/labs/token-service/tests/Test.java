import java.lang.reflect.Modifier;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.function.Supplier;

public class Test {
    /** Horloge de test qu'on fait avancer à la main. */
    static final class FakeClock extends Clock {
        Instant now;
        FakeClock(Instant now) { this.now = now; }
        void advance(Duration d) { now = now.plus(d); }
        @Override public Instant instant() { return now; }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
    }

    static final Instant T0 = Instant.parse("2026-01-01T10:00:00Z");

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("issue : utilise l'horloge et les identifiants injectés", () -> {
            var service = new TokenService(Clock.fixed(T0, ZoneOffset.UTC), () -> "fixe");
            Token t = service.issue("ana");
            Spec.eq(t.id(), "fixe", "id du jeton (doit venir du Supplier injecté)");
            Spec.eq(t.user(), "ana", "user du jeton");
            Spec.eq(t.expiresAt(), Instant.parse("2026-01-01T10:15:00Z"),
                    "expiresAt (doit venir de l'horloge injectée + 15 min, pas de Instant.now())");
        });

        Spec.test("isValid : expire exactement au bout de 15 minutes, sans attendre", () -> {
            var clock = new FakeClock(T0);
            var service = new TokenService(clock, () -> "x");
            Token t = service.issue("ana");
            clock.advance(Duration.ofMinutes(14).plusSeconds(59));
            Spec.check(service.isValid(t), "à 14 min 59 s, le jeton doit encore être valide");
            clock.advance(Duration.ofSeconds(1));
            Spec.check(!service.isValid(t), "à 15 min pile, le jeton doit être expiré (lis l'heure dans l'horloge injectée)");
        });

        Spec.test("deux services indépendants n'interfèrent pas", () -> {
            var a = new TokenService(Clock.fixed(T0, ZoneOffset.UTC), () -> "A");
            var b = new TokenService(Clock.fixed(T0.plusSeconds(3600), ZoneOffset.UTC), () -> "B");
            Spec.eq(a.issue("u").id(), "A", "id émis par le service a");
            Spec.eq(b.issue("u").id(), "B", "id émis par le service b");
            Spec.eq(b.issue("u").expiresAt(), Instant.parse("2026-01-01T11:15:00Z"), "expiration du service b");
        });

        Spec.test("le fournisseur d'identifiants est appelé une fois par jeton", () -> {
            int[] calls = {0};
            Supplier<String> ids = () -> "id" + (++calls[0]);
            var service = new TokenService(Clock.fixed(T0, ZoneOffset.UTC), ids);
            service.issue("a");
            service.issue("b");
            Spec.eq(calls[0], 2, "nombre d'appels au Supplier");
        });

        Spec.test("dépendances et arguments null refusés", () -> {
            Spec.raises(NullPointerException.class, () -> new TokenService(null, () -> "x"), "new TokenService(null, …)");
            Spec.raises(NullPointerException.class, () -> new TokenService(Clock.systemUTC(), null), "new TokenService(…, null)");
            var service = new TokenService(Clock.systemUTC(), () -> "x");
            Spec.raises(NullPointerException.class, () -> service.issue(null), "issue(null)");
        });

        Spec.test("TokenService ne garde plus d'état statique", () -> {
            for (var f : TokenService.class.getDeclaredFields()) {
                if (Modifier.isStatic(f.getModifiers())) {
                    Spec.check(Modifier.isFinal(f.getModifiers()),
                            "le champ statique non final " + f.getName() + " est partagé par tous les services : déplace l'état dans une dépendance");
                }
            }
        });

        Spec.test("SequentialIds est un singleton enum", () -> {
            Spec.check(SequentialIds.class.isEnum(),
                    "SequentialIds doit être une enum à un seul élément : seule forme garantie contre la réflexion et la sérialisation");
            Spec.eq(SequentialIds.class.getEnumConstants().length, 1, "nombre de constantes de SequentialIds");
        });

        Spec.test("SequentialIds produit tok-1, tok-2… et sert de Supplier", () -> {
            Supplier<String> ids = SequentialIds.INSTANCE;
            String first = ids.get();
            String second = ids.get();
            Spec.check(first.startsWith("tok-"), "format de l'identifiant : " + first);
            long a = Long.parseLong(first.substring(4));
            long b = Long.parseLong(second.substring(4));
            Spec.eq(b, a + 1, "deux identifiants successifs");
        });

        Spec.test("system() câble l'horloge système et le singleton", () -> {
            TokenService s = TokenService.system();
            Token t = s.issue("ana");
            Spec.check(t.id().startsWith("tok-"), "system() doit utiliser SequentialIds.INSTANCE");
            Duration left = Duration.between(Instant.now(), t.expiresAt());
            Spec.check(left.compareTo(Duration.ofMinutes(14)) > 0 && left.compareTo(Duration.ofMinutes(16)) < 0,
                    "system() doit utiliser l'horloge système : expiration dans " + left);
            Spec.check(s.isValid(t), "un jeton tout juste émis est valide");
        });

        Spec.done();
    }
}
