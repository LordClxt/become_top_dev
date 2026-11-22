import java.util.List;
import java.util.Map;
import java.util.Set;

public class Test {
    static void compilesCleanly(String name, String body) {
        var r = Javac.client(name, "import java.util.*;\nimport java.util.function.*;\nclass " + name + " {\n" + body + "\n}", "-Xlint:all", "-Werror");
        Spec.check(r.clean(), "ce client doit compiler sans cast ni avertissement :\n" + body + "\n" + r.messages());
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("union, max et invert font leur travail", () -> {
            Spec.eq(Collections2.union(Set.of("a", "b"), Set.of("b", "c")), Set.of("a", "b", "c"), "union");
            Spec.eq(Collections2.max(List.of(3, 9, 4)).orElseThrow(), 9, "max(3, 9, 4)");
            Spec.check(Collections2.max(List.<Integer>of()).isEmpty(), "max d'une collection vide");
            Spec.eq(Collections2.invert(Map.of("EUR", 978, "USD", 840)), Map.of(978, "EUR", 840, "USD"), "invert");
        });

        Spec.test("invert refuse les valeurs en double", () -> {
            Spec.raises(IllegalArgumentException.class, () -> Collections2.invert(Map.of("a", 1, "b", 1)), "deux clés pour la valeur 1");
        });

        Spec.test("identity : une seule instance, quel que soit le type", () -> {
            Object a = Collections2.identity();
            Object b = Collections2.identity();
            Spec.check(a == b, "identity() doit renvoyer toujours le même objet");
        });

        Spec.test("les appelants n'ont plus besoin de cast", () -> {
            compilesCleanly("UnionClient", "Set<String> f(Set<String> a, Set<String> b) { return Collections2.union(a, b); }");
            compilesCleanly("MaxClient", "Optional<String> f(List<String> l) { return Collections2.max(l); }");
            compilesCleanly("IdentityClient", "String f() { UnaryOperator<String> id = Collections2.identity(); return id.apply(\"x\"); }");
            compilesCleanly("InvertClient", "Map<Integer, String> f(Map<String, Integer> m) { return Collections2.invert(m); }");
        });

        Spec.test("max d'objets non comparables est refusé à la compilation", () -> {
            var r = Javac.client("BadMaxClient", "import java.util.*;\nclass BadMaxClient { Object f(List<Object> l) { return Collections2.max(l); } }");
            Spec.check(!r.ok(), "Collections2.max(List<Object>) doit être refusé à la compilation, pas lever une ClassCastException");
        });

        Spec.test("Collections2.java : zéro avertissement non supprimé (-Xlint:all -Werror)", () -> {
            var r = Javac.file("Collections2.java", "-Xlint:all", "-Werror");
            Spec.check(r.clean(), "avertissements :\n" + r.messages());
        });

        Spec.done();
    }
}
