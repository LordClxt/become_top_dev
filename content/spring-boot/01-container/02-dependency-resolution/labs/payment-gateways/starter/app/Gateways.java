package app;

/** Les prestataires disponibles. Fourni : ne pas modifier. */
final class Gateways {
    private Gateways() { }

    static final class Stripe implements PaymentGateway {
        public String charge(int amountCents) { return "stripe-" + amountCents; }
    }

    static final class Paypal implements PaymentGateway {
        public String charge(int amountCents) { return "paypal-" + amountCents; }
    }
}
