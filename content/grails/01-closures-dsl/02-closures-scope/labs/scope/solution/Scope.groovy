class Scope {

    static Closure accumulator(Number start) {
        def total = start
        return { n -> total += n }
    }

    static Map counters() {
        int count = 0
        [inc: { -> ++count }, value: { -> count }]
    }

    static Object runWith(Object target, Closure c) {
        c.delegate = target
        c.resolveStrategy = Closure.DELEGATE_FIRST
        c()
    }
}
