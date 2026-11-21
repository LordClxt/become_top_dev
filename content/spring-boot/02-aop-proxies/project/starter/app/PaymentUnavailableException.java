package app;

/** Le prestataire ne répond pas : réessayer a un sens. Fourni. */
public class PaymentUnavailableException extends RuntimeException {
    public PaymentUnavailableException(String message) { super(message); }
}
