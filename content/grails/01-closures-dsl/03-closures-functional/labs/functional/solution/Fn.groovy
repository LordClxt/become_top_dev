class Fn {

    static Closure compose(Closure... fs) {
        fs.inject({ x -> x } as Closure) { Closure acc, Closure f -> acc >> f }
    }

    static Closure partial(Closure c, Object... fixed) {
        c.curry(fixed)
    }

    static Closure withLast(Closure c, Object last) {
        c.rcurry(last)
    }

    static Closure cached(Closure f) {
        f.memoize()
    }

    static long sumTo(long n) {
        Closure sum
        sum = { long k, long acc = 0 -> k == 0 ? acc : sum.trampoline(k - 1, acc + k) }
        sum = sum.trampoline()
        sum(n)
    }
}
