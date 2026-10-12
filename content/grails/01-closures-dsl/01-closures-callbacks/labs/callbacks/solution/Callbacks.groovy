class Callbacks {

    static List collectAdaptive(Map map, Closure c) {
        boolean wantsEntry = c.maximumNumberOfParameters == 1
        List results = []
        for (entry in map.entrySet()) {
            results << (wantsEntry ? c(entry) : c(entry.key, entry.value))
        }
        results
    }

    static Object withResource(List log, Closure c) {
        log << 'open'
        try {
            return c(log)
        } finally {
            log << 'close'
        }
    }

    static Object firstOver(Iterable items, Number limit) {
        // `for` + `return` quitte la méthode ; avec `each { return x }` on ne quitterait que la closure.
        for (item in items) {
            if (item > limit) return item
        }
        null
    }
}
