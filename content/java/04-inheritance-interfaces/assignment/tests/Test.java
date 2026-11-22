import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedList;
import java.util.List;

public class Test {
    static BoundedList<String> full3() {
        BoundedList<String> b = BoundedList.wrap(new ArrayList<>(), 3);
        b.add("a");
        b.add("b");
        b.add("c");
        return b;
    }

    static void refused(Runnable r, String what, BoundedList<String> b, List<String> expected) {
        Spec.raises(IllegalStateException.class, r::run, what);
        Spec.eq(b, expected, "liste après " + what + " refusé");
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("se remplit jusqu'à la capacité", () -> {
            var b = full3();
            Spec.eq(b, List.of("a", "b", "c"), "contenu");
            Spec.eq(b.capacity(), 3, "capacity()");
        });

        Spec.test("add et add(index) sont refusés au-delà", () -> {
            var b = full3();
            refused(() -> b.add("d"), "add(d)", b, List.of("a", "b", "c"));
            refused(() -> b.add(0, "d"), "add(0, d)", b, List.of("a", "b", "c"));
        });

        Spec.test("addAll est tout ou rien", () -> {
            BoundedList<String> b = BoundedList.wrap(new ArrayList<>(), 3);
            b.add("a");
            refused(() -> b.addAll(List.of("x", "y", "z")), "addAll(x, y, z)", b, List.of("a"));
            refused(() -> b.addAll(0, List.of("x", "y", "z")), "addAll(0, x, y, z)", b, List.of("a"));
            Spec.check(b.addAll(List.of("x", "y")), "addAll(x, y) tient dans la capacité");
            Spec.eq(b, List.of("a", "x", "y"), "après addAll(x, y)");
        });

        Spec.test("les chemins détournés aussi : listIterator, subList, Collections.addAll", () -> {
            var b = full3();
            refused(() -> b.listIterator().add("d"), "listIterator().add(d)", b, List.of("a", "b", "c"));
            refused(() -> b.subList(0, 1).add("d"), "subList(0, 1).add(d)", b, List.of("a", "b", "c"));
            refused(() -> Collections.addAll(b, "d"), "Collections.addAll(b, d)", b, List.of("a", "b", "c"));
        });

        Spec.test("les méthodes d'ajout de Java 21 aussi : addFirst, addLast", () -> {
            var b = full3();
            refused(() -> b.addFirst("d"), "addFirst(d)", b, List.of("a", "b", "c"));
            refused(() -> b.addLast("d"), "addLast(d)", b, List.of("a", "b", "c"));
        });

        Spec.test("retirer libère de la place", () -> {
            var b = full3();
            b.remove("b");
            b.add(1, "d");
            Spec.eq(b, List.of("a", "d", "c"), "après remove(b) puis add(1, d)");
            b.subList(0, 2).clear();
            b.addAll(List.of("x", "y"));
            Spec.eq(b, List.of("c", "x", "y"), "après subList(0, 2).clear() et addAll(x, y)");
        });

        Spec.test("enveloppe n'importe quelle liste, sans la copier", () -> {
            List<String> linked = new LinkedList<>(List.of("p"));
            BoundedList<String> b = BoundedList.wrap(linked, 2);
            b.add("q");
            Spec.eq(linked, List.of("p", "q"), "la LinkedList enveloppée");
            refused(() -> b.add("r"), "add(r)", b, List.of("p", "q"));
            Spec.raises(IllegalArgumentException.class, () -> BoundedList.wrap(new ArrayList<>(List.of("a", "b")), 1), "wrap d'une liste déjà trop longue");
        });

        Spec.test("égale à une liste ordinaire, set et get inchangés", () -> {
            var b = full3();
            b.set(1, "B");
            Spec.check(b.equals(List.of("a", "B", "c")) && List.of("a", "B", "c").equals(b), "equals dans les deux sens");
            Spec.eq(b.hashCode(), List.of("a", "B", "c").hashCode(), "hashCode()");
        });

        Spec.done();
    }
}
