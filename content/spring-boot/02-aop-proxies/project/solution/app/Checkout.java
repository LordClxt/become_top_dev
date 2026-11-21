package app;

import org.springframework.stereotype.Service;

/** Le paiement d'une commande, appelé par l'API. */
@Service
public class Checkout {
    private final PaymentClient payments;

    public Checkout(PaymentClient payments) { this.payments = payments; }

    // L'audit est posé sur l'APPELANT : le conseil de @Retryable est inséré en tête de la chaîne du proxy
    // de PaymentClient (beforeExistingAdvisors), donc un audit sur charge() verrait chaque tentative.
    @Audited
    public String pay(String orderId, String card, int amountCents) {
        return payments.charge(card, amountCents);
    }
}
