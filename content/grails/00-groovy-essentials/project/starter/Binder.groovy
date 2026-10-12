class Binder {
    /** Jalon 1 : convertit `raw` (souvent du texte) vers `type`. */
    static Object convert(Class type, Object raw) {
        throw new UnsupportedOperationException('à écrire')
    }

    /** Jalons 2 et 3 : lie `params` aux propriétés de `target` ; renvoie nom -> 'typeMismatch'. */
    static Map<String, String> bind(Object target, Map params, Map opts = [:]) {
        throw new UnsupportedOperationException('à écrire')
    }
}
