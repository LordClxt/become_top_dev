import java.util.Map;

/** Évaluer, afficher et simplifier des formules. */
final class Algebra {
    private Algebra() { throw new AssertionError(); }

    static long eval(Expr e, Map<String, Long> env) {
        if (e instanceof Num) {
            return ((Num) e).value();
        } else if (e instanceof Var) {
            return env.get(((Var) e).name());
        } else if (e instanceof Add) {
            Add a = (Add) e;
            return eval(a.left(), env) + eval(a.right(), env);
        } else if (e instanceof Mul) {
            Mul m = (Mul) e;
            return eval(m.left(), env) * eval(m.right(), env);
        }
        throw new IllegalStateException("nœud inconnu : " + e);
    }

    static String show(Expr e) {
        // TODO
        throw new UnsupportedOperationException("show");
    }

    static Expr simplify(Expr e) {
        // TODO
        throw new UnsupportedOperationException("simplify");
    }
}
