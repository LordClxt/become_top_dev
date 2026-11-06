import java.util.List;

public class Test {
    static void same(String got, String expected, String what) {
        Spec.check(got.equals(expected), what + "\n--- obtenu ---\n" + got + "--- attendu ---\n" + expected);
    }

    public static void main(String[] args) {
        Spec.only(args);

        // ---------- Jalon 1 ----------
        Spec.test("M1 les records se valident", () -> {
            Spec.raises(IllegalArgumentException.class, () -> new Place(Side.BUY, "air", 1, 1), "symbole en minuscules");
            Spec.raises(IllegalArgumentException.class, () -> new Place(Side.BUY, "TOOLONG", 1, 1), "symbole de 7 lettres");
            Spec.raises(IllegalArgumentException.class, () -> new Place(Side.SELL, "AIR", 0, 1), "quantité nulle");
            Spec.raises(IllegalArgumentException.class, () -> new Place(Side.SELL, "AIR", 1, -5), "prix négatif");
            Spec.raises(NullPointerException.class, () -> new Place(null, "AIR", 1, 1), "côté null");
            Spec.raises(IllegalArgumentException.class, () -> new Cancel(0), "identifiant nul");
            Spec.raises(NullPointerException.class, () -> new Book(null), "symbole null");
        });

        Spec.test("M1 parse les quatre commandes", () -> {
            Spec.eq(CommandParser.parse("buy 100 AIR @ 12.50"), new Place(Side.BUY, "AIR", 100, 1_250), "buy");
            Spec.eq(CommandParser.parse("  SELL   50 air @ 12.6 "), new Place(Side.SELL, "AIR", 50, 1_260), "sell (casse et espaces)");
            Spec.eq(CommandParser.parse("Buy 1 BNP @ 61"), new Place(Side.BUY, "BNP", 1, 6_100), "prix entier");
            Spec.eq(CommandParser.parse("cancel 12"), new Cancel(12), "cancel");
            Spec.eq(CommandParser.parse("book ora"), new Book("ORA"), "book");
            Spec.eq(CommandParser.parse("QUIT"), new Quit(), "quit");
        });

        Spec.test("M1 prix exacts, sans double", () -> {
            Spec.eq(CommandParser.parse("buy 1 AIR @ 0.29"), new Place(Side.BUY, "AIR", 1, 29), "0.29 (en double : 28.999…)");
            Spec.eq(CommandParser.parse("buy 1 AIR @ 1.1"), new Place(Side.BUY, "AIR", 1, 110), "1.1");
            Spec.eq(CommandParser.parse("buy 1 AIR @ 92233720368547758.07"), new Place(Side.BUY, "AIR", 1, Long.MAX_VALUE), "le plus grand prix représentable");
        });

        Spec.test("M1 refuse les lignes mal formées", () -> {
            for (String bad : List.of("buy 100 AIR 12.50", "buy 100 AIR @ 12.505", "buy 100 AIR @ 12,50", "buy 100 AIR @ -1", "buy 100 AIR @ 0",
                    "buy -3 AIR @ 1", "buy x AIR @ 1", "buy 100 @ 1", "cancel", "cancel abc", "book", "book AIR BNP", "quit now", "hold 1", "",
                    "buy 1 AIR @ 92233720368547758.08", "buy 1 A1R @ 1")) {
                Spec.raises(IllegalArgumentException.class, () -> CommandParser.parse(bad), "parse(\"" + bad + "\")");
            }
        });

        // ---------- Jalon 2 ----------
        Spec.test("M2 ordres numérotés et annulations", () -> {
            var s = new Session();
            Spec.eq(s.handle(new Place(Side.BUY, "AIR", 100, 1_250)), new Accepted(1), "premier ordre");
            Spec.eq(s.handle(new Place(Side.SELL, "AIR", 10, 1_300)), new Accepted(2), "second ordre");
            Spec.eq(s.handle(new Cancel(1)), new Cancelled(1), "annulation");
            Spec.eq(s.handle(new Cancel(1)), new Rejected("ordre inconnu : 1"), "double annulation");
            Spec.eq(s.handle(new Cancel(9)), new Rejected("ordre inconnu : 9"), "ordre jamais créé");
            Spec.eq(s.handle(new Place(Side.BUY, "AIR", 1, 1)), new Accepted(3), "les numéros ne sont jamais réutilisés");
        });

        Spec.test("M2 carnet agrégé et trié", () -> {
            var s = new Session();
            s.handle(new Place(Side.BUY, "AIR", 100, 1_250));
            s.handle(new Place(Side.BUY, "AIR", 40, 1_240));
            s.handle(new Place(Side.BUY, "AIR", 60, 1_250));
            s.handle(new Place(Side.SELL, "AIR", 30, 1_270));
            s.handle(new Place(Side.SELL, "AIR", 20, 1_260));
            s.handle(new Place(Side.SELL, "BNP", 5, 6_000));
            s.handle(new Place(Side.BUY, "AIR", 7, 1_100));
            s.handle(new Cancel(7));
            var view = s.handle(new Book("AIR"));
            Spec.eq(view, new BookView("AIR", List.of(new Level(1_260, 20), new Level(1_270, 30)), List.of(new Level(1_250, 160), new Level(1_240, 40))), "carnet AIR");
            Spec.eq(s.handle(new Book("ORA")), new BookView("ORA", List.of(), List.of()), "carnet vide");
        });

        Spec.test("M2 fin de session", () -> {
            var s = new Session();
            Spec.eq(s.handle(new Quit()), new Bye(), "quit");
            Spec.eq(s.handle(new Place(Side.BUY, "AIR", 1, 1)), new Rejected("session fermée"), "ordre après quit");
            Spec.eq(s.handle(new Quit()), new Rejected("session fermée"), "second quit");
        });

        // ---------- Jalon 3 ----------
        Spec.test("M3 un script complet", () -> same(Console.run("""
                # ouverture
                buy 100 AIR @ 12.50
                sell 50 AIR @ 12.6
                buy 40 air @ 12.4
                sell 25 AIR @ 12.60
                buy 60 AIR @ 12.50

                book air
                cancel 3
                cancel 3
                book BNP
                quit
                buy 1 AIR @ 1
                """), """
                ordre 1 accepté
                ordre 2 accepté
                ordre 3 accepté
                ordre 4 accepté
                ordre 5 accepté
                carnet AIR
                  vente 75 @ 12.60
                  achat 160 @ 12.50
                  achat 40 @ 12.40
                ordre 3 annulé
                refusé : ordre inconnu : 3
                carnet BNP vide
                au revoir
                """, "transcript"));

        Spec.test("M3 erreurs avec numéro de ligne", () -> {
            String got = Console.run("buy 1 AIR @ 1\n\nbuy 1 AIR @ 1.234\nhold 2\nsell 3 BNP @ 7.05\nbook BNP\n");
            String[] lines = got.split("\n", -1);
            Spec.eq(lines.length, 7, "nombre de lignes du transcript (5 lignes + carnet de 2 lignes, plus la fin)");
            Spec.eq(lines[0], "ordre 1 accepté", "ligne 1");
            Spec.check(lines[1].startsWith("ligne 3 : "), "une erreur à la 3e ligne du script commence par « ligne 3 : », obtenu « " + lines[1] + " »");
            Spec.check(lines[2].startsWith("ligne 4 : "), "une erreur à la 4e ligne du script commence par « ligne 4 : », obtenu « " + lines[2] + " »");
            Spec.eq(lines[3], "ordre 2 accepté", "après les erreurs, le script continue");
            Spec.eq(lines[4] + "|" + lines[5], "carnet BNP|  vente 3 @ 7.05", "carnet");
        });

        Spec.test("M3 rien avant, rien après", () -> {
            same(Console.run(""), "", "script vide");
            same(Console.run("quit\nceci n'est pas une commande\n"), "au revoir\n", "les lignes après quit ne sont pas lues");
        });

        Spec.done();
    }
}
