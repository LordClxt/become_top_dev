class Router {

    private static final List<String> VERBS = ['get', 'post', 'put', 'delete']

    private final List<Map> routes = []

    static Router build(Closure spec) {
        def router = new Router()
        def builder = new RouteBuilder(router.routes, VERBS)
        run(spec, builder)
        router
    }

    /** Exécute une closure DSL avec `builder` pour delegate. */
    static void run(Closure spec, Object builder) {
        spec.delegate = builder
        spec.resolveStrategy = Closure.DELEGATE_FIRST
        spec()
    }

    Map match(String verb, String path) {
        List<String> segments = split(path)
        for (route in routes) {
            if (route.verb != verb.toLowerCase() || route.segments.size() != segments.size()) continue
            Map params = [:]
            boolean ok = true
            route.segments.eachWithIndex { String seg, int i ->
                if (!ok) return
                if (seg.startsWith(':')) {
                    params[seg.substring(1)] = segments[i]
                } else if (seg != segments[i]) {
                    ok = false
                }
            }
            if (ok) return [controller: route.controller, action: route.action, params: params]
        }
        null
    }

    String path(String name, Map params = [:]) {
        def route = routes.find { it.name == name }
        if (!route) throw new IllegalArgumentException("route inconnue : $name")
        '/' + route.segments.collect { String seg ->
            if (!seg.startsWith(':')) return seg
            String key = seg.substring(1)
            if (!params.containsKey(key)) throw new IllegalArgumentException("paramètre manquant : $key")
            params[key].toString()
        }.join('/')
    }

    static List<String> split(String path) {
        path.split('/').findAll { it }.toList()
    }
}

class RouteBuilder {
    private final List<Map> routes
    private final List<String> verbs
    private final String prefix

    RouteBuilder(List<Map> routes, List<String> verbs, String prefix = '') {
        this.routes = routes
        this.verbs = verbs
        this.prefix = prefix
    }

    def group(String groupPrefix, Closure body) {
        Router.run(body, new RouteBuilder(routes, verbs, prefix + groupPrefix))
    }

    def methodMissing(String verb, Object args) {
        if (!(verb in verbs)) throw new MissingMethodException(verb, RouteBuilder, args)
        // Avec `get '/users', to: 'x'`, Groovy range les arguments nommés dans une Map passée en PREMIER.
        Map options = (args.find { it instanceof Map } ?: [:]) as Map
        String path = args.find { it instanceof CharSequence }
        String target = options.to
        if (!target || target.count('#') != 1 || target.startsWith('#') || target.endsWith('#')) {
            throw new IllegalArgumentException("route invalide : $verb ${prefix + path}")
        }
        def (controller, action) = target.split('#').toList()
        routes << [verb: verb, segments: Router.split(prefix + path), controller: controller, action: action, name: options.as]
        null
    }
}
