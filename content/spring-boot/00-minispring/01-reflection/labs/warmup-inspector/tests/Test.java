import java.util.List;

public class Test {
    @Component static class EventCatalog { }
    @Component("prices") static class PriceCalculator { }
    @Component static class URLParser { }
    @Component static class A { }
    static class Plain { }
    static class Clock { }

    @Component static class Reservations {
        Reservations(EventCatalog catalog, PriceCalculator prices) { }
    }
    @Component static class Reports {
        Reports() { }
        @Inject Reports(EventCatalog catalog, Clock clock) { }
    }
    @Component static class Confused {
        Confused() { }
        Confused(Clock clock) { }
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("isComponent lit l'annotation à l'exécution", () -> {
            Spec.check(Inspector.isComponent(EventCatalog.class), "EventCatalog porte @Component");
            Spec.check(!Inspector.isComponent(Plain.class), "Plain ne porte pas @Component");
        });

        Spec.test("beanName : la valeur de @Component d'abord", () -> {
            Spec.eq(Inspector.beanName(PriceCalculator.class), "prices", "beanName(PriceCalculator) avec @Component(\"prices\")");
        });

        Spec.test("beanName : sinon le nom simple, première lettre en minuscule", () -> {
            Spec.eq(Inspector.beanName(EventCatalog.class), "eventCatalog", "beanName(EventCatalog)");
            Spec.eq(Inspector.beanName(A.class), "a", "beanName(A)");
        });

        Spec.test("beanName : deux majuscules en tête, le nom ne change pas (comme Spring)", () -> {
            Spec.eq(Inspector.beanName(URLParser.class), "URLParser", "beanName(URLParser)");
        });

        Spec.test("dependencies : les paramètres du seul constructeur, dans l'ordre", () -> {
            Spec.eq(Inspector.dependencies(Reservations.class), List.of(EventCatalog.class, PriceCalculator.class),
                    "dependencies(Reservations)");
            Spec.eq(Inspector.dependencies(EventCatalog.class), List.of(), "dependencies(EventCatalog), constructeur implicite");
        });

        Spec.test("dependencies : avec plusieurs constructeurs, celui annoté @Inject", () -> {
            Spec.eq(Inspector.dependencies(Reports.class), List.of(EventCatalog.class, Clock.class), "dependencies(Reports)");
        });

        Spec.test("dependencies : plusieurs constructeurs sans @Inject, c'est une erreur", () -> {
            Spec.raises(IllegalStateException.class, () -> Inspector.dependencies(Confused.class), "dependencies(Confused)");
        });

        Spec.done();
    }
}
