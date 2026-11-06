/** Échec (souvent transitoire) d'une requête. Fournie. */
public class QueryFailedException extends RuntimeException {
    public QueryFailedException(String message) { super(message); }
}
