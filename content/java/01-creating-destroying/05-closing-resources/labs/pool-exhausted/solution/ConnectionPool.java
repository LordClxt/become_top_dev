import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Objects;

/** Un pool de taille fixe. Les connexions physiques sont des entiers 1..size ; chaque emprunt est un {@link Connection}. */
public final class ConnectionPool {
    private final Database db;
    private final int size;
    private final Deque<Integer> idle = new ArrayDeque<>();
    private int created;

    private ConnectionPool(int size, Database db) {
        this.size = size;
        this.db = db;
    }

    public static ConnectionPool ofSize(int size, Database db) {
        if (size <= 0) throw new IllegalArgumentException("taille du pool : " + size);
        return new ConnectionPool(size, Objects.requireNonNull(db, "db"));
    }

    /** Emprunte une connexion ; à rendre avec {@link Connection#close()}. */
    public synchronized Connection acquire() {
        int physical;
        if (!idle.isEmpty()) {
            physical = idle.pop();
        } else if (created < size) {
            physical = ++created;
        } else {
            throw new PoolExhaustedException("les " + size + " connexions sont empruntées");
        }
        return new Connection(this, physical);
    }

    synchronized void release(int physical) {
        idle.push(physical);
    }

    String execute(int physical, String sql) {
        return db.execute(physical, sql);
    }

    /** Connexions qu'on peut encore emprunter (rendues + jamais créées). */
    public synchronized int available() {
        return idle.size() + (size - created);
    }

    public int size() {
        return size;
    }
}
