import java.lang.reflect.Modifier;
import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class Test {
    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("Stack : la copie a son propre tableau", () -> {
            Stack s = new Stack();
            s.push("a");
            s.push("b");
            Stack copy = s.clone();
            copy.pop();
            copy.push("X");
            Spec.eq(s.pop(), "b", "l'original après push(\"X\") sur la copie");
            Spec.eq(copy.pop(), "X", "la copie");
            Spec.eq(copy.size(), 1, "taille de la copie");
            Spec.eq(s.size(), 1, "taille de l'original");
        });

        Spec.test("ChainedMap : remplacer une valeur dans la copie", () -> {
            ChainedMap m = new ChainedMap();
            m.put(1, "un");
            m.put(17, "dix-sept"); // même compartiment que 1
            ChainedMap copy = m.clone();
            copy.put(1, "UN");
            Spec.eq(m.get(1), "un", "original.get(1) après copy.put(1, \"UN\")");
            Spec.eq(copy.get(1), "UN", "copy.get(1)");
            Spec.eq(copy.get(17), "dix-sept", "la copie garde les autres entrées de la chaîne");
        });

        Spec.test("ChainedMap : ajouter dans la copie", () -> {
            ChainedMap m = new ChainedMap();
            m.put(2, "deux");
            ChainedMap copy = m.clone();
            copy.put(18, "dix-huit");
            m.put(2, "DEUX");
            Spec.eq(m.get(18), null, "original.get(18) après un ajout dans la copie");
            Spec.eq(copy.get(2), "deux", "copy.get(2) après un remplacement dans l'original");
            Spec.eq(m.size(), 1, "original.size()");
            Spec.eq(copy.size(), 2, "copy.size()");
        });

        Spec.test("ChainedMap : longue chaîne, petite pile", () -> {
            ChainedMap m = new ChainedMap();
            for (int k = 0; k < 5_000; k++) m.put(k * 16, "v" + k); // tout dans le compartiment 0
            ChainedMap[] out = new ChainedMap[1];
            Throwable[] failure = new Throwable[1];
            Thread t = new Thread(null, () -> {
                try { out[0] = m.clone(); } catch (Throwable e) { failure[0] = e; }
            }, "petite-pile", 64 * 1024);
            t.start();
            t.join();
            if (failure[0] instanceof StackOverflowError) {
                throw new Spec.Failure("StackOverflowError en clonant une chaîne de 5 000 entrées : copie la chaîne avec une boucle, pas par récursion");
            }
            if (failure[0] != null) throw failure[0];
            out[0].put(0, "modifié");
            Spec.eq(m.get(0), "v0", "original.get(0) après modification de la copie");
            Spec.eq(out[0].get(16 * 4_999), "v4999", "dernière entrée de la chaîne copiée");
        });

        Spec.test("Schedule : constructeur de copie indépendant", () -> {
            Spec.check(!Cloneable.class.isAssignableFrom(Schedule.class), "Schedule ne doit pas implémenter Cloneable");
            Spec.check(Arrays.stream(Schedule.class.getDeclaredFields()).allMatch(f -> Modifier.isFinal(f.getModifiers())),
                    "les champs de Schedule doivent rester final");
            Schedule s = new Schedule("support");
            s.assign(DayOfWeek.TUESDAY, "Bo");
            Schedule draft = newCopy(s);
            draft.unassign(DayOfWeek.TUESDAY, "Bo");
            draft.assign(DayOfWeek.TUESDAY, "Ana");
            Spec.eq(s.on(DayOfWeek.TUESDAY), List.of("Bo"), "planning réel après modification du scénario");
            Spec.eq(draft.on(DayOfWeek.TUESDAY), List.of("Ana"), "scénario");
            Spec.eq(draft.team(), "support", "équipe copiée");
        });

        Spec.test("Schedule : fabrique de conversion", () -> {
            Set<String> monday = new LinkedHashSet<>(List.of("Ana", "Cy"));
            List<String> friday = new ArrayList<>(List.of("Bo"));
            Schedule s = Schedule.from("ops", Map.of(DayOfWeek.MONDAY, monday, DayOfWeek.FRIDAY, friday));
            Spec.eq(s.on(DayOfWeek.MONDAY), List.of("Ana", "Cy"), "lundi, depuis un Set");
            monday.add("Zoé");
            friday.clear();
            Spec.eq(s.on(DayOfWeek.MONDAY), List.of("Ana", "Cy"), "lundi après modification du Set source");
            Spec.eq(s.on(DayOfWeek.FRIDAY), List.of("Bo"), "vendredi après modification de la List source");
            s.assign(DayOfWeek.FRIDAY, "Dan");
            Spec.eq(friday, List.of(), "la source ne doit pas voir les affectations du planning");
        });

        Spec.done();
    }

    static Schedule newCopy(Schedule s) throws Throwable {
        try {
            return Schedule.class.getConstructor(Schedule.class).newInstance(s);
        } catch (NoSuchMethodException e) {
            throw new Spec.Failure("il manque le constructeur de copie public Schedule(Schedule other)");
        } catch (java.lang.reflect.InvocationTargetException e) {
            throw e.getCause();
        }
    }
}
