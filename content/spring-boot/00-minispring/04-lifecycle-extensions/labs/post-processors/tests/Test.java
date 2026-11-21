import java.util.ArrayList;
import java.util.List;

public class Test {
    static final List<String> LOG = new ArrayList<>();

    interface Greeter { String hello(); }

    @Component static class Catalog implements Greeter {
        boolean loaded;
        @PostConstruct private void load() { loaded = true; LOG.add("catalog @PostConstruct"); }
        @PreDestroy void close() { LOG.add("catalog @PreDestroy"); }
        public String hello() { return "catalogue"; }
    }
    @Component static class Journal {
        @PreDestroy void flush() { LOG.add("journal @PreDestroy"); }
    }
    @Component static class Fragile {
        @PreDestroy void close() { LOG.add("fragile @PreDestroy"); throw new IllegalStateException("socket déjà fermée"); }
    }
    @Component static class Tracer implements BeanPostProcessor {
        public Object before(String name, Object bean) { LOG.add("before " + name); return bean; }
        public Object after(String name, Object bean) { LOG.add("after " + name); return bean; }
    }
    /** Remplace chaque Greeter par un proxy qui crie. */
    @Component static class Shouter implements BeanPostProcessor {
        public Object after(String name, Object bean) {
            if (!(bean instanceof Greeter g)) return bean;
            return (Greeter) () -> g.hello().toUpperCase();
        }
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("@PostConstruct est appelé, même sur une méthode privée", () -> {
            LOG.clear();
            var c = new MiniContainer().register(Catalog.class).start();
            Spec.check(((Catalog) c.getBean("catalog")).loaded, "Catalog.load doit avoir été appelée");
        });

        Spec.test("ordre : before de chaque processeur, @PostConstruct, puis after", () -> {
            LOG.clear();
            new MiniContainer().register(Tracer.class, Catalog.class).start();
            Spec.eq(LOG, List.of("before catalog", "catalog @PostConstruct", "after catalog"), "journal d'initialisation");
        });

        Spec.test("ce que renvoie after remplace le bean", () -> {
            var c = new MiniContainer().register(Shouter.class, Catalog.class).start();
            var g = (Greeter) c.getBean("catalog");
            Spec.eq(g.hello(), "CATALOGUE", "hello() du bean catalog après Shouter");
            Spec.check(!(g instanceof Catalog), "le bean catalog doit être l'objet renvoyé par Shouter, pas le Catalog d'origine");
        });

        Spec.test("les processeurs s'enchaînent : chacun reçoit le résultat du précédent", () -> {
            LOG.clear();
            var c = new MiniContainer().register(Shouter.class, Tracer.class, Catalog.class).start();
            Spec.eq(((Greeter) c.getBean("catalog")).hello(), "CATALOGUE", "hello()");
            Spec.check(LOG.contains("after catalog"), "Tracer.after doit voir passer catalog");
        });

        Spec.test("close() : @PreDestroy du dernier créé au premier", () -> {
            var c = new MiniContainer().register(Catalog.class, Journal.class).start();
            LOG.clear();
            c.close();
            Spec.eq(LOG, List.of("journal @PreDestroy", "catalog @PreDestroy"), "journal de destruction");
        });

        Spec.test("une erreur à la destruction n'empêche pas les autres, et remonte ensuite", () -> {
            var c = new MiniContainer().register(Catalog.class, Fragile.class, Journal.class).start();
            LOG.clear();
            var e = Spec.raises(BeanException.class, c::close, "close() avec Fragile qui échoue");
            Spec.eq(LOG, List.of("journal @PreDestroy", "fragile @PreDestroy", "catalog @PreDestroy"),
                    "tous les @PreDestroy doivent être appelés malgré l'échec de fragile");
            Spec.check(e.getMessage().contains("socket déjà fermée"), "le message doit contenir la cause : " + e.getMessage());
        });

        Spec.done();
    }
}
