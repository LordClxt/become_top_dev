import java.util.function.Function;

/** Réessaie un travail sur une connexion neuve quand la base renvoie une panne transitoire. */
public final class Retry {
    private Retry() { throw new AssertionError(); }

    public static <T> T withRetry(ConnectionPool pool, int attempts, Function<Connection, T> work) {
        QueryFailedException last = null;
        for (int i = 0; i < attempts; i++) {
            Connection c = pool.acquire();
            try {
                T result = work.apply(c);
                c.close();
                return result;
            } catch (QueryFailedException e) {
                last = e; // panne transitoire : on retente avec une autre connexion
            }
        }
        throw last;
    }
}
