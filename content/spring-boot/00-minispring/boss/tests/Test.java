import java.util.ArrayList;
import java.util.List;

public class Test {
    static final List<String> LOG = new ArrayList<>();

    @Component static class Clock { Clock() { LOG.add("new Clock"); } }
    @Component static class Experimental { Experimental() { LOG.add("new Experimental"); throw new IllegalStateException("service distant en panne"); } }
    @Component static class Catalog {
        final Clock clock;
        Catalog(Clock clock) { this.clock = clock; LOG.add("new Catalog"); }
        @PreDestroy void close() { LOG.add("Catalog @PreDestroy"); }
    }
    @Component static class Pool { Pool() { LOG.add("new Pool"); } @PreDestroy void close() { LOG.add("Pool @PreDestroy"); } }
    @Component static class Broken { Broken(Catalog c) { throw new IllegalStateException("clé API absente"); } }

    /** Retire Experimental et rend Clock prototype, avant toute création. */
    @Component static class Toggles implements DefinitionProcessor {
        Toggles() { LOG.add("new Toggles"); }
        public void process(DefinitionRegistry r) {
            LOG.add("Toggles.process " + r.names());
            r.remove("experimental");
            r.replace(r.get("clock").withPrototype(true));
        }
    }
    @Component static class NeedyToggles implements DefinitionProcessor {
        NeedyToggles(Clock c) { }
        public void process(DefinitionRegistry r) { }
    }

    interface Greeter { String hello(); }
    @Component static class Hello implements Greeter { public String hello() { return "bonjour"; } }
    @Component static class Front { final Greeter greeter; Front(Greeter g) { greeter = g; } }

    /** Remplace chaque Greeter par un objet du même type qui crie ; laisse passer les autres. */
    @Component static class Wrapper implements BeanPostProcessor {
        public Object after(String name, Object bean) {
            LOG.add("Wrapper." + name);
            if (!(bean instanceof Greeter g)) return bean;
            return (Greeter) () -> g.hello().toUpperCase();
        }
    }
    /** Un post-processor qui dépend d'un bean applicatif : ce bean est créé trop tôt. */
    @Component static class Auditor implements BeanPostProcessor {
        Auditor(Pool pool) { LOG.add("new Auditor"); }
        public Object after(String name, Object bean) { LOG.add("Auditor." + name); return bean; }
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("temps 1 : les DefinitionProcessor agissent avant la création de tout autre bean", () -> {
            LOG.clear();
            new Container().register(Clock.class, Catalog.class, Toggles.class, Experimental.class).refresh();
            Spec.eq(LOG.subList(0, 2), List.of("new Toggles", "Toggles.process [clock, catalog, toggles, experimental]"),
                    "premières étapes du démarrage");
            Spec.check(!LOG.contains("new Experimental"), "experimental, retiré par Toggles, ne doit jamais être instancié");
        });

        Spec.test("une définition modifiée change le comportement du bean", () -> {
            var c = new Container().register(Clock.class, Catalog.class, Toggles.class, Experimental.class).refresh();
            Spec.check(c.getBean("clock") != c.getBean("clock"), "clock est devenu prototype : deux getBean, deux objets");
            Spec.raises(BeanException.class, () -> c.getBean("experimental"), "getBean d'un bean retiré");
        });

        Spec.test("un DefinitionProcessor ne peut pas recevoir de dépendances", () -> {
            var e = Spec.raises(BeanException.class, () -> new Container().register(Clock.class, NeedyToggles.class).refresh(), "NeedyToggles(Clock)");
            Spec.eq(e.getMessage(), "un DefinitionProcessor ne reçoit pas de dépendances : needyToggles", "message");
        });

        Spec.test("temps 2 : les BeanPostProcessor existent avant les autres beans et les remplacent", () -> {
            LOG.clear();
            var c = new Container().register(Front.class, Hello.class, Wrapper.class).refresh();
            Spec.eq(((Greeter) c.getBean("hello")).hello(), "BONJOUR", "hello() du bean hello (remplacé par Wrapper)");
            Spec.check(!(c.getBean("hello") instanceof Hello), "le bean hello doit être l'objet renvoyé par Wrapper");
            Spec.check(((Front) c.getBean("front")).greeter == c.getBean("hello"), "Front doit recevoir le bean remplacé, pas l'objet d'origine");
            Spec.check(LOG.contains("Wrapper.hello") && LOG.contains("Wrapper.front"), "Wrapper doit voir passer hello et front");
            Spec.check(!LOG.contains("Wrapper.wrapper"), "un post-processor ne se traite pas lui-même");
        });

        Spec.test("un bean créé pour satisfaire un post-processor est signalé et n'est pas traité", () -> {
            LOG.clear();
            var c = new Container().register(Pool.class, Wrapper.class, Auditor.class, Clock.class).refresh();
            Spec.check(LOG.contains("Wrapper.pool"), "pool, créé pendant Auditor, est quand même vu par Wrapper (déjà prêt)");
            Spec.check(!LOG.contains("Auditor.pool"), "Auditor n'existait pas encore quand pool a été créé");
            Spec.check(LOG.contains("Auditor.clock") && LOG.contains("Wrapper.clock"), "clock, créé au temps 2b, est traité par les deux");
            Spec.eq(c.warnings(), List.of("bean 'pool' créé trop tôt : non traité par tous les post-processors"), "avertissements");
        });

        Spec.test("sans dépendance précoce, aucun avertissement", () -> {
            var c = new Container().register(Front.class, Hello.class, Wrapper.class).refresh();
            Spec.eq(c.warnings(), List.of(), "avertissements");
        });

        Spec.test("un démarrage raté détruit les beans déjà créés, puis remonte l'erreur", () -> {
            LOG.clear();
            var e = Spec.raises(BeanException.class, () -> new Container().register(Pool.class, Clock.class, Catalog.class, Broken.class).refresh(), "Broken");
            Spec.eq(e.getMessage(), "échec de création de broken : clé API absente", "message");
            Spec.eq(LOG, List.of("new Pool", "new Clock", "new Catalog", "Catalog @PreDestroy", "Pool @PreDestroy"),
                    "créations puis destructions, dans l'ordre inverse");
        });

        Spec.done();
    }
}
