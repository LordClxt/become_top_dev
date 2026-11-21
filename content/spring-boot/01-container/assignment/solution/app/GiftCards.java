package app;

/** Cartes cadeaux. Déclarées par une méthode @Bean. Fourni : ne pas modifier. */
public class GiftCards {
    public boolean accepts(String code) { return code.startsWith("GIFT-"); }
}
