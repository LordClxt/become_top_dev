package app;

/** Échoue les n premières fois, puis réussit. Fourni : ne pas modifier. */
public class FlakyPaymentClient implements PaymentClient {
    private final int failuresBeforeSuccess;
    public int charges;
    public int refunds;

    public FlakyPaymentClient(int failuresBeforeSuccess) { this.failuresBeforeSuccess = failuresBeforeSuccess; }

    @Override
    @Retry(attempts = 3)
    public String charge(String key, int amountCents) {
        charges++;
        if (charges <= failuresBeforeSuccess) throw new IllegalStateException("prestataire indisponible");
        return "pay-" + key;
    }

    @Override
    public String refund(String paymentId) {
        refunds++;
        if (refunds <= failuresBeforeSuccess) throw new IllegalStateException("prestataire indisponible");
        return "refund-" + paymentId;
    }
}
