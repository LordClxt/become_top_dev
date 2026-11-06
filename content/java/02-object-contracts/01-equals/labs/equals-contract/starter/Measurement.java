/** Une mesure : capteur (null = saisie manuelle) et valeur (NaN = capteur en panne). */
public final class Measurement {
    private final String sensor;
    private final double value;

    public Measurement(String sensor, double value) {
        this.sensor = sensor;
        this.value = value;
    }

    public String sensor() { return sensor; }

    public double value() { return value; }

    public boolean equals(Measurement m) {
        return m != null && m.value == value && m.sensor.equals(sensor);
    }

    @Override
    public int hashCode() {
        return 31 * (sensor == null ? 0 : sensor.hashCode()) + Double.hashCode(value);
    }
}
