import java.util.List;

public class Test {
    static final Order OK = new Order("ACME", 100, 12_500);
    static final Order BIG = new Order("ACME", 10_000, 12_500);
    static final Order BANNED = new Order("XYZ", 1, 100);

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("les règles de risque s'appliquent comme celles de la bibliothèque", () -> {
            Spec.eq(RuleEngine.checkAll(OK, RiskRule.class), List.of(), "ordre normal");
            Spec.eq(RuleEngine.checkAll(BIG, RiskRule.class), List.of("MAX_NOTIONAL: montant 125000000 > 10000000"), "ordre de 1 250 000 €");
            Spec.eq(RuleEngine.checkAll(BANNED, RiskRule.class), List.of("BANNED_SYMBOL: symbole sous embargo XYZ"), "titre sous embargo");
            Spec.eq(RuleEngine.checkAll(new Order("ZZZ", 0, 5), StandardRule.class), List.of("POSITIVE_QUANTITY: quantité 0", "KNOWN_SYMBOL: symbole inconnu ZZZ"), "règles standard");
        });

        Spec.test("check accepte des règles de plusieurs enums mélangées", () -> {
            var r = Javac.client("MixClient", """
                    import java.util.*;
                    class MixClient {
                        List<String> f(Order o) { return RuleEngine.check(o, List.of(StandardRule.KNOWN_SYMBOL, RiskRule.BANNED_SYMBOL)); }
                    }""", "-Xlint:all", "-Werror");
            Spec.check(r.clean(), "le client doit compiler :\n" + r.messages());
        });

        Spec.test("failing renvoie un ensemble typé des règles violées", () -> {
            var r = Javac.client("FailingClient", """
                    import java.util.*;
                    class FailingClient {
                        Set<RiskRule> f(Order o) { return RuleEngine.failing(o, RiskRule.class); }
                    }""", "-Xlint:all", "-Werror");
            Spec.check(r.clean(), "le client doit compiler sans cast :\n" + r.messages());
        });

        Spec.test("checkAll refuse à la compilation un enum qui n'est pas une OrderRule", () -> {
            var r = Javac.client("BadClient", """
                    import java.util.concurrent.TimeUnit;
                    class BadClient {
                        Object f(Order o) { return RuleEngine.checkAll(o, TimeUnit.class); }
                    }""");
            Spec.check(!r.ok(), "RuleEngine.checkAll(o, TimeUnit.class) doit être refusé à la compilation, pas lever une ClassCastException");
        });

        Spec.done();
    }
}
