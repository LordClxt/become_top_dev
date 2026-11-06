import java.math.BigDecimal;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public class Test {
    // --- Classes cassées du module ---
    static final class CaseInsensitiveString {
        final String s;
        CaseInsensitiveString(String s) { this.s = s; }
        @Override public boolean equals(Object o) {
            if (o instanceof CaseInsensitiveString c) return s.equalsIgnoreCase(c.s);
            if (o instanceof String str) return s.equalsIgnoreCase(str);
            return false;
        }
        @Override public int hashCode() { return s.toLowerCase(Locale.ROOT).hashCode(); }
        @Override public String toString() { return "CIS(" + s + ")"; }
    }

    static class Point {
        final int x, y;
        Point(int x, int y) { this.x = x; this.y = y; }
        @Override public boolean equals(Object o) { return o instanceof Point p && p.x == x && p.y == y; }
        @Override public int hashCode() { return 31 * x + y; }
        @Override public String toString() { return "P(" + x + "," + y + ")"; }
    }

    static final class ColorPoint extends Point {
        final String color;
        ColorPoint(int x, int y, String color) { super(x, y); this.color = color; }
        @Override public boolean equals(Object o) {
            if (!(o instanceof Point)) return false;
            if (!(o instanceof ColorPoint)) return o.equals(this);
            return super.equals(o) && ((ColorPoint) o).color.equals(color);
        }
        @Override public String toString() { return color + "(" + x + "," + y + ")"; }
    }

    static final class Measure {
        final double v;
        Measure(double v) { this.v = v; }
        @Override public boolean equals(Object o) { return o instanceof Measure m && m.v == v; }
        @Override public int hashCode() { return Double.hashCode(v); }
        @Override public String toString() { return "M(" + v + ")"; }
    }

    static final class NoHash {
        final int id;
        NoHash(int id) { this.id = id; }
        @Override public boolean equals(Object o) { return o instanceof NoHash h && h.id == id; }
        @Override public String toString() { return "NoHash(" + id + ")"; }
    }

    static final class NullHostile {
        final String name;
        NullHostile(String name) { this.name = name; }
        @Override public boolean equals(Object o) { return o.getClass() == getClass() && ((NullHostile) o).name.equals(name); }
        @Override public int hashCode() { return name.hashCode(); }
    }

    static final class Unstable {
        int calls;
        @Override public int hashCode() { return calls++; }
    }

    static final class CastHappy {
        final int id;
        CastHappy(int id) { this.id = id; }
        @Override public boolean equals(Object o) { return o != null && ((CastHappy) o).id == id; }
        @Override public int hashCode() { return id; }
    }

    record Phone(int area, int line) { }
    record Player(String name, int score) { }

    static Set<Kind> kinds(Kind... k) { return k.length == 0 ? EnumSet.noneOf(Kind.class) : EnumSet.of(k[0], k); }

    static void expect(Report r, Set<Kind> expected, String what) {
        Spec.eq(Set.copyOf(r.kinds()), Set.copyOf(expected), what);
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("classes correctes : rapport propre", () -> {
            Report r = Contracts.checkEquals(List.of(new Phone(1, 2), new Phone(1, 2), new Phone(2, 1), "x", 42, new Point(0, 0)));
            expect(r, kinds(), "checkEquals sur des records, String, Integer et Point");
            Spec.check(r.isClean(), "isClean()");
            Spec.eq(r.explain(Kind.SYMMETRY), null, "explain d'un type absent");
            expect(Contracts.checkComparable(List.of(3, -1, 0, 3, Integer.MAX_VALUE, Integer.MIN_VALUE)), kinds(), "checkComparable sur des Integer");
            expect(Contracts.checkEquals(List.of()), kinds(), "liste vide");
        });

        Spec.test("symétrie : CaseInsensitiveString contre String", () -> {
            Report r = Contracts.checkEquals(List.of(new CaseInsensitiveString("Paris"), "paris"));
            expect(r, kinds(Kind.SYMMETRY), "types trouvés");
            String why = r.explain(Kind.SYMMETRY);
            Spec.check(why != null && why.contains("CIS(Paris)") && why.contains("paris"), "explain(SYMMETRY) doit citer les deux objets : " + why);
        });

        Spec.test("transitivité : ColorPoint « sans couleur »", () -> {
            Report r = Contracts.checkEquals(List.of(new ColorPoint(1, 2, "rouge"), new Point(1, 2), new ColorPoint(1, 2, "bleu")));
            expect(r, kinds(Kind.TRANSITIVITY), "types trouvés");
        });

        Spec.test("réflexivité : un double comparé avec ==", () -> {
            expect(Contracts.checkEquals(List.of(new Measure(Double.NaN), new Measure(1.5))), kinds(Kind.REFLEXIVITY), "types trouvés");
        });

        Spec.test("hashCode oublié", () -> {
            Report r = Contracts.checkEquals(List.of(new NoHash(7), new NoHash(7), new NoHash(8)));
            expect(r, kinds(Kind.HASH_CODE), "types trouvés");
            Spec.check(r.explain(Kind.HASH_CODE).contains("NoHash(7)"), "explain(HASH_CODE) : " + r.explain(Kind.HASH_CODE));
        });

        Spec.test("non-nullité et exceptions", () -> {
            expect(Contracts.checkEquals(List.of(new NullHostile("a"), new NullHostile("a"))), kinds(Kind.NON_NULLITY), "equals(null) qui lève");
            expect(Contracts.checkEquals(List.of(new CastHappy(1), "texte")), kinds(Kind.EXCEPTION),
                    "un equals qui caste sans instanceof (ClassCastException face à une String)");
        });

        Spec.test("cohérence : un hashCode qui change", () -> {
            expect(Contracts.checkEquals(List.of(new Unstable(), new Unstable())), kinds(Kind.CONSISTENCY), "types trouvés");
        });

        Spec.test("comparateur par différence", () -> {
            Comparator<Integer> diff = (a, b) -> a - b;
            Report r = Contracts.checkComparator(List.of(Integer.MAX_VALUE, -1, Integer.MIN_VALUE), diff);
            expect(r, kinds(Kind.SIGN, Kind.COMPARE_TRANSITIVITY), "types trouvés");
            Spec.check(r.explain(Kind.SIGN).contains("2147483647"), "explain(SIGN) doit citer les valeurs : " + r.explain(Kind.SIGN));
            expect(Contracts.checkComparator(List.of(5, -3, 0, 12), diff), kinds(), "sans débordement, la différence ne viole rien (c'est pour ça qu'elle passe les tests)");
        });

        Spec.test("ordre incohérent avec equals", () -> {
            expect(Contracts.checkComparable(List.of(new BigDecimal("1.0"), new BigDecimal("1.00"), new BigDecimal("2"))),
                    kinds(Kind.INCONSISTENT_WITH_EQUALS), "BigDecimal");
            expect(Contracts.checkComparator(List.of(new Player("ana", 10), new Player("bo", 10), new Player("cy", 3)),
                    Comparator.comparingInt(Player::score)), kinds(Kind.INCONSISTENT_WITH_EQUALS), "comparateur sans départage");
        });

        Spec.test("substitution : un « à peu près égal »", () -> {
            Comparator<Integer> fuzzy = (a, b) -> Math.abs(a - b) <= 1 ? 0 : Integer.compare(a, b);
            expect(Contracts.checkComparator(List.of(0, 1, 2), fuzzy), kinds(Kind.COMPARE_SUBSTITUTION, Kind.INCONSISTENT_WITH_EQUALS), "types trouvés");
        });

        Spec.test("un comparateur qui lève n'arrête pas la vérification", () -> {
            Comparator<String> picky = (a, b) -> {
                if (a.isEmpty() || b.isEmpty()) throw new IllegalArgumentException("vide");
                return a.compareTo(b);
            };
            Report r = Contracts.checkComparator(List.of("b", "", "a"), picky);
            expect(r, kinds(Kind.EXCEPTION), "types trouvés");
            Spec.check(r.explain(Kind.EXCEPTION).contains("vide"), "explain(EXCEPTION) doit citer l'exception : " + r.explain(Kind.EXCEPTION));
        });

        Spec.test("Report : un objet valeur lisible", () -> {
            Report a = Contracts.checkEquals(List.of(new CaseInsensitiveString("Paris"), "paris"));
            Report b = Contracts.checkEquals(List.of(new CaseInsensitiveString("Paris"), "paris"));
            Spec.eq(a, b, "deux rapports identiques");
            Spec.eq(a.hashCode(), b.hashCode(), "leurs hash");
            Spec.eq(a.toString(), "Report[SYMMETRY]", "toString");
            Spec.eq(Contracts.checkEquals(List.of(1)).toString(), "Report[propre]", "toString d'un rapport propre");
            Spec.raises(UnsupportedOperationException.class, () -> a.kinds().add(Kind.SIGN), "kinds() non modifiable");
            Spec.raises(NullPointerException.class, () -> Contracts.checkEquals(java.util.Arrays.asList("a", null)), "échantillon null");
            Spec.eq(List.copyOf(Contracts.checkComparator(List.of(Integer.MAX_VALUE, -1, Integer.MIN_VALUE), (x, y) -> x - y).kinds()),
                    List.of(Kind.SIGN, Kind.COMPARE_TRANSITIVITY), "kinds() dans l'ordre de l'enum");
        });

        Spec.done();
    }
}
