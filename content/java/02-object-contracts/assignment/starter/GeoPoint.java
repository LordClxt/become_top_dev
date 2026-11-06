/** Un point GPS (latitude, longitude en degrés décimaux), immuable. */
public final class GeoPoint implements Comparable<GeoPoint> {

    // TODO : champs canoniques, constructeur privé.

    public static GeoPoint of(double latitude, double longitude) {
        throw new UnsupportedOperationException("of à écrire");
    }

    public static GeoPoint parse(String text) {
        throw new UnsupportedOperationException("parse à écrire");
    }

    public double latitude() {
        throw new UnsupportedOperationException("latitude à écrire");
    }

    public double longitude() {
        throw new UnsupportedOperationException("longitude à écrire");
    }

    @Override
    public int compareTo(GeoPoint o) {
        throw new UnsupportedOperationException("compareTo à écrire");
    }

    // TODO : equals, hashCode, toString (format spécifié).
}
