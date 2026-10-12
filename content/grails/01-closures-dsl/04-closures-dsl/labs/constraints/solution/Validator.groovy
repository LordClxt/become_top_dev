class Validator {

    private static final List<String> ORDER = ['nullable', 'blank', 'size', 'range', 'inList', 'matches']

    private final Map<String, Map> rules = [:]

    static Validator build(Closure spec) {
        def validator = new Validator()
        spec.delegate = new RuleBuilder(validator.rules, ORDER)
        spec.resolveStrategy = Closure.DELEGATE_FIRST
        spec()
        validator
    }

    List<String> validate(Map data) {
        List<String> errors = []
        rules.each { String field, Map constraints ->
            def value = data[field]
            if (value == null) {
                if (constraints.nullable != true) errors << "${field}.nullable".toString()
                return   // dans cette closure : passe au champ suivant
            }
            ORDER.each { String name ->
                if (!constraints.containsKey(name)) return
                def expected = constraints[name]
                boolean ok = true
                switch (name) {
                    case 'nullable': break
                    case 'blank':    ok = expected || !(value instanceof CharSequence) || value.toString().trim() != ''; break
                    case 'size':     ok = value.size() in expected; break
                    case 'range':    ok = value in expected; break
                    case 'inList':   ok = value in expected; break
                    case 'matches':  ok = value.toString() ==~ expected.toString(); break
                }
                if (!ok) errors << "${field}.${name}".toString()
            }
        }
        errors
    }
}

/**
 * Le delegate de la closure DSL : chaque appel `champ(contraintes)` est enregistré dans `rules`.
 * Classe de premier niveau : Groovy 4 refuse methodMissing sur une classe interne statique.
 */
class RuleBuilder {
    private final Map<String, Map> rules
    private final List<String> known

    RuleBuilder(Map<String, Map> rules, List<String> known) {
        this.rules = rules
        this.known = known
    }

    def methodMissing(String field, Object args) {
        Map constraints = args && args[0] instanceof Map ? (Map) args[0] : [:]
        constraints.keySet().each { String name ->
            if (!(name in known)) throw new IllegalArgumentException("contrainte inconnue : $name")
        }
        rules[field] = constraints
        null
    }
}
