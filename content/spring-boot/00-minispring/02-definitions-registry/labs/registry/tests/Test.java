import java.util.List;

public class Test {
    @Component static class Catalog { }
    @Component("prices") static class PriceCalculator { }
    @Component @Prototype static class Cart { }
    static class Plain { }
    interface Gateway { }
    @Component static class Stripe implements Gateway { }
    @Component static class Paypal implements Gateway { }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("register lit les définitions dans l'ordre, sans créer d'objet", () -> {
            var r = new Registry().register(Catalog.class, PriceCalculator.class, Cart.class);
            Spec.eq(r.definitions().stream().map(BeanDefinition::name).toList(), List.of("catalog", "prices", "cart"), "noms des définitions");
            Spec.check(r.definitions().get(2).prototype(), "cart doit être un prototype");
            Spec.check(!r.definitions().get(0).prototype(), "catalog doit être un singleton");
            Spec.eq(r.instancesCreated(), 0, "objets créés par register");
        });

        Spec.test("un singleton est créé une seule fois, quel que soit le chemin", () -> {
            var r = new Registry().register(Catalog.class);
            Object a = r.getBean("catalog");
            Object b = r.getBean(Catalog.class);
            Spec.check(a == b, "getBean(\"catalog\") et getBean(Catalog.class) doivent renvoyer le même objet");
            Spec.eq(r.instancesCreated(), 1, "objets créés après deux getBean du même singleton");
        });

        Spec.test("un singleton n'est créé qu'à la première demande", () -> {
            var r = new Registry().register(Catalog.class, PriceCalculator.class);
            r.getBean("prices");
            Spec.eq(r.instancesCreated(), 1, "objets créés après getBean(\"prices\") (catalog n'a pas été demandé)");
        });

        Spec.test("un prototype est créé à chaque demande", () -> {
            var r = new Registry().register(Cart.class);
            Spec.check(r.getBean(Cart.class) != r.getBean(Cart.class), "deux paniers différents");
            Spec.eq(r.instancesCreated(), 2, "objets créés après deux getBean(Cart.class)");
        });

        Spec.test("getBean par type : sous-types acceptés, ambiguïté refusée", () -> {
            var one = new Registry().register(Stripe.class, Catalog.class);
            Spec.check(one.getBean(Gateway.class) instanceof Stripe, "getBean(Gateway.class) avec un seul Gateway");
            var two = new Registry().register(Stripe.class, Paypal.class);
            var e = Spec.raises(BeanException.class, () -> two.getBean(Gateway.class), "getBean(Gateway.class) avec deux Gateway");
            Spec.eq(e.getMessage(), "2 beans de type Gateway : stripe, paypal", "message d'ambiguïté");
            var none = Spec.raises(BeanException.class, () -> new Registry().getBean(Gateway.class), "getBean sans candidat");
            Spec.eq(none.getMessage(), "aucun bean de type Gateway", "message sans candidat");
        });

        Spec.test("erreurs d'enregistrement et de nom", () -> {
            Spec.raises(BeanException.class, () -> new Registry().register(Plain.class), "register(Plain) sans @Component");
            var dup = Spec.raises(BeanException.class, () -> new Registry().register(Catalog.class, Catalog.class), "Catalog deux fois");
            Spec.eq(dup.getMessage(), "bean déjà défini : catalog", "message pour un doublon");
            var unknown = Spec.raises(BeanException.class, () -> new Registry().getBean("x"), "getBean(\"x\")");
            Spec.eq(unknown.getMessage(), "aucun bean nommé x", "message pour un nom inconnu");
        });

        Spec.done();
    }
}
