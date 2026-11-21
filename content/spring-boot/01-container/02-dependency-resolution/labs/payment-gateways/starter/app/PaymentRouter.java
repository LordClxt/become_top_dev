package app;

import java.util.List;

/** Choisit le prestataire d'après le moyen de paiement demandé par le client ("stripe", "paypal"…). */
public class PaymentRouter {

    public PaymentRouter(List<PaymentGateway> gateways) {
        // TODO : garder les prestataires de façon à les retrouver par leur nom
    }

    public String charge(String method, int amountCents) {
        throw new UnsupportedOperationException("à implémenter");
    }
}
