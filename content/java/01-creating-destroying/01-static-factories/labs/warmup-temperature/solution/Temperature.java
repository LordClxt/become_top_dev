/** Une température, stockée en degrés Celsius. Créée par {@link #ofCelsius}, {@link #ofFahrenheit} ou {@link #ofKelvin}. */
public final class Temperature {
    public static final double ABSOLUTE_ZERO_CELSIUS = -273.15;

    private final double celsius;

    private Temperature(double celsius) {
        this.celsius = celsius;
    }

    public static Temperature ofCelsius(double celsius) {
        if (Double.isNaN(celsius) || celsius < ABSOLUTE_ZERO_CELSIUS) {
            throw new IllegalArgumentException("sous le zéro absolu : " + celsius + " °C");
        }
        return new Temperature(celsius);
    }

    public static Temperature ofFahrenheit(double fahrenheit) {
        return ofCelsius((fahrenheit - 32) * 5 / 9);
    }

    public static Temperature ofKelvin(double kelvin) {
        return ofCelsius(kelvin + ABSOLUTE_ZERO_CELSIUS);
    }

    public double celsius() {
        return celsius;
    }
}
