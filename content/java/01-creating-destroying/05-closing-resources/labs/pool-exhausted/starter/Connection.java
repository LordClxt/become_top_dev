/** Un emprunt de connexion. Le fermer rend la connexion physique au pool. */
public final class Connection implements AutoCloseable {
    private final ConnectionPool pool;
    private final int physical;

    Connection(ConnectionPool pool, int physical) {
        this.pool = pool;
        this.physical = physical;
    }

    public String query(String sql) {
        return pool.execute(physical, sql);
    }

    public int physicalId() {
        return physical;
    }

    @Override
    public void close() {
        pool.release(physical);
    }
}
