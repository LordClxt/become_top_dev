import java.lang.ref.WeakReference;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

public class Test {
    static <E> List<SetEvent<E>> record(ObservableSet<E> s) {
        List<SetEvent<E>> events = new ArrayList<>();
        s.onChange(events::add);
        return events;
    }

    static boolean freed(WeakReference<?> ref) throws InterruptedException {
        for (int i = 0; i < 20 && ref.get() != null; i++) {
            System.gc();
            Thread.sleep(10);
        }
        return ref.get() == null;
    }

    static <E> SetEvent<E> added(E e) { return new SetEvent.Added<>(e); }

    static <E> SetEvent<E> removed(E e) { return new SetEvent.Removed<>(e); }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("add et remove : un événement par changement réel", () -> {
            var obs = new ObservableSet<String>(new HashSet<>());
            var events = record(obs);
            Set<String> s = obs.asSet();
            Spec.check(s.add("a"), "add(a) renvoie true");
            Spec.check(!s.add("a"), "add(a) en double renvoie false");
            Spec.check(s.remove("a"), "remove(a) renvoie true");
            Spec.check(!s.remove("zzz"), "remove d'un absent renvoie false");
            Spec.eq(events, List.of(added("a"), removed("a")), "événements");
        });

        Spec.test("addAll : un Added par élément vraiment ajouté, jamais deux", () -> {
            var obs = new ObservableSet<String>(new HashSet<>(Set.of("a")));
            var events = record(obs);
            obs.asSet().addAll(List.of("a", "b", "c", "b"));
            Spec.eq(events.size(), 2, "nombre d'événements après addAll(a, b, c, b) sur {a}");
            Spec.check(events.containsAll(List.of(added("b"), added("c"))), "Added(b) et Added(c) : " + events);
        });

        Spec.test("removeAll, retainAll, removeIf : un Removed par élément retiré", () -> {
            var obs = new ObservableSet<Integer>(new TreeSet<>(List.of(1, 2, 3, 4, 5, 6)));
            var events = record(obs);
            Set<Integer> s = obs.asSet();
            s.removeAll(List.of(1, 9));
            s.retainAll(List.of(2, 3, 4, 5));
            s.removeIf(n -> n % 2 == 0);
            Spec.eq(events, List.of(removed(1), removed(6), removed(2), removed(4)), "événements (TreeSet : ordre trié)");
            Spec.eq(s, Set.of(3, 5), "contenu final");
        });

        Spec.test("iterator().remove() est observé", () -> {
            var obs = new ObservableSet<String>(new TreeSet<>(List.of("x", "y")));
            var events = record(obs);
            Iterator<String> it = obs.asSet().iterator();
            it.next();
            it.remove();
            Spec.eq(events, List.of(removed("x")), "événements");
        });

        Spec.test("clear : un seul événement avec tout ce qui a été retiré ; rien sur un ensemble vide", () -> {
            var obs = new ObservableSet<String>(new HashSet<>(Set.of("a", "b")));
            var events = record(obs);
            obs.asSet().clear();
            obs.asSet().clear();
            Spec.eq(events, List.of(new SetEvent.Cleared<>(Set.of("a", "b"))), "événements");
        });

        Spec.test("enveloppe l'ensemble reçu, sans le copier", () -> {
            Set<String> inner = new HashSet<>();
            var obs = new ObservableSet<>(inner);
            obs.asSet().add("k");
            Spec.check(inner.contains("k"), "l'ajout doit arriver dans l'ensemble reçu");
            Spec.check(obs.asSet().equals(Set.of("k")) && Set.of("k").equals(obs.asSet()), "equals dans les deux sens");
        });

        Spec.test("se désabonner arrête les événements, et fermer deux fois ne gêne pas", () -> {
            var obs = new ObservableSet<String>(new HashSet<>());
            List<SetEvent<String>> a = new ArrayList<>();
            List<SetEvent<String>> b = new ArrayList<>();
            AutoCloseable ra = obs.onChange(a::add);
            obs.onChange(b::add);
            obs.asSet().add("1");
            ra.close();
            ra.close();
            obs.asSet().add("2");
            Spec.eq(a.size(), 1, "événements reçus par l'écouteur désabonné");
            Spec.eq(b.size(), 2, "événements reçus par l'autre écouteur");
        });

        Spec.test("garder un abonnement ne retient pas l'ensemble", () -> {
            var obs = new ObservableSet<long[]>(new HashSet<>());
            obs.asSet().add(new long[1_000_000]);   // 8 Mo dans l'ensemble
            AutoCloseable registration = obs.onChange(e -> { });
            var ref = new WeakReference<>(obs);
            obs = null;
            Spec.check(freed(ref), "l'ensemble (et ses 8 Mo) reste en mémoire tant qu'on garde l'abonnement");
            Spec.check(registration != null, "l'abonnement reste utilisable");
        });

        Spec.test("SetEvent est scellée, ObservableSet est finale", () -> {
            Spec.check(SetEvent.class.isSealed(), "SetEvent doit être scellée : trois sortes d'événements, pas une de plus");
            Spec.check(Arrays.stream(SetEvent.class.getPermittedSubclasses()).allMatch(Class::isRecord), "chaque événement est un record");
            Spec.check(Modifier.isFinal(ObservableSet.class.getModifiers()), "ObservableSet n'est pas conçue pour l'héritage");
        });

        Spec.test("un Cleared ne change pas après coup", () -> {
            var obs = new ObservableSet<String>(new HashSet<>(Set.of("a")));
            var events = record(obs);
            obs.asSet().clear();
            obs.asSet().add("b");
            var cleared = (SetEvent.Cleared<String>) events.get(0);
            Spec.eq(cleared.removed(), Set.of("a"), "éléments du Cleared après un nouvel ajout");
            Spec.raises(UnsupportedOperationException.class, () -> cleared.removed().add("x"), "modifier removed()");
        });

        Spec.done();
    }
}
