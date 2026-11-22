import java.util.List;
import java.util.NoSuchElementException;

public class Test {
    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("garde les N derniers, du plus ancien au plus récent", () -> {
            RingBuffer<String> rb = new RingBuffer<>(3);
            for (String s : List.of("a", "b", "c", "d", "e")) rb.push(s);
            Spec.eq(rb.size(), 3, "size()");
            Object snap = rb.snapshot();
            Spec.check(snap instanceof List, "snapshot() doit renvoyer une List, pas un tableau");
            Spec.eq(snap, List.of("c", "d", "e"), "snapshot()");
            Spec.eq(rb.poll(), "c", "poll()");
            Spec.eq(rb.snapshot(), List.of("d", "e"), "snapshot() après poll()");
            Spec.raises(IllegalArgumentException.class, () -> new RingBuffer<String>(0), "capacité 0");
        });

        Spec.test("l'instantané est utilisable comme une liste typée, et indépendant", () -> {
            RingBuffer<Integer> rb = new RingBuffer<>(2);
            rb.push(10);
            rb.push(20);
            var snap = rb.snapshot();
            int sum = 0;
            for (Integer n : snap) sum += n;
            Spec.eq(sum, 30, "somme des éléments de l'instantané");
            rb.push(30);
            Object asObject = snap;
            Spec.check(asObject instanceof List, "snapshot() doit renvoyer une List, pas un tableau");
            Spec.eq(snap, List.of(10, 20), "l'instantané ne change pas quand le tampon avance");
        });

        Spec.test("vider le tampon, puis lire : NoSuchElementException", () -> {
            RingBuffer<String> rb = new RingBuffer<>(1);
            rb.push("x");
            Spec.eq(rb.poll(), "x", "poll()");
            Spec.raises(NoSuchElementException.class, rb::poll, "poll() sur un tampon vide");
        });

        Spec.test("un client obtient un tableau typé sans ClassCastException", () -> {
            var r = Javac.client("PriceClient", """
                    class PriceClient {
                        static String[] last(RingBuffer<String> rb) { return rb.snapshot().toArray(new String[0]); }
                    }""");
            Spec.check(r.ok(), "le client doit compiler (snapshot() renvoie une List<E>) :\n" + r.messages());
        });

        Spec.test("le compilateur refuse un élément du mauvais type", () -> {
            var r = Javac.client("WrongClient", """
                    class WrongClient {
                        void f(RingBuffer<String> rb) { rb.push(42); }
                    }""");
            Spec.check(!r.ok(), "RingBuffer<String>.push(42) doit être refusé à la compilation");
        });

        Spec.test("RingBuffer.java : zéro avertissement non supprimé (-Xlint:all -Werror)", () -> {
            var r = Javac.file("RingBuffer.java", "-Xlint:all", "-Werror");
            Spec.check(r.clean(), "avertissements :\n" + r.messages());
        });

        Spec.done();
    }
}
