class Ops {
    static String classify(Object x) {
        switch (x) {
            case null: return 'nothing'
            case { it instanceof Integer && it in 0..9 }: return 'digit'
            case Number: return 'number'
            case ~/\d+/: return 'numeric text'
            case CharSequence: return 'text'
            case { it instanceof Collection && !it }: return 'empty list'
            case Collection: return 'list'
            case Map: return 'map'
            default: return 'object'
        }
    }

    static String city(Object person) {
        person?.address?.city ?: 'inconnue'
    }

    static String firstFilled(List<String> values) {
        values.find { it?.trim() }
    }
}
