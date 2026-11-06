import java.util.List;
import java.util.Map;

public class Test {
    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("FrenchPhone : format spécifié", () -> {
            for (String in : List.of("0612345678", "06.12.34.56.78", "06 12 34 56 78", "06-12-34-56-78", "+33 6 12 34 56 78", "+33612345678")) {
                Spec.eq(FrenchPhone.parse(in).toString(), "06 12 34 56 78", "parse(\"" + in + "\").toString()");
            }
            Spec.eq(FrenchPhone.parse("0102030405").toString(), "01 02 03 04 05", "un fixe parisien");
        });

        Spec.test("FrenchPhone : aller-retour", () -> {
            for (String in : List.of("0612345678", "0102030405", "0799887766", "0900000000")) {
                FrenchPhone p = FrenchPhone.parse(in);
                Spec.eq(FrenchPhone.parse(p.toString()), p, "parse(p.toString()) pour " + in);
            }
        });

        Spec.test("FrenchPhone : texte refusé", () -> {
            for (String bad : List.of("12345", "1612345678", "06123456789", "+44 7911 123456", "06 12 34 56 7a", "")) {
                var e = Spec.raises(IllegalArgumentException.class, () -> FrenchPhone.parse(bad), "parse(\"" + bad + "\")");
                Spec.check(e.getMessage() != null && e.getMessage().contains("\"" + bad + "\""),
                        "le message doit citer le texte refusé entre guillemets : " + e.getMessage());
            }
        });

        Spec.test("FrenchPhone : des accesseurs plutôt que du découpage de chaîne", () -> {
            FrenchPhone p = FrenchPhone.parse("+33 7 99 88 77 66");
            Spec.eq(call(p, "digits"), "0799887766", "digits()");
            Spec.eq(call(p, "isMobile"), true, "isMobile() pour un 07");
            Spec.eq(call(FrenchPhone.parse("0102030405"), "isMobile"), false, "isMobile() pour un 01");
        });

        Spec.test("Contact : lisible et sans secret", () -> {
            Contact c = new Contact("Ana Diaz", FrenchPhone.parse("0612345678"), "4271");
            String s = c.toString();
            Spec.check(s.contains("Ana Diaz") && s.contains("06 12 34 56 78"), "toString doit contenir le nom et le numéro formaté : " + s);
            Spec.check(!s.contains("4271"), "toString affiche le code PIN : il finira dans les logs (" + s + ")");
            Spec.check(!s.contains("@"), "toString ressemble encore à celui d'Object : " + s);
        });

        Spec.test("les collections en profitent", () -> {
            Map<String, FrenchPhone> m = Map.of("Jenny", FrenchPhone.parse("0612345678"));
            Spec.eq(m.toString(), "{Jenny=06 12 34 56 78}", "toString d'une Map<String, FrenchPhone>");
        });

        Spec.test("Directory : un résumé", () -> {
            Directory d = new Directory("Paris");
            Spec.eq(d.toString(), "Annuaire Paris (0 contact)", "annuaire vide");
            d.add(new Contact("Ana", FrenchPhone.parse("0612345678"), "1"));
            Spec.eq(d.toString(), "Annuaire Paris (1 contact)", "un contact");
            d.add(new Contact("Bo", FrenchPhone.parse("0712345678"), "2"));
            d.add(new Contact("Cy", FrenchPhone.parse("0112345678"), "3"));
            Spec.eq(d.toString(), "Annuaire Paris (3 contacts)", "trois contacts");
        });

        Spec.done();
    }

    static Object call(Object target, String method) throws Throwable {
        try {
            return target.getClass().getMethod(method).invoke(target);
        } catch (NoSuchMethodException e) {
            throw new Spec.Failure("il manque l'accesseur public " + method + "()");
        } catch (java.lang.reflect.InvocationTargetException e) {
            throw e.getCause();
        }
    }
}
