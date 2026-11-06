import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

public class Test {
    static Trade t(String s, long qty, long price) { return new Trade(s, qty, price); }

    public static void main(String[] args) {
        Spec.only(args);
        var a = t("AIR", 10, 100);   // 1 000
        var b = t("BNP", 2, 300);    //   600
        var c = t("CAP", 1, 500);    //   500
        var d = t("DSY", 4, 1_000);  // 4 000
        var e = t("ENG", 3, 100);    //   300

        Spec.test("byNotional : paquets consécutifs sous la limite", () -> {
            List<List<Trade>> got = Stream.of(a, b, c, d, e).gather(Batching.byNotional(2_000)).toList();
            Spec.eq(got, List.of(List.of(a, b), List.of(c), List.of(d), List.of(e)), "paquets pour une limite de 2 000");
            Spec.eq(Stream.of(a, b, c).gather(Batching.byNotional(2_100)).toList(), List.of(List.of(a, b, c)), "limite atteinte exactement");
            Spec.eq(Stream.<Trade>empty().gather(Batching.byNotional(1_000)).toList(), List.of(), "flux vide");
        });

        Spec.test("byNotional : paquets non modifiables, limite validée", () -> {
            var batch = Stream.of(a, b).gather(Batching.byNotional(5_000)).toList().getFirst();
            Spec.raises(UnsupportedOperationException.class, () -> batch.add(c), "ajout dans un paquet émis");
            Spec.raises(IllegalArgumentException.class, () -> Batching.byNotional(0), "limite nulle");
        });

        Spec.test("byNotional : un gatherer réutilisable", () -> {
            var g = Batching.byNotional(1_500);
            var first = Stream.of(a, b, c).gather(g).toList();
            var second = Stream.of(e, e).gather(g).toList();
            Spec.eq(first, List.of(List.of(a), List.of(b, c)), "premier stream");
            Spec.eq(second, List.of(List.of(e, e)), "second stream avec le même gatherer (l'état ne doit pas fuir d'un stream à l'autre)");
        });

        Spec.test("untilExposure : s'arrête au plafond", () -> {
            Spec.eq(Stream.of(a, b, c, e).gather(Batching.untilExposure(2_000)).toList(), List.of(a, b), "plafond de 2 000");
            Spec.eq(Stream.of(a, b).gather(Batching.untilExposure(1_600)).toList(), List.of(a, b), "plafond atteint exactement");
            Spec.eq(Stream.of(d, a).gather(Batching.untilExposure(3_000)).toList(), List.of(), "la première dépasse déjà");
        });

        Spec.test("untilExposure : ne lit plus la source après l'arrêt", () -> {
            var pulled = new AtomicInteger();
            var got = Stream.generate(() -> { pulled.incrementAndGet(); return e; }).limit(1_000)
                    .gather(Batching.untilExposure(1_000)).toList();
            Spec.eq(got.size(), 3, "transactions de 300 sous un plafond de 1 000");
            Spec.eq(pulled.get(), 4, "éléments lus dans la source : l'intégrateur doit renvoyer false pour arrêter le stream");
        });

        Spec.test("movingAverages", () -> {
            Spec.eq(Batching.movingAverages(List.of(10L, 20L, 30L, 40L), 2), List.of(15L, 25L, 35L), "fenêtre de 2");
            Spec.eq(Batching.movingAverages(List.of(10L, 20L, 31L), 3), List.of(20L), "fenêtre de 3 (division entière)");
            Spec.eq(Batching.movingAverages(List.of(10L, 20L), 3), List.of(), "moins de prix que la fenêtre");
            Spec.raises(IllegalArgumentException.class, () -> Batching.movingAverages(List.of(1L), 0), "fenêtre nulle");
            Spec.raises(UnsupportedOperationException.class, () -> Batching.movingAverages(List.of(1L, 2L), 1).add(3L), "résultat modifiable");
        });

        Spec.test("runningExposure", () -> {
            Spec.eq(Batching.runningExposure(List.of(a, b, c)), List.of(1_000L, 1_600L, 2_100L), "notionnel cumulé");
            Spec.eq(Batching.runningExposure(List.of()), List.of(), "aucune transaction");
            Spec.raises(UnsupportedOperationException.class, () -> Batching.runningExposure(List.of(a)).add(1L), "résultat modifiable");
        });

        Spec.done();
    }
}
