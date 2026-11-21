package app;

/** Le prestataire de paiement. Fourni : ne pas modifier. */
public interface Bank {
    String name();

    /** Vrai si le prestataire répond. */
    boolean ping();
}
