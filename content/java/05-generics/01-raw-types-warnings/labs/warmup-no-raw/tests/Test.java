import java.util.List;

public class Test {
    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("le lot garde ses éléments, dans l'ordre", () -> {
            Batch<String> b = new Batch<>();
            b.add("o-1");
            b.addAll(List.of("o-2", "o-3"));
            Spec.eq(b.size(), 3, "size()");
            Spec.eq(b.get(1), "o-2", "get(1)");
            Spec.eq(b.drain(), List.of("o-1", "o-2", "o-3"), "drain()");
            Spec.eq(b.size(), 0, "size() après drain()");
        });

        Spec.test("addAll accepte une collection d'un sous-type", () -> {
            var r = Javac.client("SubtypeClient", """
                    import java.util.List;
                    class SubtypeClient {
                        void f(Batch<Number> b, List<Integer> ints) { b.addAll(ints); }
                    }""");
            Spec.check(r.ok(), "un Batch<Number> doit accepter une List<Integer> :\n" + r.messages());
        });

        Spec.test("le compilateur refuse un mauvais type, au lieu de l'exécution", () -> {
            var r = Javac.client("WrongTypeClient", """
                    import java.util.List;
                    class WrongTypeClient {
                        void f(Batch<String> b) { b.addAll(List.of(42)); }
                    }""");
            Spec.check(!r.ok(), "Batch<String>.addAll(List.of(42)) doit être refusé à la compilation, pas découvert plus tard");
        });

        Spec.test("Batch.java compile sans aucun avertissement (-Xlint:rawtypes,unchecked -Werror)", () -> {
            var r = Javac.file("Batch.java", "-Xlint:rawtypes,unchecked", "-Werror");
            Spec.check(r.clean(), "avertissements restants :\n" + r.messages());
        });

        Spec.done();
    }
}
