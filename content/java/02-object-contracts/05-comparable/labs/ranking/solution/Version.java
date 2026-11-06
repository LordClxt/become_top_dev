import java.util.Comparator;

/** Une version « majeure.mineure.correctif ». Ordre naturel numérique, cohérent avec equals. */
public final class Version implements Comparable<Version> {
    private static final Comparator<Version> ORDER = Comparator.comparingInt((Version v) -> v.major)
            .thenComparingInt(v -> v.minor)
            .thenComparingInt(v -> v.patch);

    private final int major, minor, patch;

    private Version(int major, int minor, int patch) {
        this.major = major;
        this.minor = minor;
        this.patch = patch;
    }

    public static Version parse(String text) {
        String[] parts = text.split("\\.");
        if (parts.length == 0 || parts.length > 3) throw new IllegalArgumentException("version invalide : " + text);
        int[] n = new int[3];
        for (int i = 0; i < parts.length; i++) n[i] = Integer.parseInt(parts[i]);
        return new Version(n[0], n[1], n[2]);
    }

    @Override
    public int compareTo(Version o) {
        return ORDER.compare(this, o);
    }

    @Override
    public boolean equals(Object o) {
        return o instanceof Version v && v.major == major && v.minor == minor && v.patch == patch;
    }

    @Override
    public int hashCode() {
        return 31 * (31 * major + minor) + patch;
    }

    @Override
    public String toString() {
        return major + "." + minor + "." + patch;
    }
}
