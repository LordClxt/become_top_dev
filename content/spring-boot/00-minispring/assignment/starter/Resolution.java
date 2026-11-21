import java.lang.reflect.Type;

/** Trouve la valeur d'un paramètre de constructeur. */
final class Resolution {
    private Resolution() { }

    /**
     * @param type      le type déclaré du paramètre (une Class, ou un ParameterizedType pour List<X> et Provider<X>)
     * @param beans     l'accès aux définitions et aux beans
     * @param requester le nom du bean en cours de création (pour les messages d'erreur)
     */
    static Object argument(Type type, BeanLookup beans, String requester) {
        throw new UnsupportedOperationException("Resolution.argument");
    }
}
