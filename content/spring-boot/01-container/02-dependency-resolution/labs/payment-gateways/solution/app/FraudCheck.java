package app;

/** Contrôle anti-fraude, optionnel : seuls certains déploiements en ont un. Fourni : ne pas modifier. */
@FunctionalInterface
public interface FraudCheck {
    boolean allowsRefund(int amountCents);
}
