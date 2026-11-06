import java.lang.reflect.Modifier;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.function.Supplier;

public class Test {
    static final Instant NOON = Instant.parse("2026-11-05T12:00:00Z");
    static final Clock CLOCK = Clock.fixed(NOON, ZoneOffset.UTC);

    static Supplier<String> ids() {
        int[] n = {0};
        return () -> "msg-" + (++n[0]);
    }

    /** Transport factice : enregistre les envois, échoue pour les destinataires listés. */
    static final class FakeTransport implements Transport {
        final List<String> sent = new ArrayList<>();
        final Set<String> failFor;
        final boolean failOnClose;
        int closes;

        FakeTransport(Set<String> failFor, boolean failOnClose) {
            this.failFor = failFor;
            this.failOnClose = failOnClose;
        }

        @Override public void send(String id, Message m, Instant at) throws SendException {
            if (failFor.contains(m.recipient())) throw new SendException("refusé : " + m.recipient());
            sent.add(id + " " + m.recipient() + " " + at);
        }

        @Override public void close() throws SendException {
            closes++;
            if (failOnClose) throw new SendException("fermeture du transport");
        }
    }

    static Email mail(String to) { return new Email.Builder(to).body("hello").build(); }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("builder hiérarchique : chaînage sans cast", () -> {
            Email e = new Email.Builder("ana@example.com").tag(Tag.BILLING).subject("Votre facture")
                    .tag(Tag.URGENT).body("Montant : 42 €").build();
            Spec.eq(e.recipient(), "ana@example.com", "recipient()");
            Spec.eq(e.subject(), "Votre facture", "subject()");
            Spec.eq(e.body(), "Montant : 42 €", "body()");
            Spec.eq(e.tags(), Set.of(Tag.BILLING, Tag.URGENT), "tags()");
            Sms s = new Sms.Builder("+33612345678").tag(Tag.SECURITY).body("Code : 1234").build();
            Spec.eq(s.recipient(), "+33612345678", "Sms recipient()");
            Spec.check(Modifier.isAbstract(Message.class.getModifiers()), "Message doit être abstraite");
        });

        Spec.test("body() et tag() vivent dans un seul builder commun", () -> {
            for (Class<?> b : List.of(Email.Builder.class, Sms.Builder.class)) {
                Class<?> parent = b.getSuperclass();
                Spec.check(parent != null && parent.getName().equals("Message$Builder"),
                        b.getName() + " doit étendre Message.Builder (aujourd'hui : " + parent.getName() + ")");
                for (String m : List.of("body", "tag")) {
                    boolean redeclared = Arrays.stream(b.getDeclaredMethods())
                            .anyMatch(x -> x.getName().equals(m) && !x.isSynthetic() && !x.isBridge());
                    Spec.check(!redeclared, b.getName() + " redéclare " + m + "() : la méthode commune doit rester dans Message.Builder");
                }
            }
        });

        Spec.test("valeurs par défaut et immutabilité", () -> {
            Email e = mail("bob@example.com");
            Spec.eq(e.subject(), "(sans objet)", "subject() par défaut");
            Spec.eq(e.tags(), Set.of(), "tags() par défaut");
            Spec.raises(UnsupportedOperationException.class, () -> e.tags().add(Tag.URGENT), "tags().add(…)");
        });

        Spec.test("un builder peut resservir", () -> {
            var b = new Email.Builder("ana@example.com").body("v1").tag(Tag.MARKETING);
            Email first = b.build();
            b.body("v2").tag(Tag.URGENT);
            Email second = b.build();
            Spec.eq(first.body(), "v1", "body() du premier e-mail");
            Spec.eq(first.tags(), Set.of(Tag.MARKETING), "tags() du premier e-mail");
            Spec.eq(second.tags(), Set.of(Tag.MARKETING, Tag.URGENT), "tags() du second");
        });

        Spec.test("validation immédiate des destinataires", () -> {
            for (String bad : List.of("ana.example.com", "@example.com", "ana@")) {
                Spec.raises(IllegalArgumentException.class, () -> new Email.Builder(bad), "Email.Builder(\"" + bad + "\")");
            }
            for (String bad : List.of("0612345678", "+33", "+33 6 12 34 56 78", "+1234567890123456")) {
                Spec.raises(IllegalArgumentException.class, () -> new Sms.Builder(bad), "Sms.Builder(\"" + bad + "\")");
            }
            Spec.raises(NullPointerException.class, () -> new Email.Builder(null), "Email.Builder(null)");
        });

        Spec.test("invariants vérifiés au build", () -> {
            Spec.raises(IllegalStateException.class, () -> new Email.Builder("a@b.c").build(), "build() sans body");
            Spec.raises(IllegalStateException.class, () -> new Sms.Builder("+33612345678").body("   ").build(), "body blanc");
            Spec.raises(IllegalStateException.class, () -> new Sms.Builder("+33612345678").body("x".repeat(161)).build(), "SMS de 161 caractères");
            new Sms.Builder("+33612345678").body("x".repeat(160)).build();
            new Email.Builder("a@b.c").body("x".repeat(500)).build();
        });

        Spec.test("Outbox : fabrique statique et dépendances injectées", () -> {
            Spec.check(Arrays.stream(Outbox.class.getConstructors()).findAny().isEmpty(), "Outbox ne doit pas avoir de constructeur public : Outbox.open(…)");
            Spec.check(AutoCloseable.class.isAssignableFrom(Outbox.class), "Outbox doit s'utiliser dans un try-with-resources");
            var t = new FakeTransport(Set.of(), false);
            Spec.raises(NullPointerException.class, () -> Outbox.open(null, CLOCK, ids()), "open(null, …)");
            Spec.raises(NullPointerException.class, () -> Outbox.open(t, null, ids()), "open(…, null, …)");
            Spec.raises(NullPointerException.class, () -> Outbox.open(t, CLOCK, null), "open(…, null)");
        });

        Spec.test("tout part à la fermeture, avec l'heure de l'horloge injectée", () -> {
            var t = new FakeTransport(Set.of(), false);
            try (Outbox o = Outbox.open(t, CLOCK, ids())) {
                Spec.eq(o.queue(mail("ana@example.com")), "msg-1", "premier identifiant");
                Spec.eq(o.queue(new Sms.Builder("+33612345678").body("hi").build()), "msg-2", "second identifiant");
                Spec.eq(o.pending(), 2, "pending() avant fermeture");
                Spec.eq(t.sent.size(), 0, "rien ne doit partir avant flush()/close()");
            }
            Spec.eq(t.sent, List.of("msg-1 ana@example.com " + NOON, "msg-2 +33612345678 " + NOON), "envois");
            Spec.eq(t.closes, 1, "le transport est fermé une fois");
        });

        Spec.test("un échec n'empêche pas les autres envois ; la première erreur remonte", () -> {
            var t = new FakeTransport(Set.of("b@x.io", "d@x.io"), false);
            var o = Outbox.open(t, CLOCK, ids());
            for (String to : List.of("a@x.io", "b@x.io", "c@x.io", "d@x.io")) o.queue(mail(to));
            var e = Spec.raises(SendException.class, o::flush, "flush() avec deux échecs");
            Spec.eq(e.getMessage(), "refusé : b@x.io", "exception principale (la première)");
            Spec.eq(e.getSuppressed().length, 1, "nombre d'exceptions supprimées");
            Spec.eq(e.getSuppressed()[0].getMessage(), "refusé : d@x.io", "exception supprimée");
            Spec.eq(t.sent.size(), 2, "les envois qui pouvaient réussir sont partis");
            Spec.eq(o.pending(), 0, "pending() après flush, échecs compris");
        });

        Spec.test("close : l'erreur d'envoi reste principale, le transport est fermé quand même", () -> {
            var t = new FakeTransport(Set.of("b@x.io"), true);
            var o = Outbox.open(t, CLOCK, ids());
            o.queue(mail("b@x.io"));
            var e = Spec.raises(SendException.class, o::close, "close() quand l'envoi et la fermeture échouent");
            Spec.eq(e.getMessage(), "refusé : b@x.io", "exception principale");
            Spec.check(e.getSuppressed().length == 1 && "fermeture du transport".equals(e.getSuppressed()[0].getMessage()),
                    "l'échec de fermeture du transport doit être attaché comme exception supprimée");
            Spec.eq(t.closes, 1, "le transport est fermé même si l'envoi a échoué");
        });

        Spec.test("close idempotent, puis queue refusé", () -> {
            var t = new FakeTransport(Set.of(), false);
            var o = Outbox.open(t, CLOCK, ids());
            o.close();
            o.close();
            Spec.eq(t.closes, 1, "le transport n'est fermé qu'une fois");
            Spec.raises(IllegalStateException.class, () -> o.queue(mail("a@x.io")), "queue après close");
        });

        Spec.done();
    }
}
