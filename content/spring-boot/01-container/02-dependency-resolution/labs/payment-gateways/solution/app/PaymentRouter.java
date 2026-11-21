package app;

import java.util.Map;
import java.util.TreeMap;

/** Choisit le prestataire d'après le moyen de paiement demandé par le client ("stripe", "paypal"…). */
public class PaymentRouter {
    private final Map<String, PaymentGateway> gateways;

    public PaymentRouter(Map<String, PaymentGateway> gateways) {
        this.gateways = new TreeMap<>(gateways);   // copie triée : message d'erreur stable
    }

    public String charge(String method, int amountCents) {
        PaymentGateway gateway = gateways.get(method);
        if (gateway == null) {
            throw new IllegalArgumentException("moyen de paiement inconnu : " + method
                    + " (disponibles : " + String.join(", ", gateways.keySet()) + ")");
        }
        return gateway.charge(amountCents);
    }
}
