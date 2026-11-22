import java.util.Arrays;

public class Test {
    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("forfait et pourcentage", () -> {
            Spec.eq(Fee.flat(500).on(2_000_000), 500L, "forfait de 5 € sur 20 000 €");
            Spec.eq(Fee.percent(25).on(2_000_000), 5_000L, "25 pb sur 20 000 €");
        });

        Spec.test("paliers : sous le seuil, au seuil, au-delà", () -> {
            Fee fee = Fee.tiered(1_000_000, 30, 10);
            Spec.eq(fee.on(500_000), 1_500L, "30 pb sur 5 000 €");
            Spec.eq(fee.on(1_000_000), 3_000L, "30 pb sur 10 000 € (seuil inclus)");
            Spec.eq(fee.on(2_000_000), 4_000L, "30 pb sur 10 000 € puis 10 pb sur 10 000 €");
        });

        Spec.test("chaque sorte valide ses données", () -> {
            Spec.raises(IllegalArgumentException.class, () -> Fee.flat(-1), "forfait négatif");
            Spec.raises(IllegalArgumentException.class, () -> Fee.percent(-5), "pourcentage négatif");
            Spec.raises(IllegalArgumentException.class, () -> Fee.percent(10_001), "plus de 100 %");
            Spec.raises(IllegalArgumentException.class, () -> Fee.tiered(0, 30, 10), "seuil nul");
            Spec.raises(IllegalArgumentException.class, () -> Fee.tiered(1_000, 30, 20_000), "taux au-delà hors bornes");
        });

        Spec.test("deux frais identiques sont égaux", () -> {
            Spec.eq(Fee.flat(500), Fee.flat(500), "flat(500)");
            Spec.eq(Fee.tiered(1_000, 30, 10), Fee.tiered(1_000, 30, 10), "tiered(1000, 30, 10)");
            Spec.check(!Fee.flat(500).equals(Fee.percent(500)), "un forfait n'est pas égal à un pourcentage");
        });

        Spec.test("Fee est une interface scellée, une sorte = un record", () -> {
            Spec.check(Fee.class.isInterface(), "Fee doit être une interface");
            Spec.check(Fee.class.isSealed(), "Fee doit être scellée : les sortes sont décidées par Ordo");
            Class<?>[] kinds = Fee.class.getPermittedSubclasses();
            Spec.eq(kinds.length, 3, "nombre de sortes autorisées");
            Spec.check(Arrays.stream(kinds).allMatch(Class::isRecord),
                    "chaque sorte doit être un record (ses seuls champs, final, equals et hashCode)");
        });

        Spec.done();
    }
}
