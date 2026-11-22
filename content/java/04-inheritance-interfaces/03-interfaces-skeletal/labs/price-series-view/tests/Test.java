import java.util.Collections;
import java.util.List;

public class Test {
    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("la vue contient la série, dans l'ordre", () -> {
            var view = PriceSeries.of(12_500, 12_480, 12_530).asList();
            Spec.eq(view.size(), 3, "size()");
            Spec.eq(view.get(1), 12_480L, "get(1)");
            Spec.check(view.contains(12_530L), "contains(12530)");
            Spec.eq(view.indexOf(12_480L), 1, "indexOf(12480)");
        });

        Spec.test("set écrit dans la série (vue, pas copie)", () -> {
            var series = PriceSeries.of(12_500, 12_480, 12_530);
            var view = series.asList();
            Spec.eq(view.set(1, 99_000L), 12_480L, "set renvoie l'ancienne valeur");
            Spec.eq(series.max(), 99_000L, "max() de la série après set sur la vue");
        });

        Spec.test("deux vues de la même série voient les mêmes changements", () -> {
            var series = PriceSeries.of(3, 1, 2);
            var first = series.asList();
            var second = series.asList();
            Collections.sort(first);
            Spec.eq(second, List.of(1L, 2L, 3L), "seconde vue après le tri de la première");
        });

        Spec.test("une sous-liste est aussi une vue", () -> {
            var series = PriceSeries.of(10, 20, 30, 40);
            series.asList().subList(1, 3).set(0, 25L);
            Spec.eq(series.asList(), List.of(10L, 25L, 30L, 40L), "série après set sur subList(1, 3)");
        });

        Spec.test("égale à une List ordinaire qui a les mêmes éléments", () -> {
            var view = PriceSeries.of(1, 2).asList();
            Spec.check(view.equals(List.of(1L, 2L)), "view.equals(List.of(1, 2))");
            Spec.check(List.of(1L, 2L).equals(view), "List.of(1, 2).equals(view)");
            Spec.eq(view.hashCode(), List.of(1L, 2L).hashCode(), "hashCode()");
        });

        Spec.test("taille fixe : add et remove sont refusés", () -> {
            var view = PriceSeries.of(1, 2).asList();
            Spec.raises(UnsupportedOperationException.class, () -> view.add(3L), "add(3)");
            Spec.raises(UnsupportedOperationException.class, () -> view.remove(0), "remove(0)");
        });

        Spec.test("set(null) est refusé sans rien modifier", () -> {
            var series = PriceSeries.of(5, 6);
            var view = series.asList();
            Spec.raises(NullPointerException.class, () -> view.set(0, null), "set(0, null)");
            Spec.eq(view, List.of(5L, 6L), "série après le set refusé");
        });

        Spec.test("of() copie le tableau reçu", () -> {
            long[] raw = { 1, 2 };
            var series = PriceSeries.of(raw);
            raw[0] = 42;
            Spec.eq(series.asList().get(0), 1L, "série après modification du tableau d'origine");
        });

        Spec.done();
    }
}
