import java.lang.reflect.Modifier

class Binder {
    static final Set<String> TRUE_WORDS = ['true', 'on', 'yes', '1'] as Set
    static final Set<String> FALSE_WORDS = ['false', 'off', 'no', '0'] as Set

    /** Jalon 1 : convertit `raw` (souvent du texte) vers `type`. */
    static Object convert(Class type, Object raw) {
        if (raw == null) return null
        if (!(raw instanceof CharSequence)) {
            if (type.isInstance(raw) || (type.isPrimitive() && wrapperOf(type).isInstance(raw))) return raw
            throw new IllegalArgumentException("impossible de convertir ${raw.getClass().simpleName} en ${type.simpleName}")
        }
        String text = raw.toString().trim()
        if (!text) return null
        try {
            switch (type) {
                case String: return text
                case [Integer, int]: return text as Integer
                case [Long, long]: return text as Long
                case BigDecimal: return text as BigDecimal
                case [Boolean, boolean]: return toBoolean(text)
                default: throw new IllegalArgumentException("type non géré : ${type.simpleName}")
            }
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("'${text}' n'est pas un ${type.simpleName}", e)
        }
    }

    private static Boolean toBoolean(String text) {
        String t = text.toLowerCase()
        if (t in TRUE_WORDS) return true
        if (t in FALSE_WORDS) return false
        throw new IllegalArgumentException("'${text}' n'est pas un booléen")
    }

    private static Class wrapperOf(Class primitive) {
        [(int): Integer, (long): Long, (boolean): Boolean][primitive] ?: primitive
    }

    /** Jalons 2 et 3 : lie `params` aux propriétés de `target` ; renvoie nom -> 'typeMismatch'. */
    static Map<String, String> bind(Object target, Map params, Map opts = [:]) {
        List include = opts.include ?: []
        List exclude = opts.exclude ?: []
        Map<String, String> errors = [:]
        bindableProperties(target)
            .findAll { p -> params.containsKey(p.name) }
            .findAll { p -> (!include || p.name in include) && !(p.name in exclude) }
            .each { p ->
                try {
                    def value = convert(p.type, params[p.name])
                    if (value != null || !p.type.isPrimitive()) target."${p.name}" = value
                } catch (IllegalArgumentException e) {
                    errors[p.name] = 'typeMismatch'
                }
            }
        errors
    }

    private static List<MetaProperty> bindableProperties(Object target) {
        target.metaClass.properties.findAll { p ->
            p instanceof MetaBeanProperty && p.setter &&
                !Modifier.isStatic(p.modifiers) && p.type != Object &&
                !(p.name in ['class', 'metaClass'])
        }
    }
}
