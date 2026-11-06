import java.util.function.Function;

/** Réessaie un travail sur une connexion neuve quand la base renvoie une panne transitoire. */
public final class Retry {
    private Retry() { throw new AssertionError(); }

    public static <T> T withRetry(ConnectionPool pool, int attempts, Function<Connection, T> work) {
        QueryFailedException last = null;
        for (int i = 0; i < attempts; i++) {
            try (Connection c = pool.acquire()) { // rendue à chaque tentative, réussie ou non
                return work.apply(c);
            } catch (QueryFailedException e) {
                if (last != null) e.addSuppressed(last); // garder la trace des tentatives précédentes
                last = e;
            }
        }
        throw last;
    }
}
