import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public class Test {
    static <E> List<E> list(Iterable<E> it) {
        List<E> out = new ArrayList<>();
        for (E e : it) out.add(e);
        return out;
    }

    static void structure(Class<?> c) {
        Spec.check(Modifier.isFinal(c.getModifiers()), c.getSimpleName() + " doit être final");
        Spec.eq(c.getConstructors().length, 0, "constructeurs publics de " + c.getSimpleName());
        for (Field f : c.getDeclaredFields()) {
            if (f.isSynthetic()) continue;
            Spec.check(Modifier.isPrivate(f.getModifiers()) && Modifier.isFinal(f.getModifiers()),
                    c.getSimpleName() + "." + f.getName() + " doit être private final");
        }
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("PStack : opérations de base", () -> {
            PStack<String> s = PStack.<String>empty().push("a").push("b").push("c");
            Spec.eq(s.peek(), "c", "peek");
            Spec.eq(s.size(), 3, "size");
            Spec.eq(list(s), List.of("c", "b", "a"), "itération du sommet vers le fond");
            Spec.eq(s.toString(), "[c, b, a]", "toString");
            Spec.eq(list(s.reverse()), List.of("a", "b", "c"), "reverse");
            Spec.check(PStack.empty().isEmpty() && !s.isEmpty(), "isEmpty");
            Spec.raises(NoSuchElementException.class, () -> PStack.empty().peek(), "peek sur pile vide");
            Spec.raises(NoSuchElementException.class, () -> PStack.empty().pop(), "pop sur pile vide");
            Spec.raises(NullPointerException.class, () -> s.push(null), "push(null)");
        });

        Spec.test("PStack : persistance et partage", () -> {
            PStack<Integer> s = PStack.<Integer>empty().push(1).push(2);
            PStack<Integer> t = s.push(3);
            PStack<Integer> u = s.pop();
            Spec.eq(list(s), List.of(2, 1), "s après push et pop sur s");
            Spec.eq(list(t), List.of(3, 2, 1), "t");
            Spec.eq(list(u), List.of(1), "u");
            Spec.check(s.push(99).pop() == s, "s.push(x).pop() doit renvoyer s lui-même (partage)");
            Spec.check((Object) PStack.<Integer>empty() == PStack.<String>empty(), "empty() doit renvoyer une instance unique");
            Spec.check(u.pop() == PStack.<Integer>empty(), "vider une pile doit ramener à l'instance vide");
        });

        Spec.test("PQueue : opérations de base", () -> {
            PQueue<String> q = PQueue.<String>empty().enqueue("a").enqueue("b").enqueue("c");
            Spec.eq(q.peek(), "a", "peek");
            Spec.eq(q.size(), 3, "size");
            Spec.eq(list(q), List.of("a", "b", "c"), "itération dans l'ordre de sortie");
            Spec.eq(q.toString(), "[a, b, c]", "toString");
            Spec.eq(list(q.dequeue().enqueue("d")), List.of("b", "c", "d"), "dequeue puis enqueue");
            Spec.raises(NoSuchElementException.class, () -> PQueue.empty().peek(), "peek sur file vide");
            Spec.raises(NoSuchElementException.class, () -> PQueue.empty().dequeue(), "dequeue sur file vide");
            Spec.raises(NullPointerException.class, () -> q.enqueue(null), "enqueue(null)");
            Spec.check((Object) PQueue.<String>empty() == PQueue.<Integer>empty(), "empty() doit renvoyer une instance unique");
            Spec.check(q.dequeue().dequeue().dequeue().isEmpty(), "vidée");
        });

        Spec.test("PQueue : persistance", () -> {
            PQueue<Integer> q1 = PQueue.<Integer>empty().enqueue(1).enqueue(2);
            PQueue<Integer> q2 = q1.dequeue();
            PQueue<Integer> q3 = q1.enqueue(3);
            PQueue<Integer> q4 = q2.enqueue(4);
            Spec.eq(list(q1), List.of(1, 2), "q1 après dequeue et enqueue sur q1");
            Spec.eq(list(q2), List.of(2), "q2");
            Spec.eq(list(q3), List.of(1, 2, 3), "q3");
            Spec.eq(list(q4), List.of(2, 4), "q4");
            Spec.eq(q1.peek(), 1, "q1.peek()");
        });

        Spec.test("égalité indépendante de l'histoire", () -> {
            PQueue<Integer> a = PQueue.<Integer>empty().enqueue(0).enqueue(1).enqueue(2).dequeue().enqueue(3);
            PQueue<Integer> b = PQueue.<Integer>empty().enqueue(1).enqueue(2).enqueue(3);
            PQueue<Integer> c = PQueue.<Integer>empty().enqueue(9).enqueue(1).dequeue().enqueue(2).enqueue(3);
            Spec.eq(a, b, "[1, 2, 3] obtenue par deux chemins");
            Spec.eq(a, c, "[1, 2, 3] obtenue par un troisième chemin");
            Spec.eq(a.hashCode(), List.of(1, 2, 3).hashCode(), "hashCode comme une List");
            Spec.eq(c.hashCode(), b.hashCode(), "hash de deux files égales");
            Spec.check(!a.equals(b.enqueue(4)), "tailles différentes");
            Spec.check(!a.equals(PStack.<Integer>empty().push(3).push(2).push(1)), "une file n'est pas égale à une pile");
            PStack<Integer> s1 = PStack.<Integer>empty().push(1).push(2);
            PStack<Integer> s2 = PStack.<Integer>empty().push(1).push(2);
            Spec.eq(s1, s2, "deux piles construites séparément");
            Spec.eq(s1.hashCode(), List.of(2, 1).hashCode(), "hashCode de pile comme une List");
            Spec.check(!s1.equals(s2.pop().push(3)), "piles différentes");
        });

        Spec.test("performance : 200 000 opérations", () -> {
            long start = System.nanoTime();
            PQueue<Integer> q = PQueue.empty();
            for (int i = 0; i < 200_000; i++) q = q.enqueue(i);
            Spec.eq(q.size(), 200_000, "taille");
            long sum = 0;
            while (!q.isEmpty()) {
                sum += q.peek();
                q = q.dequeue();
            }
            long ms = (System.nanoTime() - start) / 1_000_000;
            Spec.eq(sum, 199_999L * 200_000 / 2, "somme des éléments sortis");
            Spec.check(ms < 1_500, "200 000 enqueue + 200 000 dequeue en " + ms + " ms : une opération ne doit pas copier la file");
        });

        Spec.test("robustesse : grandes collections", () -> {
            PStack<Integer> s = PStack.empty(), t = PStack.empty();
            PQueue<Integer> q = PQueue.empty(), r = PQueue.empty();
            for (int i = 0; i < 300_000; i++) {
                s = s.push(i);
                t = t.push(i);
                q = q.enqueue(i);
                r = r.enqueue(i);
            }
            Spec.check(s.equals(t), "equals de deux piles de 300 000 éléments");
            Spec.eq(s.hashCode(), t.hashCode(), "hashCode de piles de 300 000 éléments");
            Spec.check(s.toString().endsWith(", 1, 0]"), "toString d'une pile de 300 000 éléments");
            Spec.check(!q.equals(r.dequeue().enqueue(0).dequeue().enqueue(0)), "files de même taille, contenus différents");
            Spec.check(q.equals(r), "equals de deux files de 300 000 éléments");
            Spec.eq(list(q).get(299_999), 299_999, "itération d'une file de 300 000 éléments");
        });

        Spec.test("une version partagée entre threads", () -> {
            PQueue<Integer> q = PQueue.empty();
            for (int i = 0; i < 20_000; i++) q = q.enqueue(i);
            PQueue<Integer> shared = q;
            ExecutorService pool = Executors.newFixedThreadPool(4);
            try {
                List<Future<Long>> results = new ArrayList<>();
                for (int t = 0; t < 4; t++) {
                    results.add(pool.submit(() -> {
                        long sum = 0;
                        PQueue<Integer> mine = shared;
                        int expected = 0;
                        while (!mine.isEmpty()) {
                            if (mine.peek() != expected++) return -1L;
                            sum += mine.peek();
                            mine = mine.dequeue();
                        }
                        return sum;
                    }));
                }
                for (Future<Long> f : results) Spec.eq(f.get(), 19_999L * 20_000 / 2, "chaque thread vide sa propre version, dans l'ordre");
            } catch (Exception e) {
                throw new RuntimeException(e);
            } finally {
                pool.shutdownNow();
            }
            Spec.eq(shared.size(), 20_000, "la version partagée après les quatre threads");
        });

        Spec.test("structure immuable", () -> {
            structure(PStack.class);
            structure(PQueue.class);
        });

        Spec.done();
    }
}
