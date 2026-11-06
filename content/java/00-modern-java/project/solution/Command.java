import java.util.Objects;

/** Une commande tapée dans la console. */
sealed interface Command permits Place, Cancel, Book, Quit {

    static String symbol(String symbol) {
        Objects.requireNonNull(symbol, "symbol");
        if (!symbol.matches("[A-Z]{1,5}")) throw new IllegalArgumentException("symbole invalide : " + symbol);
        return symbol;
    }

    static long positive(long value, String what) {
        if (value <= 0) throw new IllegalArgumentException(what + " doit être positif : " + value);
        return value;
    }
}

record Place(Side side, String symbol, long qty, long limitCents) implements Command {
    Place {
        Objects.requireNonNull(side, "side");
        Command.symbol(symbol);
        Command.positive(qty, "la quantité");
        Command.positive(limitCents, "le prix");
    }
}

record Cancel(long orderId) implements Command {
    Cancel { Command.positive(orderId, "l'identifiant"); }
}

record Book(String symbol) implements Command {
    Book { Command.symbol(symbol); }
}

record Quit() implements Command { }
