import java.util.ArrayList;
import java.util.List;

public class Test {
    // ---------- composants de test ----------
    @Component static class Catalog { }
    @Component("prices") static class PriceCalculator { }
    @Component static class URLParser { }
    @Component @Prototype static class Cart { }
    static class NotAComponent { }

    @Component static class Pool {
        static int opened;
        Pool() { opened++; }
    }
    @Component static class Reservations {
        final Pool pool; final Catalog catalog;
        Reservations(Pool pool, Catalog catalog) { this.pool = pool; this.catalog = catalog; }
    }
    @Component static class Reports {
        final Pool pool;
        Reports(Pool pool) { this.pool = pool; }
    }
    @Component static class Desk {
        final Cart cart;
        Desk(Cart cart) { this.cart = cart; }
    }
    @Component static class TwoCtors {
        final String how;
        TwoCtors() { how = "vide"; }
        @Inject TwoCtors(Catalog c) { how = "injecté"; }
    }
    @Component static class Ambiguous {
        Ambiguous() { }
        Ambiguous(Catalog c) { }
    }

    interface Gateway { }
    @Component static class Stripe implements Gateway { }
    @Component static class Paypal implements Gateway { }
    @Component static class Checkout { Checkout(Gateway g) { } }

    @Component static class A { A(B b) { } }
    @Component static class B { B(C c) { } }
    @Component static class C { C(A a) { } }

    static final List<String> EVENTS = new ArrayList<>();
    @Component static class Sink {
        @PostConstruct void open() { EVENTS.add("sink ouvert"); }
        @PreDestroy void close() { EVENTS.add("sink fermé"); }
    }
    @Component static class Journal {
        final Sink sink; boolean ready;
        Journal(Sink sink) { this.sink = sink; }
        @PostConstruct private void init() { ready = true; EVENTS.add("journal prêt"); }
        @PreDestroy void flush() { EVENTS.add("journal vidé"); }
    }
    @Component @Prototype static class Hold {
        @PreDestroy void release() { EVENTS.add("hold libéré"); }
    }
    @Component static class Broken {
        Broken(Journal j) { throw new IllegalStateException("clé API absente"); }
    }
    @Component static class BadInit {
        @PostConstruct void init(String s) { }
    }

    static MiniContainer of(Class<?>... types) { return new MiniContainer().register(types); }

    public static void main(String[] args) {
        Spec.only(args);

        // ===================== M1 =====================
        Spec.test("M1 — noms des beans : annotation, sinon nom de classe à la Spring", () -> {
            var names = of(Catalog.class, PriceCalculator.class, URLParser.class).definitions().stream()
                    .map(BeanDefinition::name).toList();
            Spec.eq(names, List.of("catalog", "prices", "URLParser"),
                    "noms des définitions (URLParser garde ses majuscules, comme Introspector.decapitalize)");
        });

        Spec.test("M1 — enregistrer ne crée aucun objet", () -> {
            Pool.opened = 0;
            of(Pool.class);
            Spec.eq(Pool.opened, 0, "instances de Pool après register (une définition n'est pas un objet)");
        });

        Spec.test("M1 — un singleton est créé une fois, un prototype à chaque demande", () -> {
            var c = of(Catalog.class, Cart.class);
            Spec.check(c.getBean("catalog") == c.getBean(Catalog.class), "getBean(\"catalog\") et getBean(Catalog.class) doivent renvoyer la même instance");
            Spec.check(c.getBean(Cart.class) != c.getBean(Cart.class), "deux getBean(Cart.class) doivent renvoyer deux paniers (@Prototype)");
            Spec.check(c.definitions().get(1).prototype(), "la définition de cart doit être marquée prototype");
        });

        Spec.test("M1 — erreurs de configuration", () -> {
            Spec.raises(BeanException.class, () -> of(NotAComponent.class), "register d'une classe sans @Component");
            var dup = Spec.raises(BeanException.class, () -> of(Catalog.class, Catalog.class), "deux fois le même nom");
            Spec.eq(dup.getMessage(), "bean déjà défini : catalog", "message pour un nom en double");
            var missing = Spec.raises(BeanException.class, () -> of(Catalog.class).getBean("nope"), "getBean d'un nom inconnu");
            Spec.eq(missing.getMessage(), "aucun bean nommé nope", "message pour un nom inconnu");
        });

        // ===================== M2 =====================
        Spec.test("M2 — injection par constructeur, singletons partagés", () -> {
            Pool.opened = 0;
            var c = of(Reservations.class, Reports.class, Pool.class, Catalog.class).start();
            Spec.eq(Pool.opened, 1, "pools ouverts après start()");
            Spec.check(c.getBean(Reservations.class).pool == c.getBean(Reports.class).pool,
                    "Reservations et Reports doivent partager le même Pool");
            Spec.check(c.getBean(Reservations.class).catalog == c.getBean(Catalog.class), "catalogue injecté = le bean catalog");
        });

        Spec.test("M2 — start() crée les singletons, pas les prototypes", () -> {
            Pool.opened = 0;
            var c = of(Pool.class, Cart.class);
            Spec.eq(Pool.opened, 0, "pools ouverts avant start()");
            c.start();
            Spec.eq(Pool.opened, 1, "pools ouverts après start()");
        });

        Spec.test("M2 — un prototype injecté dans un singleton n'est créé qu'une fois", () -> {
            var c = of(Desk.class, Cart.class).start();
            Spec.check(c.getBean(Desk.class).cart == c.getBean(Desk.class).cart, "le guichet garde le même panier (il n'est créé qu'une fois)");
            Spec.check(c.getBean(Desk.class).cart != c.getBean(Cart.class), "mais getBean(Cart.class) en crée un nouveau");
        });

        Spec.test("M2 — choix du constructeur : le seul, ou celui annoté @Inject", () -> {
            Spec.eq(of(TwoCtors.class, Catalog.class).start().getBean(TwoCtors.class).how, "injecté", "constructeur utilisé");
            var e = Spec.raises(BeanException.class, () -> of(Ambiguous.class, Catalog.class), "deux constructeurs sans @Inject");
            Spec.eq(e.getMessage(), "Ambiguous a 2 constructeurs : annote celui à utiliser avec @Inject", "message");
        });

        Spec.test("M2 — dépendance manquante ou ambiguë : le démarrage échoue avec un message clair", () -> {
            var missing = Spec.raises(BeanException.class, () -> of(Reports.class).start(), "Reports sans Pool");
            Spec.eq(missing.getMessage(), "aucun bean de type Pool (demandé par reports)", "message pour une dépendance manquante");
            var ambiguous = Spec.raises(BeanException.class, () -> of(Stripe.class, Paypal.class, Checkout.class).start(), "deux Gateway");
            Spec.eq(ambiguous.getMessage(), "2 beans de type Gateway (demandé par checkout) : stripe, paypal", "message pour une dépendance ambiguë");
        });

        Spec.test("M2 — un cycle est détecté et décrit", () -> {
            var e = Spec.raises(BeanException.class, () -> of(A.class, B.class, C.class).start(), "A → B → C → A");
            Spec.eq(e.getMessage(), "cycle de dépendances : a → b → c → a", "message du cycle");
            var fromB = Spec.raises(BeanException.class, () -> of(A.class, B.class, C.class).getBean(B.class), "le même cycle, demandé depuis B");
            Spec.eq(fromB.getMessage(), "cycle de dépendances : b → c → a → b", "message du cycle vu depuis b");
        });

        // ===================== M3 =====================
        Spec.test("M3 — @PostConstruct après l'injection, même sur une méthode privée", () -> {
            EVENTS.clear();
            var c = of(Journal.class, Sink.class).start();
            Spec.check(c.getBean(Journal.class).ready, "Journal.init (privée, @PostConstruct) doit avoir été appelée");
            Spec.eq(EVENTS, List.of("sink ouvert", "journal prêt"), "ordre des initialisations (la dépendance d'abord)");
        });

        Spec.test("M3 — close() : @PreDestroy dans l'ordre inverse de création, jamais pour un prototype", () -> {
            var c = of(Journal.class, Sink.class, Hold.class).start();
            c.getBean(Hold.class);
            EVENTS.clear();
            c.close();
            Spec.eq(EVENTS, List.of("journal vidé", "sink fermé"), "événements de close() (le journal avant son support, hold jamais)");
        });

        Spec.test("M3 — un démarrage raté détruit ce qui était déjà créé", () -> {
            EVENTS.clear();
            var e = Spec.raises(BeanException.class, () -> of(Sink.class, Journal.class, Broken.class).start(), "Broken lève une exception");
            Spec.eq(e.getMessage(), "échec de création de broken : clé API absente", "message de l'échec");
            Spec.eq(EVENTS, List.of("sink ouvert", "journal prêt", "journal vidé", "sink fermé"),
                    "événements : les beans créés avant l'échec doivent être détruits");
        });

        Spec.test("M3 — @PostConstruct avec paramètre : refusé", () -> {
            var e = Spec.raises(BeanException.class, () -> of(BadInit.class).start(), "BadInit");
            Spec.eq(e.getMessage(), "badInit.init : @PostConstruct exige une méthode sans paramètre", "message");
        });

        Spec.done();
    }
}
