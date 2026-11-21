class Pager {
    static final Map DEFAULTS = [max: 10, offset: 0, order: 'asc']

    static Map page(Map opts = [:], List items) {
        // TODO : valider les clés, convertir et borner max/offset, trier, découper
        [items: items, total: items.size(), max: 10, offset: 0]
    }
}
