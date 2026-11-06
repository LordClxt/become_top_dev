/** Formule tarifaire, sous forme d'arbre. NE PAS MODIFIER. */
sealed interface Expr permits Num, Var, Add, Mul, Neg { }

record Num(long value) implements Expr { }

record Var(String name) implements Expr { }

record Add(Expr left, Expr right) implements Expr { }

record Mul(Expr left, Expr right) implements Expr { }

record Neg(Expr operand) implements Expr { }
