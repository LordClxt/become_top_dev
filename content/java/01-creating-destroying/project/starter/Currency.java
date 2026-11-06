/** Devises gérées par Ordo, avec leur nombre de décimales. Fourni. */
public enum Currency {
    EUR(2), USD(2), JPY(0);

    private final int digits;

    Currency(int digits) { this.digits = digits; }

    public int digits() { return digits; }
}
