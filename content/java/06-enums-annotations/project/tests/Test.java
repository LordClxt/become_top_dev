import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class Test {
    static final Instant T0 = Instant.parse("2026-01-05T09:30:00Z");

    static Money eur(String s) { return Money.parse(s, Currency.EUR); }

    static Order buy(String id, long qty) { return new Order.Builder(id, Side.BUY, "ACME").quantity(qty).limit(eur("12.50")).build(); }

    static OrderEvent.Accepted accepted(Order o) { return new OrderEvent.Accepted(o); }

    /** Une exécution de qty unités ; l'ordre porté est l'ordre après l'exécution. */
    static OrderEvent.Filled filled(Order o, long qty) {
        return new OrderEvent.Filled(o.fill(qty), new Trade(o.id(), "s-1", o.symbol(), qty, eur("12.50"), T0));
    }

    /** Un contrôle de desk, écrit hors de la bibliothèque. */
    enum DeskCheck implements OrderCheck {
        NO_MARKET { @Override public boolean passes(Order order) { return !order.isMarket(); } },
        ACME_ONLY { @Override public boolean passes(Order order) { return order.symbol().equals("ACME"); } }
    }

    static void compiles(String name, String body, boolean expected) {
        var r = Javac.client(name, "import java.util.*;\nclass " + name + " {\n" + body + "\n}", "-Xlint:all", "-Werror");
        Spec.check(r.clean() == expected, (expected ? "ce client doit compiler sans avertissement :\n" : "ce client ne doit pas compiler :\n") + body + "\n" + r.messages());
    }

    public static void main(String[] args) {
        Spec.only(args);

        // ---------------- M1
        Spec.test("M1 les transitions de chaque statut", () -> {
            Spec.eq(OrderStatus.NEW.next(), EnumSet.of(OrderStatus.ACCEPTED, OrderStatus.REJECTED), "depuis NEW");
            Spec.eq(OrderStatus.ACCEPTED.next(), EnumSet.of(OrderStatus.PARTIALLY_FILLED, OrderStatus.FILLED, OrderStatus.CANCELLED), "depuis ACCEPTED");
            Spec.eq(OrderStatus.PARTIALLY_FILLED.next(), EnumSet.of(OrderStatus.PARTIALLY_FILLED, OrderStatus.FILLED, OrderStatus.CANCELLED), "depuis PARTIALLY_FILLED");
            for (OrderStatus s : List.of(OrderStatus.REJECTED, OrderStatus.FILLED, OrderStatus.CANCELLED)) {
                Spec.eq(s.next(), EnumSet.noneOf(OrderStatus.class), "depuis " + s);
            }
        });

        Spec.test("M1 terminal, canMoveTo, et des ensembles non modifiables", () -> {
            Spec.eq(OrderStatus.REJECTED.isTerminal(), true, "REJECTED est final");
            Spec.eq(OrderStatus.PARTIALLY_FILLED.isTerminal(), false, "PARTIALLY_FILLED n'est pas final");
            Spec.eq(OrderStatus.ACCEPTED.canMoveTo(OrderStatus.REJECTED), false, "ACCEPTED -> REJECTED");
            Spec.eq(OrderStatus.NEW.canMoveTo(OrderStatus.FILLED), false, "NEW -> FILLED");
            Spec.eq(List.copyOf(OrderStatus.ACCEPTED.next()), List.of(OrderStatus.PARTIALLY_FILLED, OrderStatus.FILLED, OrderStatus.CANCELLED), "ordre de déclaration");
            Spec.raises(UnsupportedOperationException.class, () -> OrderStatus.FILLED.next().add(OrderStatus.NEW), "rouvrir un ordre exécuté");
        });

        // ---------------- M2
        Spec.test("M2 le suivi suit le bus", () -> {
            EventBus bus = new EventBus();
            OrderTracker t = new OrderTracker(bus);
            Order a = buy("b-1", 30);
            bus.publish(accepted(a));
            Spec.eq(t.status("b-1"), Optional.of(OrderStatus.ACCEPTED), "après acceptation");
            bus.publish(filled(a, 10));
            Spec.eq(t.status("b-1"), Optional.of(OrderStatus.PARTIALLY_FILLED), "après 10 sur 30");
            bus.publish(filled(a.fill(10), 20));
            Spec.eq(t.status("b-1"), Optional.of(OrderStatus.FILLED), "après le reste");
            Spec.eq(t.status("inconnu"), Optional.empty(), "ordre jamais vu");
        });

        Spec.test("M2 les transitions impossibles sont refusées et notées", () -> {
            EventBus bus = new EventBus();
            OrderTracker t = new OrderTracker(bus);
            Order a = buy("b-1", 10);
            bus.publish(accepted(a));
            bus.publish(filled(a, 10));
            bus.publish(new OrderEvent.Cancelled("b-1", "trop tard"));
            bus.publish(filled(buy("b-2", 10), 10));
            Spec.eq(t.status("b-1"), Optional.of(OrderStatus.FILLED), "un ordre exécuté reste exécuté");
            Spec.eq(t.status("b-2"), Optional.empty(), "une exécution sans acceptation ne crée rien");
            Spec.eq(t.anomalies(), List.of("b-1: FILLED -> CANCELLED", "b-2: NEW -> FILLED"), "anomalies");
        });

        Spec.test("M2 le décompte couvre tous les statuts, dans l'ordre", () -> {
            EventBus bus = new EventBus();
            OrderTracker t = new OrderTracker(bus);
            bus.publishAll(List.of(accepted(buy("b-1", 10)), accepted(buy("b-2", 10)), new OrderEvent.Cancelled("b-2", "client")));
            Map<OrderStatus, Long> counts = t.countByStatus();
            Spec.eq(List.copyOf(counts.keySet()), List.of(OrderStatus.values()), "clés : tous les statuts");
            Spec.eq(List.copyOf(counts.values()), List.of(0L, 1L, 0L, 0L, 0L, 1L), "valeurs");
        });

        // ---------------- M3
        Spec.test("M3 contrôles de la bibliothèque et d'un desk, mélangés", () -> {
            EventBus bus = new EventBus();
            OrderTracker t = new OrderTracker(bus).requireAll(StandardCheck.class).require(List.of(DeskCheck.NO_MARKET));
            Order market = new Order.Builder("m-1", Side.SELL, "ACME").quantity(15).build();
            bus.publish(accepted(market));
            bus.publish(accepted(buy("b-1", 20)));
            Spec.eq(t.status("m-1"), Optional.of(OrderStatus.REJECTED), "ordre au marché de 15");
            Spec.eq(t.rejections("m-1"), List.<OrderCheck>of(StandardCheck.ROUND_LOT, DeskCheck.NO_MARKET), "raisons du rejet");
            Spec.eq(t.status("b-1"), Optional.of(OrderStatus.ACCEPTED), "ordre correct");
            Spec.eq(t.rejections("b-1"), List.<OrderCheck>of(), "pas de raison pour un ordre accepté");
            bus.publish(filled(market, 15));
            Spec.eq(t.anomalies(), List.of("m-1: REJECTED -> FILLED"), "exécuter un ordre rejeté");
        });

        Spec.test("M3 requireAll n'accepte qu'un enum de contrôles", () -> {
            compiles("EnumChecks", "enum Mine implements OrderCheck { ALL { @Override public boolean passes(Order o) { return true; } } }\n"
                    + "void f(EventBus bus) { new OrderTracker(bus).requireAll(Mine.class).requireAll(StandardCheck.class); }", true);
            compiles("NotAnEnum", "void f(EventBus bus) { new OrderTracker(bus).requireAll(String.class); }", false);
            compiles("NotAChecksEnum", "void f(EventBus bus) { new OrderTracker(bus).requireAll(Side.class); }", false);
        });

        Spec.test("M3 OrderStatus.java et OrderTracker.java : zéro avertissement (-Xlint:all -Werror)", () -> {
            for (String f : List.of("OrderStatus.java", "OrderTracker.java")) {
                var r = Javac.file(f, "-Xlint:all", "-Werror");
                Spec.check(r.clean(), f + " :\n" + r.messages());
            }
        });

        Spec.done();
    }
}
