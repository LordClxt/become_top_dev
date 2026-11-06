/** Un emprunt de connexion. Le fermer rend la connexion physique au pool, une seule fois. */
public final class Connection implements AutoCloseable {
    private final ConnectionPool pool;
    private final int physical;
    private boolean closed;

    Connection(ConnectionPool pool, int physical) {
        this.pool = pool;
        this.physical = physical;
    }

    public String query(String sql) {
        if (closed) throw new IllegalStateException("connexion déjà rendue au pool : " + sql);
        return pool.execute(physical, sql);
    }

    public int physicalId() {
        return physical;
    }

    /** Idempotent : un second appel ne rend pas la connexion physique une deuxième fois. */
    @Override
    public void close() {
        if (closed) return;
        closed = true;
        pool.release(physical);
    }
}
