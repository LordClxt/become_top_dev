import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.TreeSet;

public class Test {
    static GeoPoint p(double lat, double lon) { return GeoPoint.of(lat, lon); }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("fabrique : validation", () -> {
            Spec.check(Arrays.stream(GeoPoint.class.getConstructors()).findAny().isEmpty(), "GeoPoint a un constructeur public : passe par of(…)");
            Spec.raises(IllegalArgumentException.class, () -> p(90.5, 0), "latitude 90.5");
            Spec.raises(IllegalArgumentException.class, () -> p(-91, 0), "latitude -91");
            Spec.raises(IllegalArgumentException.class, () -> p(Double.NaN, 0), "latitude NaN");
            Spec.raises(IllegalArgumentException.class, () -> p(0, Double.POSITIVE_INFINITY), "longitude infinie");
            Spec.eq(p(48.8566, 2.3522).latitude(), 48.8566, "latitude()");
            Spec.eq(p(48.8566, 2.3522).longitude(), 2.3522, "longitude()");
        });

        Spec.test("forme canonique : longitude", () -> {
            Spec.eq(p(10, 180).longitude(), -180.0, "longitude 180");
            Spec.eq(p(10, 190).longitude(), -170.0, "longitude 190");
            Spec.eq(p(10, -540).longitude(), -180.0, "longitude -540");
            Spec.eq(p(10, 359.5).longitude(), -0.5, "longitude 359.5");
            Spec.eq(p(10, 180), p(10, -180), "180 et -180 sont le même méridien");
        });

        Spec.test("forme canonique : pôles, zéro négatif, arrondi", () -> {
            Spec.eq(p(90, 45), p(90, -120), "pôle Nord : la longitude ne compte pas");
            Spec.eq(p(-90, 10).longitude(), 0.0, "longitude au pôle Sud");
            Spec.eq(p(-0.0, -0.0), p(0.0, 0.0), "-0.0 et 0.0");
            Spec.eq(p(48.8566001, 2.3522004), p(48.8566, 2.3522), "même point à 6 décimales");
            Spec.check(!p(48.856601, 2.3522).equals(p(48.8566, 2.3522)), "1 micro-degré d'écart : deux points différents");
        });

        Spec.test("equals et hashCode", () -> {
            var a = p(10, 180);
            var b = p(10.0000001, -180);
            Spec.check(a.equals(b) && b.equals(a), "symétrie");
            Spec.eq(a.hashCode(), b.hashCode(), "hashCode de deux points égaux");
            Spec.check(!a.equals(null) && !a.equals("10.000000,-180.000000"), "equals(null), equals(String)");
            var depots = new HashMap<GeoPoint, String>();
            depots.put(p(45.75, 4.85), "Lyon");
            Spec.eq(depots.get(GeoPoint.parse("45.750000,4.850000")), "Lyon", "Map.get avec un point relu");
        });

        Spec.test("compareTo : ordre et cohérence avec equals", () -> {
            List<GeoPoint> list = new ArrayList<>(List.of(p(10, 5), p(-3, 100), p(10, -5), p(90, 7), p(-90, 0)));
            list.sort(null);
            Spec.eq(list.toString(), "[-90.000000,0.000000, -3.000000,100.000000, 10.000000,-5.000000, 10.000000,5.000000, 90.000000,0.000000]", "tri naturel");
            Random rnd = new Random(7);
            List<GeoPoint> pts = new ArrayList<>();
            for (int i = 0; i < 300; i++) {
                double lat = rnd.nextInt(5) == 0 ? (rnd.nextBoolean() ? 90 : -90) : rnd.nextInt(7) - 3 + rnd.nextInt(3) * 1e-7;
                double lon = new double[] {180, -180, 0.0, -0.0, 540, 1.0000001, 1}[rnd.nextInt(7)];
                pts.add(p(lat, lon));
            }
            Spec.eq(new TreeSet<>(pts).size(), new HashSet<>(pts).size(), "TreeSet et HashSet doivent contenir autant de points");
            for (GeoPoint a : pts.subList(0, 40)) for (GeoPoint b : pts.subList(0, 40)) {
                Spec.check((a.compareTo(b) == 0) == a.equals(b), a + " / " + b + " : compareTo == 0 doit équivaloir à equals");
                Spec.check(Integer.signum(a.compareTo(b)) == -Integer.signum(b.compareTo(a)), "antisymétrie : " + a + " / " + b);
            }
        });

        Spec.test("toString : format spécifié, indépendant de la langue", () -> {
            Locale saved = Locale.getDefault();
            try {
                Locale.setDefault(Locale.FRANCE); // en français, String.format écrirait « 48,856600 »
                Spec.eq(p(48.8566, 2.3522).toString(), "48.856600,2.352200", "Paris");
                Spec.eq(p(-33.8688, 151.2093).toString(), "-33.868800,151.209300", "Sydney");
                Spec.eq(p(0, 180).toString(), "0.000000,-180.000000", "antiméridien");
            } finally {
                Locale.setDefault(saved);
            }
        });

        Spec.test("parse : aller-retour et erreurs", () -> {
            Random rnd = new Random(1);
            for (int i = 0; i < 500; i++) {
                GeoPoint x = p(rnd.nextDouble() * 180 - 90, rnd.nextDouble() * 720 - 360);
                Spec.eq(GeoPoint.parse(x.toString()), x, "parse(toString()) pour " + x);
            }
            Spec.eq(GeoPoint.parse(" 48.8566 , 2.3522 "), p(48.8566, 2.3522), "espaces tolérés");
            for (String bad : List.of("48,8566;2,3522", "abc", "48.8566", "", "1.0,2.0,3.0")) {
                var e = Spec.raises(IllegalArgumentException.class, () -> GeoPoint.parse(bad), "parse(\"" + bad + "\")");
                Spec.check(e.getMessage() != null && e.getMessage().contains("\"" + bad + "\""), "le message doit citer le texte refusé : " + e.getMessage());
            }
        });

        Spec.test("immuable, sans clone", () -> {
            Spec.check(Modifier.isFinal(GeoPoint.class.getModifiers()), "GeoPoint doit être final");
            Spec.check(!Cloneable.class.isAssignableFrom(GeoPoint.class), "une classe immuable ne doit pas être Cloneable");
            Spec.check(Arrays.stream(GeoPoint.class.getDeclaredFields()).filter(f -> !Modifier.isStatic(f.getModifiers()))
                    .allMatch(f -> Modifier.isFinal(f.getModifiers()) && Modifier.isPrivate(f.getModifiers())), "champs d'instance private final");
        });

        Spec.done();
    }
}
