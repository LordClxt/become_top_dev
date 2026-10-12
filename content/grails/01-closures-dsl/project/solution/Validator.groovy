class Validator {

    private static final List<String> ORDER = ['nullable', 'blank', 'size', 'range', 'inList', 'matches', 'validator']

    private final Map<String, Map> rules = [:]

    static Validator build(Closure spec) {
        def validator = new Validator()
        Closure copy = spec.rehydrate(new RuleBuilder(validator.rules, ORDER), spec.owner, spec.thisObject)
        copy.resolveStrategy = Closure.DELEGATE_FIRST
        copy()
        validator
    }

    List<String> validate(Map data, Object obj = null) {
        List<String> errors = []
        rules.each { String field, Map constraints ->
            def value = data[field]
            if (value == null) {
                if (constraints.nullable != true) errors << "${field}.nullable".toString()
                return
            }
            ORDER.each { String name ->
                if (!constraints.containsKey(name)) return
                def expected = constraints[name]
                if (name == 'validator') {
                    errors.addAll(runCustom(field, (Closure) expected, value, obj))
                    return
                }
                boolean ok = true
                switch (name) {
                    case 'blank':   ok = expected || !(value instanceof CharSequence) || value.toString().trim() != ''; break
                    case 'size':    ok = value.size() in expected; break
                    case 'range':   ok = value in expected; break
                    case 'inList':  ok = value in expected; break
                    case 'matches': ok = value.toString() ==~ expected.toString(); break
                }
                if (!ok) errors << "${field}.${name}".toString()
            }
        }
        errors
    }

    /**
     * Arité 1 : (valeur) ; arité 2 : (valeur, objet) ; arité 3 : (valeur, objet, erreurs) — la closure ajoute
     * elle-même ses codes à `erreurs` et sa valeur de retour est ignorée.
     * Retour pour 1 et 2 : true/null = valide ; false = "champ.validator" ; une String = ce code d'erreur.
     */
    private static List<String> runCustom(String field, Closure c, Object value, Object obj) {
        List<String> found = []
        switch (c.maximumNumberOfParameters) {
            case 3:
                c(value, obj, found)
                return found
            case 2:
                return interpret(field, c(value, obj))
            default:
                return interpret(field, c(value))
        }
    }

    private static List<String> interpret(String field, Object result) {
        if (result == null || result == true) return []
        if (result instanceof CharSequence) return [result.toString()]
        ["${field}.validator".toString()]
    }
}

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
