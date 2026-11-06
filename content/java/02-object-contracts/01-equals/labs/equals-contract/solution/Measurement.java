import java.util.Objects;

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

    @Override
    public boolean equals(Object o) {
        return o instanceof Measurement m
                && Double.compare(m.value, value) == 0   // NaN égal à NaN : equals reste réflexif
                && Objects.equals(m.sensor, sensor);     // sensor peut être null
    }

    @Override
    public int hashCode() {
        return 31 * Objects.hashCode(sensor) + Double.hashCode(value);
    }
}
