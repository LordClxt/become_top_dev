import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.SequencedMap;
import java.util.TreeMap;

public class Test {
    static Json num(String s) { return new JNumber(new BigDecimal(s)); }
    static Json str(String s) { return new JString(s); }
    static Json arr(Json... e) { return new JArray(List.of(e)); }
    static Json obj(Object... kv) {
        SequencedMap<String, Json> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], (Json) kv[i + 1]);
        return new JObject(m);
    }

    static void fails(String text, int position) {
        var e = Spec.raises(JsonException.class, () -> Json.parse(text), "parse(" + show(text) + ")");
        if (position >= 0) Spec.eq(e.position(), position, "position de l'erreur pour " + show(text));
    }

    static String show(String s) { return s.length() > 40 ? "\"" + s.substring(0, 40) + "…\"" : "\"" + s.replace("\n", "\\n") + "\""; }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("parse : valeurs simples et espaces", () -> {
            Spec.eq(Json.parse("  null "), new JNull(), "null");
            Spec.eq(Json.parse("true"), new JBool(true), "true");
            Spec.eq(Json.parse("\t\nfalse\r\n"), new JBool(false), "false entouré d'espaces");
            Spec.eq(Json.parse("\"é\\u00e9\\n\\\"\\/\""), str("éé\n\"/"), "échappements");
            Spec.eq(Json.parse("-12.50e+1"), num("-125"), "nombre avec exposant");
            Spec.eq(Json.parse("0"), num("0"), "zéro");
        });

        Spec.test("parse : objets et tableaux imbriqués", () -> {
            var j = Json.parse("""
                    {
                      "client": "ada",
                      "commandes": [
                        {"id": 1, "lignes": [{"sku": "A-1", "qte": 2}, {"sku": "B-7", "qte": 1}]},
                        {"id": 2, "lignes": []}
                      ],
                      "vip": true,
                      "note": null
                    }
                    """);
            var expected = obj("client", str("ada"),
                    "commandes", arr(obj("id", num("1"), "lignes", arr(obj("sku", str("A-1"), "qte", num("2")), obj("sku", str("B-7"), "qte", num("1")))),
                            obj("id", num("2"), "lignes", arr())),
                    "vip", new JBool(true), "note", new JNull());
            Spec.eq(j, expected, "document complet");
            Spec.eq(new ArrayList<>(((JObject) j).members().sequencedKeySet()), List.of("client", "commandes", "vip", "note"), "ordre des clés");
        });

        Spec.test("nombres normalisés", () -> {
            Spec.eq(Json.parse("1.50"), Json.parse("15e-1"), "1.50 et 15e-1");
            Spec.eq(num("2.000"), num("2"), "new JNumber(2.000) et new JNumber(2)");
            Spec.eq(Json.parse("[1.50, 100, -0, 2e3, 1E-2, 0.000]").render(), "[1.5,100,0,2000,0.01,0]", "rendu des nombres");
        });

        Spec.test("parse : erreurs et positions", () -> {
            fails("[1, 2,, 3]", 6);
            fails("{\"a\": 1,}", 8);
            fails("[1 2]", 3);
            fails("\"abc", 4);
            fails("01", 1);
            fails("1.", 2);
            fails(".5", 0);
            fails("-", 1);
            fails("tru", 3);
            fails("nul!", 3);
            fails("{\"a\": 1} x", 9);
            fails("{\"a\": 1, \"a\": 2}", 9);
            fails("\"a\u0001b\"", 2);
            fails("\"\\x\"", 2);
            fails("\"\\u12g4\"", 5);
            fails("{a: 1}", 1);
            fails("", 0);
            fails("[", 1);
        });

        Spec.test("render : compact, ordonné, échappé", () -> {
            Spec.eq(obj("b", num("1"), "a", arr(new JBool(false), new JNull())).render(), "{\"b\":1,\"a\":[false,null]}", "objet");
            Spec.eq(str("ligne 1\nguillemet \" barre \\ tab\t\u0001 é").render(), "\"ligne 1\\nguillemet \\\" barre \\\\ tab\\t\\u0001 é\"", "chaîne");
            Spec.eq(arr().render() + obj().render(), "[]{}", "vides");
            String text = "{\"x\":[1,{\"y\":\"\\u001f\"}],\"z\":-3.25}";
            Spec.eq(Json.parse(text).render(), text, "aller-retour");
        });

        Spec.test("immuabilité en profondeur", () -> {
            var list = new ArrayList<Json>(List.of(num("1")));
            var a = new JArray(list);
            list.add(num("2"));
            Spec.eq(a.elements().size(), 1, "JArray après modification de la liste source");
            Spec.raises(UnsupportedOperationException.class, () -> a.elements().add(num("3")), "JArray.elements().add");
            var map = new LinkedHashMap<String, Json>(Map.of("k", num("1")));
            var o = new JObject(map);
            map.put("z", num("9"));
            Spec.eq(o.members().size(), 1, "JObject après modification de la map source");
            Spec.raises(UnsupportedOperationException.class, () -> o.members().put("y", num("2")), "JObject.members().put");
            Spec.raises(NullPointerException.class, () -> new JArray(java.util.Arrays.asList(num("1"), null)), "élément null");
            Spec.raises(NullPointerException.class, () -> new JString(null), "JString(null)");
            Spec.eq(obj("a", num("1"), "b", num("2")), obj("b", num("2"), "a", num("1")), "equals d'objets indépendant de l'ordre");
        });

        Spec.test("at : navigation", () -> {
            var j = Json.parse("{\"commandes\":[{\"lignes\":[{\"sku\":\"A\"},{\"sku\":\"B\"}]}],\"m\":[[1,2],[3]]}");
            Spec.eq(j.at("commandes[0].lignes[1].sku"), Optional.of(str("B")), "commandes[0].lignes[1].sku");
            Spec.eq(j.at("m[1][0]"), Optional.of(num("3")), "m[1][0]");
            Spec.eq(j.at(""), Optional.of(j), "chemin vide");
            Spec.eq(j.at("commandes[3]"), Optional.empty(), "indice hors limites");
            Spec.eq(j.at("commandes.lignes"), Optional.empty(), "clé sur un tableau");
            Spec.eq(j.at("m[0].x"), Optional.empty(), "clé sur un tableau imbriqué");
            Spec.eq(j.at("absent.x"), Optional.empty(), "clé absente");
            Spec.eq(Json.parse("[[\"x\"]]").at("[0][0]"), Optional.of(str("x")), "chemin qui commence par un indice");
            for (String bad : List.of("a..b", "a[x]", "a[", ".a", "a.", "a[-1]", "a[01]")) {
                Spec.raises(IllegalArgumentException.class, () -> j.at(bad), "chemin mal formé « " + bad + " »");
            }
        });

        Spec.test("from : objets Java", () -> {
            var map = new LinkedHashMap<String, Object>();
            map.put("nom", "ada");
            map.put("age", 36);
            map.put("solde", new BigDecimal("12.30"));
            map.put("tags", List.of("x", 2L, true));
            map.put("rien", null);
            map.put("ratio", 0.25);
            map.put("big", BigInteger.TEN.pow(30));
            Json j = Json.from(map);
            Spec.eq(j.render(), "{\"nom\":\"ada\",\"age\":36,\"solde\":12.3,\"tags\":[\"x\",2,true],\"rien\":null,\"ratio\":0.25,\"big\":1000000000000000000000000000000}", "rendu");
            Spec.eq(Json.from(str("déjà")), str("déjà"), "un Json tel quel");
            Spec.eq(Json.from(new TreeMap<>(Map.of("b", 1, "a", 2))).render(), "{\"a\":2,\"b\":1}", "ordre d'itération de la map");
            Spec.raises(IllegalArgumentException.class, () -> Json.from(Double.NaN), "NaN");
            Spec.raises(IllegalArgumentException.class, () -> Json.from(Map.of(1, "x")), "clé non String");
            var e = Spec.raises(IllegalArgumentException.class, () -> Json.from(new StringBuilder("x")), "type inconnu");
            Spec.check(String.valueOf(e.getMessage()).contains("StringBuilder"), "le message doit nommer la classe : " + e.getMessage());
        });

        Spec.test("robustesse : profondeur et volume", () -> {
            long start = System.nanoTime();
            String deep = "[".repeat(1_000) + "]".repeat(1_000);
            Spec.eq(Json.parse(deep).render(), deep, "1 000 tableaux imbriqués");
            String longString = "\"" + "a\\n".repeat(50_000) + "\"";
            Spec.eq(Json.parse(longString).render(), longString, "chaîne de 100 000 caractères");
            String big = "[" + "1,".repeat(99_999) + "1]";
            Spec.eq(((JArray) Json.parse(big)).elements().size(), 100_000, "tableau de 100 000 éléments");
            long ms = (System.nanoTime() - start) / 1_000_000;
            Spec.check(ms < 1_000, "robustesse : " + ms + " ms (attendu < 1 s) — attention aux concaténations dans les boucles");
        });

        Spec.test("le modèle est bien scellé", () -> {
            Spec.check(Json.class.isSealed() && Json.class.getPermittedSubclasses().length == 6, "Json doit rester une interface scellée à six variantes");
            for (var c : Json.class.getPermittedSubclasses()) Spec.check(c.isRecord(), c.getSimpleName() + " doit être un record");
        });

        Spec.done();
    }
}
