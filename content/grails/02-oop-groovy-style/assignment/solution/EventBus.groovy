class EventBus {
    private static final Set<String> OPTIONS = ['priority', 'once'] as Set

    List<Map> errors = []
    private final List<Subscription> subscriptions = []
    private long sequence = 0

    Subscription subscribe(Map opts = [:], Class type, Listener listener) {
        add(opts, { event -> type.isInstance(event) }, listener)
    }

    Subscription subscribeAll(Map opts = [:], Object handler) {
        List<Class> accepted = handler.getClass().methods
            .findAll { it.name == 'on' && it.parameterCount == 1 }
            *.parameterTypes*.getAt(0)
        // Une seule livraison par événement : le dispatch dynamique de Groovy choisit la surcharge la plus spécifique.
        add(opts, { event -> accepted.any { it.isInstance(event) } }, { event -> handler.on(event) } as Listener)
    }

    void unsubscribe(Subscription subscription) {
        subscriptions.remove(subscription)
    }

    int publish(Object event) {
        List<Subscription> targets = subscriptions.findAll { it.accepts(event) }
            .sort { a, b -> b.priority <=> a.priority ?: a.order <=> b.order }
        targets.each { s ->
            if (s.once) subscriptions.remove(s)
            try {
                s.listener.onEvent(event)
            } catch (Exception e) {
                errors << [event: event, error: e]
            }
        }
        targets.size()
    }

    private Subscription add(Map opts, Closure<Boolean> accepts, Listener listener) {
        def unknown = opts.keySet() - OPTIONS
        if (unknown) throw new IllegalArgumentException("options inconnues : ${unknown.sort()} (admises : ${OPTIONS.sort()})")
        def s = new Subscription(
            accepts: accepts,
            listener: listener,
            priority: toInt(opts.priority),
            once: toBoolean(opts.once),
            order: sequence++)
        subscriptions << s
        s
    }

    private static int toInt(value) {
        value instanceof Number ? value.intValue() : value?.toString()?.trim()?.isInteger() ? value.toString().trim().toInteger() : 0
    }

    private static boolean toBoolean(value) {
        value instanceof Boolean ? value : value?.toString()?.trim()?.equalsIgnoreCase('true')
    }

    static class Subscription {
        Closure<Boolean> accepts
        Listener listener
        int priority
        boolean once
        long order

        boolean accepts(Object event) { accepts.call(event) }
    }
}
