/** Une fraction exacte, immuable, toujours réduite et de dénominateur positif. */
public final class Fraction {
    public static final Fraction ZERO = new Fraction(0, 1);
    public static final Fraction ONE = new Fraction(1, 1);

    private final long num;
    private final long den;

    private Fraction(long num, long den) {   // jamais appelé avec une forme non canonique
        this.num = num;
        this.den = den;
    }

    public static Fraction valueOf(long num, long den) {
        if (den == 0) throw new ArithmeticException("dénominateur nul");
        if (den < 0) {
            num = -num;
            den = -den;
        }
        long g = gcd(num, den);
        num /= g;
        den /= g;
        if (den == 1 && num == 0) return ZERO;
        if (den == 1 && num == 1) return ONE;
        return new Fraction(num, den);
    }

    public static Fraction valueOf(long n) {
        return valueOf(n, 1);
    }

    private static long gcd(long a, long b) {
        return b == 0 ? Math.abs(a) : gcd(b, a % b);
    }

    public long numerator() { return num; }

    public long denominator() { return den; }

    public Fraction plus(Fraction o) {
        return valueOf(num * o.den + o.num * den, den * o.den);
    }

    public Fraction minus(Fraction o) {
        return valueOf(num * o.den - o.num * den, den * o.den);
    }

    public Fraction times(Fraction o) {
        return valueOf(num * o.num, den * o.den);
    }

    public Fraction dividedBy(Fraction o) {
        if (o.num == 0) throw new ArithmeticException("division par zéro");
        return valueOf(num * o.den, den * o.num);
    }

    @Override
    public boolean equals(Object o) {
        return o == this || (o instanceof Fraction f && f.num == num && f.den == den);
    }

    @Override
    public int hashCode() {
        return 31 * Long.hashCode(num) + Long.hashCode(den);
    }

    @Override
    public String toString() {
        return den == 1 ? Long.toString(num) : num + "/" + den;
    }
}
