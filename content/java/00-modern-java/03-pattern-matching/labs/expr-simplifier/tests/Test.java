import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

public class Test {
    static Num n(long v) { return new Num(v); }
    static Var v(String s) { return new Var(s); }
    static Add add(Expr a, Expr b) { return new Add(a, b); }
    static Mul mul(Expr a, Expr b) { return new Mul(a, b); }
    static Neg neg(Expr a) { return new Neg(a); }

    static void simp(Expr in, Expr expected) {
        Expr got = Algebra.simplify(in);
        Spec.check(got.equals(expected), "simplify(" + in + ")\n  obtenu  " + got + "\n  attendu " + expected);
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("eval", () -> {
            var env = Map.of("prix", 1250L, "qte", 3L, "frais", 490L);
            Spec.eq(Algebra.eval(add(mul(v("prix"), v("qte")), v("frais")), env), 4240L, "prix * qte + frais");
            Spec.eq(Algebra.eval(neg(add(n(2), n(-5))), env), 3L, "-(2 + -5)");
            Spec.eq(Algebra.eval(n(7), Map.of()), 7L, "constante");
        });

        Spec.test("eval : variable inconnue et dépassement", () -> {
            var bad = Spec.raises(IllegalArgumentException.class, () -> Algebra.eval(add(n(1), v("remise")), Map.of()), "variable absente");
            Spec.check(String.valueOf(bad.getMessage()).contains("remise"), "le message doit nommer la variable inconnue");
            Spec.raises(ArithmeticException.class, () -> Algebra.eval(mul(n(Long.MAX_VALUE), n(2)), Map.of()), "Long.MAX_VALUE * 2");
            Spec.raises(ArithmeticException.class, () -> Algebra.eval(add(n(Long.MAX_VALUE), n(1)), Map.of()), "Long.MAX_VALUE + 1");
            Spec.raises(ArithmeticException.class, () -> Algebra.eval(neg(n(Long.MIN_VALUE)), Map.of()), "-Long.MIN_VALUE");
        });

        Spec.test("show", () -> {
            Spec.eq(Algebra.show(neg(add(v("x"), n(2)))), "-(x + 2)", "show");
            Spec.eq(Algebra.show(mul(add(v("a"), v("b")), n(-3))), "((a + b) * -3)", "show");
            Spec.eq(Algebra.show(v("total")), "total", "show d'une variable");
        });

        Spec.test("simplify : constantes et éléments neutres", () -> {
            simp(add(n(2), n(3)), n(5));
            simp(mul(n(4), n(5)), n(20));
            simp(add(v("x"), n(0)), v("x"));
            simp(add(n(0), v("x")), v("x"));
            simp(mul(v("x"), n(1)), v("x"));
            simp(mul(n(1), v("x")), v("x"));
            simp(mul(v("x"), n(0)), n(0));
            simp(mul(n(0), add(v("x"), v("y"))), n(0));
        });

        Spec.test("simplify : négations et annulations", () -> {
            simp(neg(n(4)), n(-4));
            simp(neg(neg(v("x"))), v("x"));
            simp(add(v("x"), neg(v("x"))), n(0));
            simp(add(neg(mul(v("a"), v("b"))), mul(v("a"), v("b"))), n(0));
            simp(add(v("x"), neg(v("y"))), add(v("x"), neg(v("y"))));
        });

        Spec.test("simplify : de bas en haut", () -> {
            simp(mul(add(v("prix"), n(0)), add(n(1), n(0))), v("prix"));
            simp(add(mul(v("x"), add(n(2), n(-2))), v("y")), v("y"));
            simp(neg(neg(neg(add(n(1), n(1))))), n(-2));
            simp(add(v("x"), v("y")), add(v("x"), v("y")));
            Expr unchanged = mul(v("a"), add(v("b"), n(3)));
            simp(unchanged, unchanged);
        });

        Spec.test("des switch exhaustifs, sans instanceof ni default", () -> {
            String code = Files.readString(Path.of("Algebra.java")).replaceAll("(?s)/\\*.*?\\*/", "").replaceAll("//[^\\n]*", "");
            Spec.check(!code.contains("instanceof"), "plus d'instanceof : utilise des motifs dans un switch");
            Spec.check(!code.matches("(?s).*\\bdefault\\b.*"), "pas de default : le switch doit couvrir chaque variante d'Expr");
            Spec.check(!code.matches("(?s).*\\(\\s*(Num|Var|Add|Mul|Neg)\\s*\\)\\s*\\w.*"), "plus de cast : un motif de record extrait les composants");
            Spec.check(code.contains("switch"), "utilise des switch à motifs");
        });

        Spec.done();
    }
}
