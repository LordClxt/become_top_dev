import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

public class Test {
    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("addAll de trois éléments compte 3, pas 6", () -> {
            var s = new InstrumentedSet<String>(new HashSet<>());
            s.addAll(List.of("Snap", "Crackle", "Pop"));
            Spec.eq(s.addCount(), 3, "addCount() après addAll de 3 éléments");
            Spec.eq(s.size(), 3, "size()");
        });

        Spec.test("les doublons comptent comme des tentatives", () -> {
            var s = new InstrumentedSet<String>(new HashSet<>());
            s.add("a");
            s.add("a");
            s.addAll(List.of("a", "b"));
            Spec.eq(s.addCount(), 4, "addCount() après add(a), add(a), addAll(a, b)");
            Spec.eq(s.size(), 2, "size()");
        });

        Spec.test("enveloppe un TreeSet : l'ordre trié est conservé", () -> {
            var s = new InstrumentedSet<String>(new TreeSet<>());
            s.addAll(List.of("poire", "abricot", "melon"));
            Spec.eq(List.copyOf(s), List.of("abricot", "melon", "poire"), "ordre d'itération");
        });

        Spec.test("enveloppe un ensemble existant sans le copier", () -> {
            Set<String> existing = new HashSet<>(Set.of("x", "y"));
            var s = new InstrumentedSet<>(existing);
            Spec.eq(s.addCount(), 0, "addCount() juste après l'enveloppement");
            s.add("z");
            Spec.check(existing.contains("z"), "l'ajout doit arriver dans l'ensemble enveloppé, pas dans une copie");
            existing.add("w");
            Spec.check(s.contains("w"), "un ajout direct dans l'ensemble enveloppé doit être visible à travers l'enveloppe");
            Spec.eq(s.addCount(), 1, "addCount() : seul l'ajout passé par l'enveloppe compte");
        });

        Spec.test("égal à un Set ordinaire qui a les mêmes éléments", () -> {
            var s = new InstrumentedSet<String>(new HashSet<>());
            s.addAll(List.of("a", "b"));
            Spec.check(s.equals(Set.of("a", "b")), "equals(Set.of(a, b))");
            Spec.check(Set.of("a", "b").equals(s), "Set.of(a, b).equals(s)");
            Spec.eq(s.hashCode(), Set.of("a", "b").hashCode(), "hashCode()");
        });

        Spec.test("composition : InstrumentedSet n'hérite pas de HashSet", () -> {
            Spec.check(!HashSet.class.isAssignableFrom(InstrumentedSet.class),
                    "InstrumentedSet ne doit pas étendre HashSet : enveloppe un Set à la place");
        });

        Spec.done();
    }
}
