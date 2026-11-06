import java.util.List;

/** Le rapport du soir envoyé à la comptabilité. */
final class Report {
    private Report() { throw new AssertionError(); }

    static String daily(List<Event> events) {
        int sales = 0, refunds = 0, fees = 0, other = 0;
        for (Event e : events) {
            if (e instanceof Sale) sales++;
            else if (e instanceof Refund) refunds++;
            else if (e instanceof Fee) fees++;
            else other++;
        }
        long balance = Ledger.balance(events);
        return """
            ventes : %d
            remboursements : %d
            rétrofacturations : %d
            frais : %d
            solde : %s
            """.formatted(sales, refunds, 0, fees, euros(balance));
    }

    static String euros(long cents) {
        String sign = cents < 0 ? "-" : "";
        long abs = Math.abs(cents);
        return "%s%d,%02d €".formatted(sign, abs / 100, abs % 100);
    }
}
