/** Une commande tapée dans la console. */
sealed interface Command permits Place, Cancel, Book, Quit { }

// TODO (jalon 1) : chaque record valide ses composants
record Place(Side side, String symbol, long qty, long limitCents) implements Command { }

record Cancel(long orderId) implements Command { }

record Book(String symbol) implements Command { }

record Quit() implements Command { }
