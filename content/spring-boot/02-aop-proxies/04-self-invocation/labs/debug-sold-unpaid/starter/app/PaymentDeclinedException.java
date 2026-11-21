package app;

/** La banque refuse le paiement. Exception vérifiée : l'appelant doit la traiter. */
public class PaymentDeclinedException extends Exception {
    public PaymentDeclinedException(String message) { super(message); }
}
