import java.util.List;

public class Test {
    record Pool() { }
    record Catalog() { }
    record Reservations(Pool pool, Catalog catalog) { }
    record Reports(Pool pool) { }

    static Graph tixa() {
        return new Graph()
                .add(Recipe.of("reservations", d -> new Reservations((Pool) d.get(0), (Catalog) d.get(1)), "pool", "catalog"))
                .add(Recipe.of("reports", d -> new Reports((Pool) d.get(0)), "pool"))
                .add(Recipe.of("pool", d -> new Pool()))
                .add(Recipe.of("catalog", d -> new Catalog()));
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("les dépendances sont créées avant le bean qui les demande", () -> {
            var g = tixa().start();
            Spec.eq(g.creationOrder(), List.of("pool", "catalog", "reservations", "reports"), "ordre de création");
        });

        Spec.test("une dépendance partagée n'est créée qu'une fois", () -> {
            var g = tixa().start();
            var res = (Reservations) g.getBean("reservations");
            var rep = (Reports) g.getBean("reports");
            Spec.check(res.pool() == rep.pool(), "reservations et reports doivent recevoir le même pool");
            Spec.check(res.pool() == g.getBean("pool"), "et c'est le bean pool lui-même");
        });

        Spec.test("getBean sans start crée seulement ce qui est nécessaire", () -> {
            var g = tixa();
            g.getBean("reports");
            Spec.eq(g.creationOrder(), List.of("pool", "reports"), "beans créés pour getBean(\"reports\")");
        });

        Spec.test("un cycle est détecté et décrit depuis le bean demandé", () -> {
            var g = new Graph()
                    .add(Recipe.of("a", d -> "a", "b"))
                    .add(Recipe.of("b", d -> "b", "c"))
                    .add(Recipe.of("c", d -> "c", "a"));
            var e = Spec.raises(BeanException.class, g::start, "start() avec a → b → c → a");
            Spec.eq(e.getMessage(), "cycle de dépendances : a → b → c → a", "message du cycle");
            var e2 = Spec.raises(BeanException.class, () -> g.getBean("c"), "getBean(\"c\") ensuite");
            Spec.eq(e2.getMessage(), "cycle de dépendances : c → a → b → c",
                    "message vu depuis c (pense à vider l'état « en cours de création » quand une création échoue)");
        });

        Spec.test("un bean qui dépend de lui-même est un cycle", () -> {
            var g = new Graph().add(Recipe.of("self", d -> "x", "self"));
            var e = Spec.raises(BeanException.class, () -> g.getBean("self"), "getBean(\"self\")");
            Spec.eq(e.getMessage(), "cycle de dépendances : self → self", "message");
        });

        Spec.test("le cycle ne masque pas le début du chemin", () -> {
            var g = new Graph()
                    .add(Recipe.of("api", d -> "api", "orders"))
                    .add(Recipe.of("orders", d -> "orders", "payments"))
                    .add(Recipe.of("payments", d -> "payments", "orders"));
            var e = Spec.raises(BeanException.class, () -> g.getBean("api"), "getBean(\"api\")");
            Spec.eq(e.getMessage(), "cycle de dépendances : orders → payments → orders",
                    "message (api n'est pas dans le cycle : il ne doit pas apparaître)");
        });

        Spec.test("dépendance inconnue : le bean qui la demande est nommé", () -> {
            var g = new Graph().add(Recipe.of("reports", d -> "r", "pool"));
            var e = Spec.raises(BeanException.class, g::start, "start() sans pool");
            Spec.eq(e.getMessage(), "aucun bean nommé pool (demandé par reports)", "message");
        });

        Spec.done();
    }
}
