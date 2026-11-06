import java.util.Comparator;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Un point GPS (latitude, longitude en degrés décimaux), immuable, précis au micro-degré.
 *
 * <p>Forme canonique, calculée une fois dans {@link #of} : arrondi à 6 décimales, longitude ramenée dans
 * [-180, 180), longitude 0 aux pôles. Stockée en micro-degrés entiers : equals, hashCode et compareTo
 * sont exacts et reposent sur les mêmes deux champs. Il n'y a donc pas de -0.0 ni de NaN.
 */
public final class GeoPoint implements Comparable<GeoPoint> {
    private static final long E6 = 1_000_000L;
    private static final Pattern FORMAT = Pattern.compile("\\s*(-?\\d+(?:\\.\\d+)?)\\s*,\\s*(-?\\d+(?:\\.\\d+)?)\\s*");
    private static final Comparator<GeoPoint> ORDER =
            Comparator.comparingInt((GeoPoint p) -> p.latE6).thenComparingInt(p -> p.lonE6);

    private final int latE6;
    private final int lonE6;

    private GeoPoint(int latE6, int lonE6) {
        this.latE6 = latE6;
        this.lonE6 = lonE6;
    }

    public static GeoPoint of(double latitude, double longitude) {
        if (!Double.isFinite(latitude) || !Double.isFinite(longitude)) {
            throw new IllegalArgumentException("coordonnées non finies : " + latitude + ", " + longitude);
        }
        long lat = Math.round(latitude * E6);
        if (lat < -90 * E6 || lat > 90 * E6) throw new IllegalArgumentException("latitude hors [-90, 90] : " + latitude);
        long lon = Math.floorMod(Math.round(longitude * E6) + 180 * E6, 360 * E6) - 180 * E6;
        if (Math.abs(lat) == 90 * E6) lon = 0; // aux pôles, toutes les longitudes désignent le même point
        return new GeoPoint((int) lat, (int) lon);
    }

    /**
     * Relit le format de {@link #toString()} : « latitude,longitude » en degrés décimaux, point comme
     * séparateur décimal, espaces tolérés autour de la virgule.
     */
    public static GeoPoint parse(String text) {
        Matcher m = FORMAT.matcher(text);
        if (!m.matches()) throw new IllegalArgumentException("coordonnées illisibles : \"" + text + "\"");
        return of(Double.parseDouble(m.group(1)), Double.parseDouble(m.group(2)));
    }

    public double latitude() { return latE6 / (double) E6; }

    public double longitude() { return lonE6 / (double) E6; }

    @Override
    public int compareTo(GeoPoint o) {
        return ORDER.compare(this, o);
    }

    @Override
    public boolean equals(Object o) {
        return o == this || (o instanceof GeoPoint p && p.latE6 == latE6 && p.lonE6 == lonE6);
    }

    @Override
    public int hashCode() {
        return 31 * Integer.hashCode(latE6) + Integer.hashCode(lonE6);
    }

    /**
     * Renvoie « latitude,longitude » avec exactement 6 décimales chacune, point décimal, sans espace :
     * par exemple « 48.856600,2.352200 » ou « -33.868800,151.209300 ». Ce format est garanti et relu
     * par {@link #parse(String)}.
     */
    @Override
    public String toString() {
        return String.format(Locale.ROOT, "%.6f,%.6f", latitude(), longitude());
    }
}
