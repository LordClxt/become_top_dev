import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public class Test {
    static Javac.Result client(String name, String body) {
        return Javac.client(name, "import java.util.*;\nimport java.time.*;\nclass " + name + " {\n" + body + "\n}", "-Xlint:all", "-Werror");
    }

    static void compiles(String name, String body) {
        var r = client(name, body);
        Spec.check(r.clean(), "ce client doit compiler, sans cast ni avertissement :\n" + body + "\n" + r.messages());
    }

    static void refused(String name, String body, String why) {
        Spec.check(!client(name, body).ok(), why + " :\n" + body);
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("la pile et les outils font leur travail", () -> {
            Stack<Number> s = new Stack<>();
            s.push(1);
            s.push(2.5);
            List<Number> out = new ArrayList<>();
            s.popAll(out);
            Spec.eq(out, List.of(2.5, 1), "popAll");
            Spec.eq(Pick.max(List.of(3, 11, 7)), 11, "max");
            Spec.eq(Pick.union(Set.of(1), Set.of(2)), Set.of(1, 2), "union");
            Spec.raises(IllegalArgumentException.class, () -> Pick.max(List.<Integer>of()), "max d'une liste vide");
        });

        Spec.test("pushAll accepte les sous-types (producteur : extends)", () -> {
            compiles("PushClient", "void f(Stack<Number> s, List<Integer> ints, Set<Double> ds) { s.pushAll(ints); s.pushAll(ds); }");
        });

        Spec.test("popAll accepte les super-types (consommateur : super)", () -> {
            compiles("PopClient", "void f(Stack<Number> s, Collection<Object> sink) { s.popAll(sink); }");
        });

        Spec.test("mais popAll refuse ce qui casserait les types", () -> {
            refused("BadPopClient", "void f(Stack<Number> s, List<Integer> ints) { s.popAll(ints); }",
                    "verser des Number dans une List<Integer> doit être refusé");
            refused("BadPushClient", "void f(Stack<Integer> s, List<Number> ns) { s.pushAll(ns); }",
                    "empiler des Number dans une Stack<Integer> doit être refusé");
        });

        Spec.test("max fonctionne avec les types qui héritent leur comparaison", () -> {
            compiles("DateClient", "LocalDate f(List<LocalDate> dates) { return Pick.max(dates); }");
            Spec.eq(Pick.max(List.of(LocalDate.of(2026, 7, 3), LocalDate.of(2026, 12, 8))), LocalDate.of(2026, 12, 8), "max de deux dates");
        });

        Spec.test("union de deux sous-types donne un ensemble du super-type, sans joker à manipuler", () -> {
            compiles("UnionClient", "Set<Number> f(Set<Integer> ints, Set<Double> ds) { return Pick.union(ints, ds); }");
        });

        Spec.done();
    }
}
