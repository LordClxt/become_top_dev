import java.util.Map;

/** Évaluer, afficher et simplifier des formules. Chaque switch est exhaustif sur Expr : pas de default. */
final class Algebra {
    private Algebra() { throw new AssertionError(); }

    static long eval(Expr e, Map<String, Long> env) {
        return switch (e) {
            case Num(long v) -> v;
            case Var(String name) -> {
                Long v = env.get(name);
                if (v == null) throw new IllegalArgumentException("variable inconnue : " + name);
                yield v;
            }
            case Add(Expr l, Expr r) -> Math.addExact(eval(l, env), eval(r, env));
            case Mul(Expr l, Expr r) -> Math.multiplyExact(eval(l, env), eval(r, env));
            case Neg(Expr x) -> Math.negateExact(eval(x, env));
        };
    }

    static String show(Expr e) {
        return switch (e) {
            case Num(long v) -> Long.toString(v);
            case Var(String name) -> name;
            case Add(Expr l, Expr r) -> "(" + show(l) + " + " + show(r) + ")";
            case Mul(Expr l, Expr r) -> "(" + show(l) + " * " + show(r) + ")";
            case Neg(Expr x) -> "-" + show(x);
        };
    }

    /** Simplifie de bas en haut : les enfants d'abord, puis la première règle qui s'applique au nœud. */
    static Expr simplify(Expr e) {
        return switch (e) {
            case Num _, Var _ -> e;
            case Add(Expr l, Expr r) -> rewrite(new Add(simplify(l), simplify(r)));
            case Mul(Expr l, Expr r) -> rewrite(new Mul(simplify(l), simplify(r)));
            case Neg(Expr x) -> rewrite(new Neg(simplify(x)));
        };
    }

    private static Expr rewrite(Expr e) {
        return switch (e) {
            case Add(Num(long a), Num(long b)) -> new Num(a + b);
            case Mul(Num(long a), Num(long b)) -> new Num(a * b);
            case Add(var x, Num(long z)) when z == 0 -> x;
            case Add(Num(long z), var x) when z == 0 -> x;
            case Mul(var x, Num(long one)) when one == 1 -> x;
            case Mul(Num(long one), var x) when one == 1 -> x;
            case Mul(_, Num(long z)) when z == 0 -> new Num(0);
            case Mul(Num(long z), _) when z == 0 -> new Num(0);
            case Add(var x, Neg(var y)) when x.equals(y) -> new Num(0);
            case Add(Neg(var y), var x) when x.equals(y) -> new Num(0);
            case Neg(Num(long n)) -> new Num(-n);
            case Neg(Neg(var x)) -> x;
            case Num _, Var _, Add _, Mul _, Neg _ -> e;
        };
    }
}
