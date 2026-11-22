import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class Test {
    static final Instant T0 = Instant.parse("2026-01-05T09:30:00Z");

    static Money eur(String s) { return Money.parse(s, Currency.EUR); }

    static Order buy(String id) { return new Order.Builder(id, Side.BUY, "ACME").quantity(10).limit(eur("12.50")).build(); }

    static OrderEvent.Filled filled(String id) {
        return new OrderEvent.Filled(buy(id), new Trade(id, "s-1", "ACME", 10, eur("12.50"), T0));
    }

    static void compiles(String name, String body) {
        var r = Javac.client(name, "import java.util.*;\nimport java.util.function.*;\nclass " + name + " {\n" + body + "\n}", "-Xlint:all", "-Werror");
        Spec.check(r.clean(), "ce client doit compiler sans cast ni avertissement :\n" + body + "\n" + r.messages());
    }

    public static void main(String[] args) {
        Spec.only(args);

        // ---------------- M1
        Spec.test("M1 un abonné reçoit les événements de son type, déjà typés", () -> {
            EventBus bus = new EventBus();
            List<String> notionals = new ArrayList<>();
            bus.subscribe(OrderEvent.Filled.class, f -> notionals.add(f.trade().notional().toString()));
            bus.publish(new OrderEvent.Accepted(buy("b-1")));
            bus.publish(filled("b-1"));
            bus.publish(new OrderEvent.Cancelled("b-2", "client"));
            Spec.eq(notionals, List.of("125.00 EUR"), "montants reçus par l'abonné aux exécutions");
        });

        Spec.test("M1 se désabonner arrête la livraison", () -> {
            EventBus bus = new EventBus();
            List<String> seen = new ArrayList<>();
            AutoCloseable sub = bus.subscribe(OrderEvent.Cancelled.class, c -> seen.add(c.reason()));
            bus.publish(new OrderEvent.Cancelled("b-1", "un"));
            sub.close();
            bus.publish(new OrderEvent.Cancelled("b-2", "deux"));
            Spec.eq(seen, List.of("un"), "raisons reçues");
        });

        Spec.test("M1 un client s'abonne sans cast", () -> {
            compiles("FilledClient", "void f(EventBus bus) { bus.subscribe(OrderEvent.Filled.class, e -> System.out.println(e.trade().notional())); }");
        });

        // ---------------- M2
        Spec.test("M2 s'abonner au type racine reçoit tout, dans l'ordre", () -> {
            EventBus bus = new EventBus();
            List<String> ids = new ArrayList<>();
            bus.subscribe(OrderEvent.class, e -> ids.add(e.getClass().getSimpleName() + ":" + e.orderId()));
            bus.publishAll(List.of(new OrderEvent.Accepted(buy("b-1")), filled("b-1"), new OrderEvent.Cancelled("b-2", "client")));
            Spec.eq(ids, List.of("Accepted:b-1", "Filled:b-1", "Cancelled:b-2"), "événements reçus");
        });

        Spec.test("M2 un consommateur plus général convient (super)", () -> {
            compiles("SuperClient", "void f(EventBus bus, Consumer<Object> log) { bus.subscribe(OrderEvent.Filled.class, log); }");
            compiles("PublishAllClient", "void f(EventBus bus, List<OrderEvent.Filled> fills) { bus.publishAll(fills); }");
            EventBus bus = new EventBus();
            List<Object> log = new ArrayList<>();
            bus.subscribe(OrderEvent.Accepted.class, e -> log.add(e));
            bus.publish(new OrderEvent.Accepted(buy("b-9")));
            Spec.eq(log.size(), 1, "événements reçus par un Consumer<Object>");
        });

        // ---------------- M3
        Spec.test("M3 l'historique par type est typé, et dans l'ordre", () -> {
            EventBus bus = new EventBus();
            bus.publishAll(List.of(filled("b-1"), new OrderEvent.Cancelled("b-2", "x"), filled("b-3")));
            List<OrderEvent.Filled> fills = bus.history(OrderEvent.Filled.class);
            Spec.eq(fills.size(), 2, "exécutions dans l'historique");
            Spec.eq(fills.get(1).orderId(), "b-3", "deuxième exécution");
            Spec.eq(bus.history(OrderEvent.class).size(), 3, "historique complet");
            Spec.raises(UnsupportedOperationException.class, () -> bus.history(OrderEvent.class).clear(), "modifier l'historique renvoyé");
        });

        Spec.test("M3 EventBus.java : zéro avertissement (-Xlint:all -Werror)", () -> {
            var r = Javac.file("EventBus.java", "-Xlint:all", "-Werror");
            Spec.check(r.clean(), "avertissements :\n" + r.messages());
        });

        Spec.done();
    }
}
