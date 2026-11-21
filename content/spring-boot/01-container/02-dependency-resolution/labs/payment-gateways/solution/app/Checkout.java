package app;

/** Le paiement d'une réservation : toujours le prestataire par défaut. */
public class Checkout {
    private final PaymentGateway gateway;

    public Checkout(PaymentGateway gateway) {
        this.gateway = gateway;
    }

    public String pay(int amountCents) {
        return gateway.charge(amountCents);
    }
}
