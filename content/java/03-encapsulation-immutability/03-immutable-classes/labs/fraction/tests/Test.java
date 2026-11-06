import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.HashSet;
import java.util.List;

public class Test {
    static Fraction f(long n, long d) { return Fraction.valueOf(n, d); }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("forme canonique", () -> {
            Spec.eq(f(2, 4).toString(), "1/2", "valueOf(2, 4)");
            Spec.eq(f(2, -4).toString(), "-1/2", "valueOf(2, -4)");
            Spec.eq(f(-3, -9).toString(), "1/3", "valueOf(-3, -9)");
            Spec.eq(f(6, 3).toString(), "2", "valueOf(6, 3)");
            Spec.eq(f(-6, 4).denominator(), 2L, "denominator() de valueOf(-6, 4)");
            Spec.raises(ArithmeticException.class, () -> f(1, 0), "valueOf(1, 0)");
        });

        Spec.test("ZERO et ONE sont partagées", () -> {
            Spec.check(f(0, 7) == Fraction.ZERO, "valueOf(0, 7) doit renvoyer l'instance ZERO");
            Spec.check(f(5, 5) == Fraction.ONE, "valueOf(5, 5) doit renvoyer l'instance ONE");
            Spec.check(Fraction.valueOf(1) == Fraction.ONE, "valueOf(1) doit renvoyer l'instance ONE");
            Spec.eq(Fraction.ZERO.toString(), "0", "ZERO");
        });

        Spec.test("les opérations ne modifient pas leurs opérandes", () -> {
            Fraction half = f(1, 2), third = f(1, 3);
            Spec.eq(half.plus(third).toString(), "5/6", "1/2 + 1/3");
            Spec.eq(half.minus(third).toString(), "1/6", "1/2 - 1/3");
            Spec.eq(half.times(third).toString(), "1/6", "1/2 × 1/3");
            Spec.eq(half.dividedBy(third).toString(), "3/2", "1/2 ÷ 1/3");
            Spec.eq(half.toString(), "1/2", "1/2 après quatre opérations");
            Spec.eq(third.toString(), "1/3", "1/3 après quatre opérations");
            Spec.check(Fraction.ONE.plus(Fraction.ONE) != Fraction.ONE, "ONE + ONE ne doit pas modifier ONE");
            Spec.eq(Fraction.ONE.toString(), "1", "ONE après ONE + ONE");
            Spec.raises(ArithmeticException.class, () -> half.dividedBy(Fraction.ZERO), "1/2 ÷ 0");
        });

        Spec.test("répartir une facture entre trois payeurs", () -> {
            Fraction share = f(1, 3);
            List<Fraction> shares = List.of(share, share, share);   // la même instance, partagée
            Fraction total = Fraction.ZERO;
            for (Fraction s : shares) total = total.plus(s);
            Spec.eq(total, Fraction.ONE, "1/3 + 1/3 + 1/3");
            Spec.eq(share.toString(), "1/3", "chaque part après le calcul du total");
            Spec.eq(Fraction.ZERO.toString(), "0", "ZERO après le calcul");
        });

        Spec.test("equals et hashCode sur la forme canonique", () -> {
            Spec.eq(f(1, 2), f(3, 6), "1/2 et 3/6");
            Spec.eq(f(1, 2).hashCode(), f(-2, -4).hashCode(), "hash de 1/2 et -2/-4");
            Spec.eq(new HashSet<>(List.of(f(1, 2), f(2, 4), f(4, 8))).size(), 1, "HashSet de trois écritures de 1/2");
            Spec.check(!f(1, 2).equals(f(-1, 2)), "1/2 et -1/2 diffèrent");
        });

        Spec.test("structure immuable", () -> {
            Spec.eq(Fraction.class.getConstructors().length, 0, "nombre de constructeurs publics");
            int mods = Fraction.class.getModifiers();
            boolean sealedOff = Modifier.isFinal(mods);
            for (var c : Fraction.class.getDeclaredConstructors()) {
                if (!Modifier.isPrivate(c.getModifiers()) && !sealedOff) {
                    throw new Spec.Failure("Fraction doit être final, ou n'avoir que des constructeurs privés");
                }
            }
            for (Field fl : Fraction.class.getDeclaredFields()) {
                if (Modifier.isStatic(fl.getModifiers())) continue;
                Spec.check(Modifier.isPrivate(fl.getModifiers()) && Modifier.isFinal(fl.getModifiers()),
                        "le champ " + fl.getName() + " doit être private final");
            }
        });

        Spec.done();
    }
}
