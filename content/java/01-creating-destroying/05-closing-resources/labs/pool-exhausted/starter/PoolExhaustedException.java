/** Plus aucune connexion disponible dans le pool. Fournie. */
public class PoolExhaustedException extends RuntimeException {
    public PoolExhaustedException(String message) { super(message); }
}
