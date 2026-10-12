class Tpl {
    static final Map<String, Closure> DEFAULT_FILTERS = [
        upper     : { it.toString().toUpperCase() },
        lower     : { it.toString().toLowerCase() },
        trim      : { it.toString().trim() },
        capitalize: { it.toString().capitalize() },
    ]

    static String render(String template, Map model, Map<String, Closure> filters = [:]) {
        Map<String, Closure> all = DEFAULT_FILTERS + filters
        template.replaceAll(/(\\)?\$\{([^}]*)\}/) { String whole, String escaped, String expr ->
            escaped ? whole.substring(1) : evaluate(expr, model, all)
        }
    }

    private static String evaluate(String expr, Map model, Map<String, Closure> filters) {
        List<String> parts = expr.split(/\|/)*.trim()
        String head = parts.head()
        List<String> names = parts.tail()
        def (path, fallback) = head.split(/\?:/, 2)*.trim()
        def value = path.tokenize('.').inject(model) { obj, part -> obj?."$part" }
        if (isBlank(value)) value = fallback
        names.inject(value) { v, name ->
            Closure f = filters[name]
            if (f == null) throw new IllegalArgumentException("filtre inconnu : ${name}")
            v == null ? null : f(v)
        }?.toString() ?: ''
    }

    private static boolean isBlank(value) {
        value == null || (value instanceof CharSequence && !value.toString().trim())
    }
}
