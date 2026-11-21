import java.util.List;

public class Test {
    interface Gateway { String id(); }
    @Component static class Stripe implements Gateway { public String id() { return "stripe"; } }
    @Component @Primary static class Paypal implements Gateway { public String id() { return "paypal"; } }
    @Component static class Lydia implements Gateway { public String id() { return "lydia"; } }
    @Component @Primary static class Adyen implements Gateway { public String id() { return "adyen"; } }

    @Component static class Checkout { final Gateway gateway; Checkout(Gateway g) { gateway = g; } }
    @Component static class Router { final List<Gateway> all; Router(List<Gateway> all) { this.all = all; } }

    interface Check { }
    @Component static class Pipeline { final List<Check> checks; Pipeline(List<Check> c) { checks = c; } }

    @Component @Prototype static class Cart { static int created; Cart() { created++; } }
    @Component static class Desk { final Provider<Cart> carts; Desk(Provider<Cart> carts) { this.carts = carts; } }
    @Component static class EagerDesk { final Provider<Gateway> gw; EagerDesk(Provider<Gateway> gw) { this.gw = gw; } }

    static String ids(List<Gateway> l) { return l.stream().map(Gateway::id).toList().toString(); }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("un seul candidat : il est injecté", () -> {
            var c = new MiniContainer().register(Stripe.class, Checkout.class).start();
            Spec.eq(((Checkout) c.getBean("checkout")).gateway.id(), "stripe", "gateway de Checkout");
        });

        Spec.test("plusieurs candidats : l'unique @Primary gagne", () -> {
            var c = new MiniContainer().register(Stripe.class, Paypal.class, Lydia.class, Checkout.class).start();
            Spec.eq(((Checkout) c.getBean("checkout")).gateway.id(), "paypal", "gateway de Checkout");
            Spec.check(((Checkout) c.getBean("checkout")).gateway == c.getBean("paypal"), "c'est le singleton paypal");
        });

        Spec.test("plusieurs candidats sans @Primary : erreur qui les liste", () -> {
            var e = Spec.raises(BeanException.class,
                    () -> new MiniContainer().register(Stripe.class, Lydia.class, Checkout.class).start(), "Stripe + Lydia");
            Spec.eq(e.getMessage(), "2 beans de type Gateway (demandé par checkout) : stripe, lydia", "message");
        });

        Spec.test("deux @Primary : erreur qui ne liste que les @Primary", () -> {
            var e = Spec.raises(BeanException.class,
                    () -> new MiniContainer().register(Stripe.class, Paypal.class, Adyen.class, Checkout.class).start(), "Paypal + Adyen");
            Spec.eq(e.getMessage(), "plusieurs beans @Primary de type Gateway (demandé par checkout) : paypal, adyen", "message");
        });

        Spec.test("aucun candidat : erreur", () -> {
            var e = Spec.raises(BeanException.class, () -> new MiniContainer().register(Checkout.class).start(), "sans Gateway");
            Spec.eq(e.getMessage(), "aucun bean de type Gateway (demandé par checkout)", "message");
        });

        Spec.test("List<T> : tous les candidats, dans l'ordre d'enregistrement, @Primary ou non", () -> {
            var c = new MiniContainer().register(Lydia.class, Router.class, Stripe.class, Paypal.class).start();
            var router = (Router) c.getBean("router");
            Spec.eq(ids(router.all), "[lydia, stripe, paypal]", "gateways du routeur");
            Spec.check(router.all.get(1) == c.getBean("stripe"), "les éléments sont les singletons du conteneur");
        });

        Spec.test("List<T> sans candidat : liste vide, pas d'erreur", () -> {
            var c = new MiniContainer().register(Pipeline.class).start();
            Spec.eq(((Pipeline) c.getBean("pipeline")).checks, List.of(), "checks du pipeline");
        });

        Spec.test("Provider<T> : rien n'est créé avant get(), et chaque get() redemande le bean", () -> {
            Cart.created = 0;
            var c = new MiniContainer().register(Cart.class, Desk.class).start();
            var desk = (Desk) c.getBean("desk");
            Spec.eq(Cart.created, 0, "paniers créés au démarrage (un prototype n'est créé qu'à la demande)");
            Spec.check(desk.carts.get() != desk.carts.get(), "deux get() doivent donner deux paniers");
            Spec.eq(Cart.created, 2, "paniers créés après deux get()");
        });

        Spec.test("Provider<T> : l'erreur n'arrive qu'à l'appel de get()", () -> {
            var c = new MiniContainer().register(EagerDesk.class).start();
            var desk = (EagerDesk) c.getBean("eagerDesk");
            var e = Spec.raises(BeanException.class, desk.gw::get, "get() sans aucun Gateway");
            Spec.eq(e.getMessage(), "aucun bean de type Gateway (demandé par eagerDesk)", "message");
        });

        Spec.done();
    }
}
