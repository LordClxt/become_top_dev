public class Test {
    /** Un pool de connexions : la base n'en accepte qu'un par application. */
    @Component static class ConnectionPool {
        static int opened;
        ConnectionPool() {
            opened++;
            if (opened > 1) throw new IllegalStateException("la base refuse une 2e connexion (pool déjà ouvert)");
        }
    }
    @Component static class Reservations { final ConnectionPool pool; Reservations(ConnectionPool p) { pool = p; } }
    @Component static class Reports { final ConnectionPool pool; Reports(ConnectionPool p) { pool = p; } }
    @Component static class HealthCheck { final ConnectionPool pool; HealthCheck(ConnectionPool p) { pool = p; } }

    static MiniContainer tixa() {
        ConnectionPool.opened = 0;
        return new MiniContainer().register(ConnectionPool.class, Reservations.class, Reports.class, HealthCheck.class);
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("démarrage de Tixa : un seul pool ouvert", () -> {
            tixa().start();
            Spec.eq(ConnectionPool.opened, 1, "pools ouverts après start()");
        });

        Spec.test("tous les services partagent le même pool", () -> {
            var c = tixa().start();
            var pool = c.getBean("connectionPool");
            Spec.check(((Reservations) c.getBean("reservations")).pool == pool, "pool de reservations");
            Spec.check(((Reports) c.getBean("reports")).pool == pool, "pool de reports");
        });

        Spec.test("l'outil de supervision obtient le même pool par son type", () -> {
            var c = tixa().start();
            Spec.check(c.getBean(ConnectionPool.class) == c.getBean("connectionPool"),
                    "getBean(ConnectionPool.class) doit renvoyer le pool déjà ouvert");
            Spec.check(c.getBean(HealthCheck.class) == c.getBean("healthCheck"), "getBean(HealthCheck.class)");
            Spec.eq(ConnectionPool.opened, 1, "pools ouverts après les demandes de la supervision");
        });

        Spec.test("sans start(), un service demandé par son type ouvre le pool une seule fois", () -> {
            var c = tixa();
            c.getBean(Reports.class);
            c.getBean(Reservations.class);
            Spec.eq(ConnectionPool.opened, 1, "pools ouverts");
        });

        Spec.done();
    }
}
