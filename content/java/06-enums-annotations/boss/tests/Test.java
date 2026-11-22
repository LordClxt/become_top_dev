import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;

public class Test {
    static class TradingDesk implements ConsoleHandler {
        @Command(value = "buy", roles = Role.TRADER)
        @Alias("b")
        @Alias("achat")
        public String buy(List<String> args) { return "achat " + String.join(" ", args); }

        @Command(value = "cancel", roles = { Role.TRADER, Role.RISK })
        @Alias("c")
        public String cancel(List<String> args) {
            if (args.isEmpty()) throw new IllegalArgumentException("id manquant");
            return "annulé " + args.get(0);
        }

        public String helper(List<String> args) { return "pas une commande"; }
    }

    static class Info implements ConsoleHandler {
        @Command("status")
        public String status(List<String> args) { return "ok " + args.size(); }

        @Command(value = "halt", roles = Role.ADMIN)
        public String halt(List<String> args) { return "arrêt"; }
    }

    static class NotPublic implements ConsoleHandler {
        @Command("secret")
        String secret(List<String> args) { return ""; }
    }

    static class WrongParams implements ConsoleHandler {
        @Command("count")
        public String count(int n) { return ""; }
    }

    static class StaticCommand implements ConsoleHandler {
        @Command("ping")
        public static String ping(List<String> args) { return "pong"; }
    }

    static class Clash implements ConsoleHandler {
        @Command("b")
        public String other(List<String> args) { return ""; }
    }

    static Router router() { return new Router(new TradingDesk(), new Info()); }

    static void rejected(String needle, Supplier<Object> build) {
        try {
            build.get();
            Spec.check(false, "la construction aurait dû être refusée (" + needle + ")");
        } catch (IllegalArgumentException e) {
            Spec.check(String.valueOf(e.getMessage()).contains(needle), "le message doit nommer " + needle + " : " + e.getMessage());
        }
    }

    static void compiles(String name, String source, boolean expected) {
        var r = Javac.client(name, "import java.util.*;\n" + source, "-Xlint:all", "-Werror");
        Spec.check(r.clean() == expected, (expected ? "doit compiler sans avertissement :\n" : "ne doit pas compiler :\n") + source + "\n" + r.messages());
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("une commande annotée s'exécute avec ses arguments", () -> {
            Router r = router();
            Spec.eq(r.run(Role.TRADER, "buy 10 ACME"), "achat 10 ACME", "buy");
            Spec.eq(r.run(Role.VIEWER, "  status   a b "), "ok 2", "status, espaces en trop");
        });

        Spec.test("un ou plusieurs alias", () -> {
            Router r = router();
            Spec.eq(r.run(Role.TRADER, "c o-1"), "annulé o-1", "un seul alias");
            Spec.eq(r.run(Role.TRADER, "b 5 XYZ"), "achat 5 XYZ", "premier de deux alias");
            Spec.eq(r.run(Role.TRADER, "achat 1 Q"), "achat 1 Q", "second de deux alias");
        });

        Spec.test("une méthode non annotée n'est pas une commande", () -> {
            Router r = router();
            Spec.eq(r.run(Role.ADMIN, "sell 1"), "inconnu: sell", "commande inexistante");
            Spec.eq(r.run(Role.ADMIN, "helper"), "inconnu: helper", "méthode publique sans @Command");
        });

        Spec.test("les rôles sont vérifiés, ADMIN peut tout", () -> {
            Router r = router();
            Spec.eq(r.run(Role.VIEWER, "buy 1 X"), "refusé: buy", "VIEWER ne négocie pas");
            Spec.eq(r.run(Role.VIEWER, "b 1 X"), "refusé: buy", "ni par un alias");
            Spec.eq(r.run(Role.RISK, "cancel o-2"), "annulé o-2", "RISK annule");
            Spec.eq(r.run(Role.RISK, "halt"), "refusé: halt", "RISK n'arrête pas");
            Spec.eq(r.run(Role.ADMIN, "buy 1 X"), "achat 1 X", "ADMIN négocie");
            Spec.eq(r.run(Role.ADMIN, "halt"), "arrêt", "ADMIN arrête");
        });

        Spec.test("l'erreur d'une commande est rendue, pas levée", () -> {
            Spec.eq(router().run(Role.TRADER, "cancel"), "erreur: id manquant", "cancel sans id");
        });

        Spec.test("rôles par commande, commandes par rôle", () -> {
            Router r = router();
            Spec.eq(r.rolesFor("cancel"), EnumSet.of(Role.TRADER, Role.RISK, Role.ADMIN), "rolesFor(cancel)");
            Spec.eq(r.rolesFor("achat"), EnumSet.of(Role.TRADER, Role.ADMIN), "rolesFor par alias");
            Spec.eq(r.rolesFor("status"), EnumSet.allOf(Role.class), "rolesFor(status) : tous");
            Spec.raises(IllegalArgumentException.class, () -> r.rolesFor("nope"), "rolesFor d'une commande inconnue");
            Map<Role, Set<String>> by = r.commandsByRole();
            Spec.eq(List.copyOf(by.keySet()), List.of(Role.values()), "tous les rôles, dans l'ordre");
            Spec.eq(List.copyOf(by.get(Role.VIEWER)), List.of("status"), "VIEWER");
            Spec.eq(List.copyOf(by.get(Role.TRADER)), List.of("buy", "cancel", "status"), "TRADER");
            Spec.eq(List.copyOf(by.get(Role.RISK)), List.of("cancel", "status"), "RISK");
            Spec.eq(List.copyOf(by.get(Role.ADMIN)), List.of("buy", "cancel", "halt", "status"), "ADMIN");
            Spec.raises(UnsupportedOperationException.class, () -> r.rolesFor("buy").add(Role.VIEWER), "élargir les droits de buy");
        });

        Spec.test("les déclarations invalides sont refusées à la construction", () -> {
            rejected("secret", () -> new Router(new NotPublic()));
            rejected("count", () -> new Router(new WrongParams()));
            rejected("ping", () -> new Router(new StaticCommand()));
            rejected("b", () -> new Router(new TradingDesk(), new Clash()));
        });

        Spec.test("le compilateur fait sa part", () -> {
            compiles("OnClass", "@Command(\"x\") class OnClass { }", false);
            compiles("AnyObject", "class AnyObject { void f() { new Router(new Object()); } }", false);
            compiles("MyHandler", "class MyHandler implements ConsoleHandler {\n"
                    + "  @Command(\"hi\") @Alias(\"h\") @Alias(\"hello\") public String hi(List<String> a) { return \"hi\"; }\n"
                    + "  void f() { new Router(this, new MyHandler()); }\n}", true);
        });

        Spec.test("Router.java et Command.java : zéro avertissement (-Xlint:all -Werror)", () -> {
            for (String f : List.of("Router.java", "Command.java")) {
                var res = Javac.file(f, "-Xlint:all", "-Werror");
                Spec.check(res.clean(), f + " :\n" + res.messages());
            }
        });

        Spec.done();
    }
}
