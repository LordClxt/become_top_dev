package app;

import org.springframework.beans.factory.ObjectProvider;

/** Rembourse avec le prestataire par défaut, après le contrôle anti-fraude s'il existe. */
public class Refunds {
    private final PaymentGateway gateway;
    private final ObjectProvider<FraudCheck> fraudCheck;

    public Refunds(PaymentGateway gateway, ObjectProvider<FraudCheck> fraudCheck) {
        this.gateway = gateway;
        this.fraudCheck = fraudCheck;
    }

    public String refund(int amountCents) {
        FraudCheck check = fraudCheck.getIfAvailable();
        if (check != null && !check.allowsRefund(amountCents)) {
            throw new IllegalStateException("remboursement bloqué par le contrôle anti-fraude");
        }
        return gateway.charge(-amountCents);
    }
}
