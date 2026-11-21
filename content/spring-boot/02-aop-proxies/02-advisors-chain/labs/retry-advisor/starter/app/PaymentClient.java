package app;

/** Le client du prestataire de paiement. Fourni : ne pas modifier. */
public interface PaymentClient {
    /** Idempotent (même clé = même paiement) : peut être réessayé sans risque. */
    String charge(String idempotencyKey, int amountCents);

    /** Pas idempotent : ne doit JAMAIS être réessayé automatiquement. */
    String refund(String paymentId);
}
