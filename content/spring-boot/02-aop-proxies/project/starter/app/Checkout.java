package app;

import org.springframework.stereotype.Service;

/** M3 — le paiement d'une commande, appelé par l'API. */
@Service
public class Checkout {
    private final PaymentClient payments;

    public Checkout(PaymentClient payments) { this.payments = payments; }

    public String pay(String orderId, String card, int amountCents) {
        return payments.charge(card, amountCents);
    }
}
