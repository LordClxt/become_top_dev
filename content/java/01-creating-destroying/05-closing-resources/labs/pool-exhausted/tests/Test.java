import java.util.HashSet;
import java.util.List;
import java.util.ArrayList;
import java.util.Set;

public class Test {
    /** Base factice : la requête numéro n échoue si failEvery > 0 et n % failEvery == 0. */
    static final class FakeDb implements Database {
        final int failEvery;
        int calls;
        FakeDb(int failEvery) { this.failEvery = failEvery; }
        @Override public String execute(int physicalId, String sql) {
            calls++;
            if (failEvery > 0 && calls % failEvery == 0) throw new QueryFailedException("timeout réseau (requête " + calls + ")");
            if (sql.equals("COUNT")) return "42";
            return "id-" + calls;
        }
    }

    static final class DeadDb implements Database {
        @Override public String execute(int physicalId, String sql) { throw new QueryFailedException("base injoignable"); }
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("sans panne, le pool retrouve toutes ses connexions", () -> {
            var pool = ConnectionPool.ofSize(5, new FakeDb(0));
            var repo = new OrderRepository(pool);
            for (int i = 0; i < 20; i++) repo.save("o" + i);
            Spec.eq(pool.available(), 5, "available() après 20 sauvegardes");
        });

        Spec.test("une panne transitoire ne fait pas fuir de connexion", () -> {
            var pool = ConnectionPool.ofSize(5, new FakeDb(7));
            var repo = new OrderRepository(pool);
            for (int i = 0; i < 200; i++) {
                try {
                    repo.save("o" + i);
                } catch (PoolExhaustedException e) {
                    throw new Spec.Failure("PoolExhaustedException à la sauvegarde n°" + (i + 1)
                            + " alors qu'une seule connexion sert à la fois : quelque chose emprunte sans rendre");
                }
            }
            Spec.eq(pool.available(), 5, "available() après 200 sauvegardes avec des pannes");
        });

        Spec.test("une panne définitive remonte, sans fuite", () -> {
            var pool = ConnectionPool.ofSize(5, new DeadDb());
            var repo = new OrderRepository(pool);
            Spec.raises(QueryFailedException.class, () -> repo.save("o1"), "save quand la base est morte");
            Spec.eq(pool.available(), 5, "available() après 3 tentatives ratées");
        });

        Spec.test("compter ne gonfle pas le pool", () -> {
            var pool = ConnectionPool.ofSize(5, new FakeDb(0));
            var repo = new OrderRepository(pool);
            Spec.eq(repo.count(), 42, "count()");
            repo.count();
            Spec.check(pool.available() <= pool.size(),
                    "available() = " + pool.available() + " sur un pool de " + pool.size() + " : une connexion a été rendue plusieurs fois");
            Spec.eq(pool.available(), 5, "available() après deux count()");
        });

        Spec.test("deux emprunts simultanés n'ont jamais la même connexion physique", () -> {
            var pool = ConnectionPool.ofSize(5, new FakeDb(0));
            new OrderRepository(pool).count();
            List<Connection> held = new ArrayList<>();
            Set<Integer> ids = new HashSet<>();
            try {
                for (int i = 0; i < 5; i++) {
                    Connection c = pool.acquire();
                    held.add(c);
                    Spec.check(ids.add(c.physicalId()), "la connexion physique " + c.physicalId()
                            + " est prêtée à deux emprunteurs en même temps : leurs requêtes vont se mélanger");
                }
            } finally {
                held.forEach(Connection::close);
            }
        });

        Spec.test("un emprunt fermé est inutilisable, et le refermer est sans effet", () -> {
            var pool = ConnectionPool.ofSize(2, new FakeDb(0));
            Connection c = pool.acquire();
            c.close();
            c.close();
            Spec.eq(pool.available(), 2, "available() après deux close()");
            var e = Spec.raises(IllegalStateException.class, () -> c.query("COUNT"), "query après close");
            Spec.check(e.getMessage() != null && e.getMessage().contains("COUNT"), "le message doit citer la requête refusée");
        });

        Spec.done();
    }
}
