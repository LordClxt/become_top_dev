import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class Test {
    static final String RULES = """
            # barème 2026
            tier 0-500 490
            tier 501-2000 790
            tier 2001-30000 1590

            surcharge EU 300
            surcharge WORLD 1200
            fragile 250
            discount 10 from 3
            """;

    static Parcel p(String id, int g, Zone z, boolean fragile) { return new Parcel(id, g, z, fragile); }

    static void rejects(String rules, List<Parcel> parcels, String messagePart, String what) {
        var e = Spec.raises(IllegalArgumentException.class, () -> Shipping.quote(rules, parcels), what);
        Spec.check(String.valueOf(e.getMessage()).contains(messagePart), what + " : le message « " + e.getMessage() + " » devrait contenir « " + messagePart + " »");
    }

    public static void main(String[] args) {
        Spec.only(args);
        var one = List.of(p("A", 300, Zone.FR, false));

        Spec.test("un colis simple", () -> {
            var q = Shipping.quote(RULES, one);
            Spec.eq(q.perParcel(), Map.of("A", 490L), "perParcel");
            Spec.eq(q.discount(), 0L, "discount");
            Spec.eq(q.total(), 490L, "total");
        });

        Spec.test("suppléments, ordre des colis et remise", () -> {
            var q = Shipping.quote(RULES, List.of(
                    p("Z", 1_200, Zone.EU, true),       // 790 + 300 + 250 = 1340
                    p("B", 500, Zone.WORLD, false),     // 490 + 1200 = 1690
                    p("M", 2_001, Zone.FR, true)));     // 1590 + 250 = 1840
            Spec.eq(new ArrayList<>(q.perParcel().sequencedKeySet()), List.of("Z", "B", "M"), "ordre des colis");
            Spec.eq(new ArrayList<>(q.perParcel().sequencedValues()), List.of(1_340L, 1_690L, 1_840L), "prix par colis");
            Spec.eq(q.discount(), 487L, "remise de 10 % sur 4 870 (division entière)");
            Spec.eq(q.total(), 4_383L, "total");
            Spec.raises(UnsupportedOperationException.class, () -> q.perParcel().put("X", 1L), "perParcel modifiable");
        });

        Spec.test("sans fragile ni remise dans les règles", () -> {
            var q = Shipping.quote("tier 1-1000 500\nsurcharge FR 0\n", List.of(p("A", 1, Zone.FR, true), p("B", 1000, Zone.EU, true), p("C", 999, Zone.WORLD, false)));
            Spec.eq(q.total(), 1_500L, "total sans supplément fragile ni remise");
        });

        Spec.test("erreurs de configuration, avec le numéro de ligne", () -> {
            rejects("tier 0-500 490\ntaxe 3\n", one, "ligne 2", "mot-clé inconnu");
            rejects("tier 0-500\n", one, "ligne 1", "palier sans prix");
            rejects("\n\ntier 0-5x0 490\n", one, "ligne 3", "nombre illisible");
            rejects("tier 0-500 -1\n", one, "ligne 1", "prix négatif");
            rejects("tier 0-500 490\n# commentaire\ntier 400-900 790\n", one, "ligne 3", "paliers qui se chevauchent");
            rejects("tier 0-500 490\nsurcharge MARS 10\n", one, "ligne 2", "zone inconnue");
            rejects("tier 0-500 490\nsurcharge EU 10\nsurcharge EU 20\n", one, "ligne 3", "deux suppléments pour la même zone");
            rejects("tier 0-500 490\nfragile 1\nfragile 2\n", one, "ligne 3", "deux suppléments fragile");
            rejects("tier 0-500 490\ndiscount 120 from 2\n", one, "ligne 2", "pourcentage > 100");
            rejects("tier 0-500 490\ndiscount 10 at 2\n", one, "ligne 2", "remise mal écrite");
            rejects("tier 0-500 490\ndiscount 5 from 2\ndiscount 10 from 3\n", one, "ligne 3", "deux remises");
        });

        Spec.test("erreurs sur les colis", () -> {
            rejects(RULES, List.of(p("A", 300, Zone.FR, false), p("LOURD", 31_000, Zone.FR, false)), "LOURD", "poids sans palier");
            rejects(RULES, List.of(p("A", 300, Zone.FR, false), p("A", 400, Zone.EU, false)), "A", "identifiant en double");
        });

        Spec.test("espaces superflus tolérés", () -> {
            var q = Shipping.quote("   tier   0-500    490  \n\tfragile 10\n", List.of(p("A", 10, Zone.FR, true)));
            Spec.eq(q.total(), 500L, "total");
        });

        Spec.done();
    }
}
