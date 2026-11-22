import java.lang.reflect.Modifier;
import java.util.List;

public class Test {
    /** Une alerte écrite par une autre équipe, de la façon la plus ordinaire : champ affecté après super(). */
    static final class SpreadAlert extends Alert {
        private final List<String> watched;

        SpreadAlert(String name, List<String> watched) {
            super(name);
            this.watched = List.copyOf(watched);
        }

        @Override protected String describe() { return "écart sur " + String.join(", ", watched); }

        @Override public boolean triggeredBy(long priceCents) { return false; }
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("construire chaque alerte ne lève aucune exception", () -> {
            Alert.clearJournal();
            new ThresholdAlert("cpu", "acme", 12_500);
            new KeywordAlert("rond");
            new SpreadAlert("écart", List.of("ACME", "BOLT"));
        });

        Spec.test("la construction seule n'écrit rien au journal", () -> {
            Alert.clearJournal();
            new ThresholdAlert("cpu", "acme", 12_500);
            Spec.eq(Alert.journal(), List.of(), "journal après une construction sans arm()");
        });

        Spec.test("arm() inscrit la description complète de chaque alerte", () -> {
            Alert.clearJournal();
            Alert a = new ThresholdAlert("cpu", "acme", 12_500);
            Alert b = new KeywordAlert("rond");
            Alert c = new SpreadAlert("écart", List.of("ACME", "BOLT"));
            a.arm();
            b.arm();
            c.arm();
            Spec.eq(Alert.journal(), List.of(
                    "armée : cpu (ACME ≥ 12500)",
                    "armée : rond (prix rond, motif \\d+0000)",
                    "armée : écart (écart sur ACME, BOLT)"), "journal");
            Spec.check(a.isArmed() && b.isArmed() && c.isArmed(), "les trois alertes doivent être armées");
        });

        Spec.test("armer deux fois n'écrit qu'une ligne", () -> {
            Alert.clearJournal();
            Alert a = new ThresholdAlert("cpu", "acme", 12_500);
            a.arm();
            a.arm();
            Spec.eq(Alert.journal().size(), 1, "lignes au journal après deux arm()");
        });

        Spec.test("les règles se déclenchent comme avant", () -> {
            Spec.check(new ThresholdAlert("cpu", "acme", 12_500).triggeredBy(12_500), "seuil atteint");
            Spec.check(!new ThresholdAlert("cpu", "acme", 12_500).triggeredBy(12_499), "seuil non atteint");
            Spec.check(new KeywordAlert("rond").triggeredBy(30_000), "300,00 € est un prix rond");
            Spec.check(!new KeywordAlert("rond").triggeredBy(30_050), "300,50 € n'est pas un prix rond");
        });

        Spec.test("arm() ne peut pas être redéfinie, ThresholdAlert ne peut pas être étendue", () -> {
            Spec.check(Modifier.isFinal(Alert.class.getMethod("arm").getModifiers()),
                    "arm() écrit au journal en appelant describe() : une sous-classe ne doit pas pouvoir la remplacer");
            Spec.check(Modifier.isFinal(ThresholdAlert.class.getModifiers()),
                    "ThresholdAlert n'est pas conçue pour l'héritage : interdis-le");
        });

        Spec.done();
    }
}
