import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public class Test {
    static void report(List<Event> day, String expected, String what) {
        String got = Report.daily(day);
        Spec.check(got.equals(expected), what + " : le rapport ne correspond pas au relevé de la banque\n--- obtenu ---\n" + got + "--- relevé ---\n" + expected);
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("journée calme (11 mars)", () -> report(List.of(
                new Sale("V1", 4_500), new Sale("V2", 1_990), new Fee(FeeKind.LATE, "V1"), new Refund("V2", 990)), """
                ventes : 2
                remboursements : 1
                rétrofacturations : 0
                frais : 1
                solde : 52,00 €
                """, "11 mars"));

        Spec.test("journée du 14 mars (écart de 134,00 €)", () -> report(List.of(
                new Sale("V1", 12_000), new Sale("V2", 3_500), new Sale("V3", 8_000), new Sale("V4", 2_000),
                new Chargeback("V3", 8_000), new Fee(FeeKind.CANCELLATION, "V4"), new Refund("V4", 2_000),
                new Fee(FeeKind.CURRENCY, "V2"), new Chargeback("V1", 6_000), new Fee(FeeKind.CANCELLATION, "V1")), """
                ventes : 4
                remboursements : 1
                rétrofacturations : 2
                frais : 3
                solde : 83,50 €
                """, "14 mars"));

        Spec.test("journée d'annulations (15 mars)", () -> report(List.of(
                new Sale("V1", 1_000), new Fee(FeeKind.CANCELLATION, "V1"), new Fee(FeeKind.CANCELLATION, "V1"),
                new Fee(FeeKind.CANCELLATION, "V1")), """
                ventes : 1
                remboursements : 0
                rétrofacturations : 0
                frais : 3
                solde : -5,00 €
                """, "15 mars"));

        Spec.test("la prochaine variante ne passera plus inaperçue", () -> {
            for (String file : List.of("Ledger.java", "Report.java", "FeePolicy.java")) {
                String code = Files.readString(Path.of(file)).replaceAll("(?s)/\\*.*?\\*/", "").replaceAll("//[^\\n]*", "");
                Spec.check(!code.matches("(?s).*\\bdefault\\b.*"),
                        file + " contient encore un default : il absorbera en silence le prochain événement ou le prochain type de frais");
                Spec.check(!code.contains("instanceof"),
                        file + " choisit encore selon le type avec instanceof : une chaîne de if ne sait pas qu'elle a oublié un cas");
                Spec.check(!code.matches("(?s).*case\\s+\\w+\\s*:.*"),
                        file + " contient encore un switch à deux-points : un break oublié et l'exécution tombe dans le case suivant");
            }
        });

        Spec.done();
    }
}
