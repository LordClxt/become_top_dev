import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class Test {
    /** Sous-classe sans composante de valeur : elle compte juste ses instances. */
    static final class CounterPoint extends Point {
        static int created;
        CounterPoint(int x, int y) { super(x, y); created++; }
    }

    static final Set<Point> UNIT_CIRCLE = Set.of(new Point(1, 0), new Point(0, 1), new Point(-1, 0), new Point(0, -1));

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("CaseInsensitiveString : insensible à la casse entre elles", () -> {
            var a = new CaseInsensitiveString("Paris");
            Spec.check(a.equals(new CaseInsensitiveString("PARIS")), "\"Paris\" et \"PARIS\" doivent être égales");
            Spec.check(!a.equals(new CaseInsensitiveString("Lyon")), "\"Paris\" et \"Lyon\" sont différentes");
            Spec.eq(a.toString(), "Paris", "la casse d'origine est conservée par toString");
        });

        Spec.test("CaseInsensitiveString : symétrique face à String", () -> {
            var a = new CaseInsensitiveString("Paris");
            String s = "paris";
            Spec.check(a.equals(s) == s.equals(a), "a.equals(\"paris\") = " + a.equals(s) + " mais \"paris\".equals(a) = " + s.equals(a)
                    + " : String ne connaît pas ta classe, l'égalité ne peut pas être symétrique");
            List<CaseInsensitiveString> list = new ArrayList<>(List.of(a));
            Spec.check(!list.contains(s), "une liste de CaseInsensitiveString ne doit pas « contenir » une String");
        });

        Spec.test("Point : une sous-classe sans valeur reste substituable", () -> {
            Spec.check(!java.lang.reflect.Modifier.isFinal(Point.class.getModifiers()), "Point doit rester extensible");
            Point p = new Point(1, 0);
            Point cp = new CounterPoint(1, 0);
            Spec.check(cp.equals(p) && p.equals(cp), "CounterPoint(1, 0) et Point(1, 0) doivent être égaux dans les deux sens");
            Spec.check(UNIT_CIRCLE.contains(new CounterPoint(0, -1)), "onUnitCircle(CounterPoint(0, -1)) doit être vrai (principe de Liskov)");
            Spec.check(!p.equals(null), "Point.equals(null)");
        });

        Spec.test("ColorPoint : composition plutôt qu'héritage", () -> {
            Spec.check(!Point.class.isAssignableFrom(ColorPoint.class),
                    "ColorPoint étend encore Point : impossible d'ajouter la couleur à equals sans casser symétrie ou transitivité");
            var red = new ColorPoint(1, 2, Color.RED);
            Spec.eq(red.asPoint(), new Point(1, 2), "asPoint()");
            Spec.eq(red.color(), Color.RED, "color()");
            Spec.raises(NullPointerException.class, () -> new ColorPoint(0, 0, null), "ColorPoint(0, 0, null)");
        });

        Spec.test("ColorPoint : symétrique et transitif", () -> {
            var red = new ColorPoint(1, 2, Color.RED);
            var blue = new ColorPoint(1, 2, Color.BLUE);
            Object p = new Point(1, 2);
            Spec.check(red.equals(new ColorPoint(1, 2, Color.RED)), "deux ColorPoint identiques sont égaux");
            Spec.check(!red.equals(blue), "rouge(1,2) ≠ bleu(1,2)");
            Spec.check(!red.equals(p) && !p.equals(red), "un ColorPoint n'est jamais égal à un Point, dans aucun sens");
            Spec.check(!red.equals(new ColorPoint(2, 1, Color.RED)), "positions différentes");
            Spec.eq(new HashSet<>(List.of(red, blue, new ColorPoint(1, 2, Color.RED))).size(), 2, "taille d'un HashSet {rouge, bleu, rouge}");
            Spec.check(red.hashCode() == new ColorPoint(1, 2, Color.RED).hashCode(), "hashCode cohérent avec equals");
        });

        Spec.test("Measurement : redéfinit equals(Object)", () -> {
            Set<Measurement> set = new HashSet<>();
            set.add(new Measurement("T1", 21.5));
            Spec.check(set.contains(new Measurement("T1", 21.5)),
                    "HashSet ne trouve pas une mesure égale : HashSet appelle equals(Object), pas equals(Measurement)");
            Object o = new Measurement("T1", 21.5);
            Spec.check(new Measurement("T1", 21.5).equals(o), "equals appelé avec un Object");
        });

        Spec.test("Measurement : NaN et null", () -> {
            var broken = new Measurement("T2", Double.NaN);
            Spec.check(broken.equals(broken), "une mesure NaN doit être égale à elle-même (réflexivité) : NaN == NaN vaut false");
            List<Measurement> list = new ArrayList<>(List.of(broken));
            Spec.check(list.contains(broken), "list.contains(m) juste après list.add(m)");
            var manual = new Measurement(null, 3.0);
            Spec.check(manual.equals(new Measurement(null, 3.0)), "deux saisies manuelles (sensor null) de même valeur");
            Spec.check(!manual.equals(new Measurement("T1", 3.0)) && !new Measurement("T1", 3.0).equals(manual), "null contre \"T1\"");
            Spec.check(!new Measurement("T1", 0.0).equals(new Measurement("T1", -0.0)), "0.0 et -0.0 sont deux valeurs distinctes pour Double.compare");
            Spec.check(!manual.equals(null), "equals(null)");
        });

        Spec.done();
    }
}
