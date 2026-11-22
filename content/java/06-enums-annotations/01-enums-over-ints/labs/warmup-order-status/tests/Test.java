import java.util.Map;
import java.util.Optional;

public class Test {
    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("chaque statut a son code", () -> {
            Map<OrderStatus, String> expected = Map.of(OrderStatus.NEW, "N", OrderStatus.PARTIAL, "P",
                    OrderStatus.FILLED, "F", OrderStatus.CANCELLED, "C", OrderStatus.REJECTED, "R");
            for (OrderStatus s : OrderStatus.values()) Spec.eq(s.code(), expected.get(s), "code de " + s);
        });

        Spec.test("les statuts terminaux, REJECTED compris", () -> {
            Spec.check(!OrderStatus.NEW.isTerminal() && !OrderStatus.PARTIAL.isTerminal(), "NEW et PARTIAL ne sont pas terminaux");
            Spec.check(OrderStatus.FILLED.isTerminal() && OrderStatus.CANCELLED.isTerminal(), "FILLED et CANCELLED sont terminaux");
            Spec.check(OrderStatus.REJECTED.isTerminal(), "un ordre rejeté n'évolue plus : REJECTED est terminal");
        });

        Spec.test("fromCode retrouve chaque statut, et rien pour un code inconnu", () -> {
            for (OrderStatus s : OrderStatus.values()) Spec.eq(OrderStatus.fromCode(s.code()), Optional.of(s), "fromCode(" + s.code() + ")");
            Spec.eq(OrderStatus.fromCode("Z"), Optional.empty(), "fromCode(\"Z\")");
            Spec.eq(OrderStatus.fromCode("?"), Optional.empty(), "fromCode(\"?\")");
        });

        Spec.test("les codes sont tous différents", () -> {
            long distinct = java.util.Arrays.stream(OrderStatus.values()).map(OrderStatus::code).distinct().count();
            Spec.eq(distinct, (long) OrderStatus.values().length, "nombre de codes distincts");
        });

        Spec.done();
    }
}
