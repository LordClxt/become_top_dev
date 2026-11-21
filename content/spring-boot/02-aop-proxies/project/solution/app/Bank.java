package app;

/** La banque simulée : indisponible les n premières fois, refuse la carte « declined ». Fourni. */
public class Bank {
    private int unavailableFor;
    private int calls;

    public void setUnavailableFor(int calls) { this.unavailableFor = calls; }

    public int calls() { return calls; }

    public String debit(String card, int amountCents) {
        calls++;
        if (calls <= unavailableFor) throw new PaymentUnavailableException("prestataire indisponible");
        if (card.equals("declined")) throw new PaymentDeclinedException("carte refusée");
        return "pay-" + calls + "-" + amountCents;
    }
}
