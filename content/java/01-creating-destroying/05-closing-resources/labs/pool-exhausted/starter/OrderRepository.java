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
            int n = Integer.parseInt(c.query("COUNT"));
            c.close(); // rendre la connexion au plus vite : le comptage est fini
            return n;
        }
    }
}
