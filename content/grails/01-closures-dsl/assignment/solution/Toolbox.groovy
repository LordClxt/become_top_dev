class Toolbox {

    static Object retry(int times, Closure c) {
        if (times < 1) throw new IllegalArgumentException("times doit être >= 1, reçu $times")
        Throwable last = null
        for (int attempt in 1..times) {
            try {
                return c(attempt)
            } catch (Exception e) {
                last = e
            }
        }
        throw last
    }

    static Map timed(Closure c) {
        long start = System.nanoTime()
        def result = c()
        [result: result, millis: (System.nanoTime() - start).intdiv(1_000_000)]
    }

    static Closure once(Closure c) {
        boolean done = false
        def value = null
        return { Object... args ->
            if (!done) {
                value = c(*args)
                done = true
            }
            value
        }
    }

    static Map groupCount(Iterable items, Closure key) {
        Map counts = [:]
        for (item in items) {
            def k = key(item)
            counts[k] = counts.get(k, 0) + 1
        }
        counts
    }
}
