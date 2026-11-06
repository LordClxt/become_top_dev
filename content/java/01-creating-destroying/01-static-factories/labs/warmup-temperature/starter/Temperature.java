/** Une température, stockée en degrés Celsius. */
public final class Temperature {
    public static final double ABSOLUTE_ZERO_CELSIUS = -273.15;

    private final double celsius;

    // TODO : personne en dehors de la classe ne doit appeler ce constructeur.
    // Il ne dit pas dans quelle unité est la valeur : c'est tout le problème.
    public Temperature(double celsius) {
        this.celsius = celsius;
    }

    // TODO : ajoute les fabriques statiques ofCelsius, ofFahrenheit et ofKelvin.
    // Sous le zéro absolu : IllegalArgumentException.

    public double celsius() {
        return celsius;
    }
}
