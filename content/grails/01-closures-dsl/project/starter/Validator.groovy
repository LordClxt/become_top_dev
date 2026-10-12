/**
 * Le validateur écrit au lab « Ton propre bloc constraints », fourni ici déjà fonctionnel.
 * Jalon 2 : ajouter la contrainte `validator:` (closure à 1, 2 ou 3 paramètres).
 */
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
                return
            }
            ORDER.each { String name ->
                if (!constraints.containsKey(name)) return
                def expected = constraints[name]
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
