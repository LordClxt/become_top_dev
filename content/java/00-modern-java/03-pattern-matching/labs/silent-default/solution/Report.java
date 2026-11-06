import java.util.List;

/** Le rapport du soir envoyé à la comptabilité. */
final class Report {
    private Report() { throw new AssertionError(); }

    static String daily(List<Event> events) {
        int sales = 0, refunds = 0, chargebacks = 0, fees = 0;
        for (Event e : events) {
            switch (e) {           // instruction switch sur un type scellé : exhaustive elle aussi
                case Sale _ -> sales++;
                case Refund _ -> refunds++;
                case Chargeback _ -> chargebacks++;
                case Fee _ -> fees++;
            }
        }
        return """
            ventes : %d
            remboursements : %d
            rétrofacturations : %d
            frais : %d
            solde : %s
            """.formatted(sales, refunds, chargebacks, fees, euros(Ledger.balance(events)));
    }

    static String euros(long cents) {
        String sign = cents < 0 ? "-" : "";
        long abs = Math.abs(cents);
        return "%s%d,%02d €".formatted(sign, abs / 100, abs % 100);
    }
}
