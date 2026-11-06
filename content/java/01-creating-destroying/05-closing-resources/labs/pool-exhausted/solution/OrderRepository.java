/** Accès aux commandes. */
public final class OrderRepository {
    private final ConnectionPool pool;

    public OrderRepository(ConnectionPool pool) {
        this.pool = pool;
    }

    /** Enregistre une commande et renvoie son identifiant ; réessaie jusqu'à 3 fois. */
    public String save(String order) {
        return Retry.withRetry(pool, 3, c -> {
            String id = c.query("INSERT " + order);
            c.query("COMMIT");
            return id;
        });
    }

    public int count() {
        try (Connection c = pool.acquire()) {
            return Integer.parseInt(c.query("COUNT"));
        }
    }
}
