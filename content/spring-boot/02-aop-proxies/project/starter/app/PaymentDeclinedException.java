package app;

/** La banque refuse : réessayer ne changera rien. Fourni. */
public class PaymentDeclinedException extends RuntimeException {
    public PaymentDeclinedException(String message) { super(message); }
}
