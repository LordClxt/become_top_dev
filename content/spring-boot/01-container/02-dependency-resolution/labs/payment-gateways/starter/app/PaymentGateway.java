package app;

/** Un prestataire de paiement. Fourni : ne pas modifier. */
public interface PaymentGateway {
    /** Débite le montant (en centimes) et renvoie l'identifiant de la transaction. */
    String charge(int amountCents);
}
