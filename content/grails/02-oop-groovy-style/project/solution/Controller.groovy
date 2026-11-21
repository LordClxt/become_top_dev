import groovy.json.JsonOutput

// L'équivalent de grails.artefact.Controller : de l'état (params, response) et du comportement.
trait Controller {
    static final Set<String> RENDER_KEYS = ['text', 'json', 'view', 'model', 'status', 'contentType'] as Set
    static final Set<String> REDIRECT_KEYS = ['action', 'controller', 'id', 'uri'] as Set

    Map params = [:]
    Response response = new Response()

    String getControllerName() {
        (getClass().simpleName - 'Controller').uncapitalize()
    }

    void render(Map opts) {
        check(opts, RENDER_KEYS, 'render')
        if (['text', 'json', 'view'].count { opts.containsKey(it) } > 1) {
            throw new IllegalArgumentException('render : une seule clé parmi text, json et view')
        }
        commit()
        if (opts.containsKey('status')) response.status = opts.status.toString().trim().toInteger()
        if (opts.containsKey('text')) {
            response.body = opts.text?.toString()
            response.contentType = 'text/plain'
        } else if (opts.containsKey('json')) {
            response.body = JsonOutput.toJson(opts.json)
            response.contentType = 'application/json'
        } else if (opts.containsKey('view')) {
            String v = opts.view
            response.view = v.startsWith('/') ? v : "${controllerName}/${v}"
            response.model = (opts.model ?: [:]) as Map
        }
        if (opts.contentType) response.contentType = opts.contentType
    }

    void redirect(Map opts) {
        check(opts, REDIRECT_KEYS, 'redirect')
        if (!opts.action && !opts.uri) throw new IllegalArgumentException('redirect : action ou uri requis')
        commit()
        response.status = 302
        response.redirectUrl = opts.uri ?: ['', opts.controller ?: controllerName, opts.action, opts.id].findAll { it != null }.join('/')
    }

    private void commit() {
        if (response.committed) throw new IllegalStateException('réponse déjà envoyée : un seul render ou redirect par action')
        response.committed = true
    }

    private static void check(Map opts, Set<String> allowed, String what) {
        def unknown = opts.keySet() - allowed
        if (unknown) throw new IllegalArgumentException("$what : clés inconnues ${unknown.sort()} (admises : ${allowed.sort()})")
    }
}
