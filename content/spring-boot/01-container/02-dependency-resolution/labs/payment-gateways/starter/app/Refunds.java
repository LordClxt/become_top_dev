package app;

/** Rembourse avec le prestataire par défaut, après le contrôle anti-fraude s'il existe. */
public class Refunds {
    private final PaymentGateway gateway;
    private final FraudCheck fraudCheck;

    public Refunds(PaymentGateway gateway, FraudCheck fraudCheck) {
        this.gateway = gateway;
        this.fraudCheck = fraudCheck;
    }

    public String refund(int amountCents) {
        if (!fraudCheck.allowsRefund(amountCents)) {
            throw new IllegalStateException("remboursement bloqué par le contrôle anti-fraude");
        }
        return gateway.charge(-amountCents);
    }
}
