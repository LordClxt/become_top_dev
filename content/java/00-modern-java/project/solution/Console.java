/** Rejoue un script de commandes et produit le transcript. */
final class Console {
    private Console() { throw new AssertionError(); }

    static String run(String script) {
        var session = new Session();
        var out = new StringBuilder();
        String[] lines = script.split("\n", -1);
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].strip();
            if (line.isEmpty() || line.startsWith("#")) continue;
            Reply reply;
            try {
                reply = session.handle(CommandParser.parse(line));
            } catch (IllegalArgumentException e) {
                out.append("ligne ").append(i + 1).append(" : ").append(e.getMessage()).append('\n');
                continue;
            }
            out.append(render(reply));
            if (reply instanceof Bye) break;   // les lignes après quit ne sont plus lues
        }
        return out.toString();
    }

    static String render(Reply reply) {
        return switch (reply) {
            case Accepted(long id) -> "ordre " + id + " accepté\n";
            case Cancelled(long id) -> "ordre " + id + " annulé\n";
            case Rejected(String reason) -> "refusé : " + reason + "\n";
            case Bye() -> "au revoir\n";
            case BookView(String symbol, var asks, var bids) when asks.isEmpty() && bids.isEmpty() -> "carnet " + symbol + " vide\n";
            case BookView(String symbol, var asks, var bids) -> {
                var sb = new StringBuilder("carnet ").append(symbol).append('\n');
                for (Level l : asks.reversed()) sb.append("  vente ").append(l.qty()).append(" @ ").append(price(l.priceCents())).append('\n');
                for (Level l : bids) sb.append("  achat ").append(l.qty()).append(" @ ").append(price(l.priceCents())).append('\n');
                yield sb.toString();
            }
        };
    }

    static String price(long cents) {
        return "%d.%02d".formatted(cents / 100, cents % 100);
    }
}
