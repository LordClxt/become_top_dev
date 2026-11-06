/** Une fraction num/den. Écrite « à la BigInteger » : les opérations modifient this. TODO : la rendre immuable. */
public class Fraction {
    public static final Fraction ZERO = new Fraction(0, 1);
    public static final Fraction ONE = new Fraction(1, 1);

    long num;
    long den;

    public Fraction(long num, long den) {
        this.num = num;
        this.den = den;
    }

    public static Fraction valueOf(long num, long den) {
        return new Fraction(num, den);
    }

    public static Fraction valueOf(long n) {
        return new Fraction(n, 1);
    }

    public long numerator() { return num; }

    public long denominator() { return den; }

    public Fraction plus(Fraction o) {
        num = num * o.den + o.num * den;
        den = den * o.den;
        return this;
    }

    public Fraction minus(Fraction o) {
        num = num * o.den - o.num * den;
        den = den * o.den;
        return this;
    }

    public Fraction times(Fraction o) {
        num *= o.num;
        den *= o.den;
        return this;
    }

    public Fraction dividedBy(Fraction o) {
        num *= o.den;
        den *= o.num;
        return this;
    }

    @Override
    public String toString() {
        return num + "/" + den;
    }
}
