import java.util.Locale;

/** Lit une ligne de la console. */
final class CommandParser {
    private CommandParser() { throw new AssertionError(); }

    static Command parse(String line) {
        String[] w = line.strip().split("\\s+");
        return switch (w[0].toLowerCase(Locale.ROOT)) {
            case "buy" -> place(Side.BUY, w);
            case "sell" -> place(Side.SELL, w);
            case "cancel" -> {
                arity(w, 2, "cancel ID");
                yield new Cancel(number(w[1], "identifiant"));
            }
            case "book" -> {
                arity(w, 2, "book SYMBOLE");
                yield new Book(w[1].toUpperCase(Locale.ROOT));
            }
            case "quit" -> {
                arity(w, 1, "quit");
                yield new Quit();
            }
            case "" -> throw new IllegalArgumentException("ligne vide");
            default -> throw new IllegalArgumentException("commande inconnue : " + w[0]);
        };
    }

    private static Place place(Side side, String[] w) {
        arity(w, 5, w[0] + " QUANTITÉ SYMBOLE @ PRIX");
        if (!w[3].equals("@")) throw new IllegalArgumentException("« @ » attendu avant le prix");
        return new Place(side, w[2].toUpperCase(Locale.ROOT), number(w[1], "quantité"), cents(w[4]));
    }

    /** "12", "12.5" ou "12.50" → 1250, sans jamais passer par un double. */
    static long cents(String price) {
        if (!price.matches("\\d+(\\.\\d{1,2})?")) throw new IllegalArgumentException("prix invalide : " + price);
        int dot = price.indexOf('.');
        String units = dot < 0 ? price : price.substring(0, dot);
        String decimals = dot < 0 ? "00" : (price.substring(dot + 1) + "0").substring(0, 2);
        try {
            return Math.addExact(Math.multiplyExact(Long.parseLong(units), 100), Long.parseLong(decimals));
        } catch (NumberFormatException | ArithmeticException e) {
            throw new IllegalArgumentException("prix trop grand : " + price);
        }
    }

    private static long number(String s, String what) {
        if (!s.matches("\\d{1,18}")) throw new IllegalArgumentException(what + " invalide : " + s);
        return Long.parseLong(s);
    }

    private static void arity(String[] w, int count, String usage) {
        if (w.length != count) throw new IllegalArgumentException("usage : " + usage);
    }
}
