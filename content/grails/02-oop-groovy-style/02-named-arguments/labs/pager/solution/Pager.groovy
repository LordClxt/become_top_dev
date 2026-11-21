class Pager {
    static final Map DEFAULTS = [max: 10, offset: 0, order: 'asc']
    private static final Set<String> KEYS = ['max', 'offset', 'sort', 'order'] as Set

    static Map page(Map opts = [:], List items) {
        def unknown = opts.keySet() - KEYS
        if (unknown) {
            throw new IllegalArgumentException("options inconnues : ${unknown.sort()} (admises : ${KEYS.sort()})")
        }
        int max = Math.min(Math.max(toInt(opts.max, 10), 1), 100)
        int offset = Math.max(toInt(opts.offset, 0), 0)
        boolean desc = opts.order?.toString()?.equalsIgnoreCase('desc')

        List sorted = items
        if (opts.sort) {
            String sort = opts.sort
            if (items && !hasField(items[0], sort)) {
                throw new IllegalArgumentException("tri impossible : propriété inconnue « $sort »")
            }
            sorted = items.sort(false) { it[sort] }   // sort(false) : une copie, la liste reçue reste intacte
            if (desc) sorted = sorted.reverse()
        }
        [items: sorted.drop(offset).take(max), total: items.size(), max: max, offset: offset]
    }

    private static int toInt(value, int fallback) {
        if (value instanceof Number) return value.intValue()
        if (value instanceof CharSequence && value.toString().trim().isInteger()) return value.toString().trim().toInteger()
        fallback
    }

    private static boolean hasField(item, String name) {
        item instanceof Map ? item.containsKey(name) : item.hasProperty(name) != null
    }
}
