import java.util.Locale;
import java.util.Objects;

/** Une chaîne dont la casse est conservée à l'affichage mais ignorée par equals. */
public final class CaseInsensitiveString {
    private final String s;

    public CaseInsensitiveString(String s) {
        this.s = Objects.requireNonNull(s);
    }

    @Override
    public boolean equals(Object o) {
        if (o instanceof CaseInsensitiveString cis) return s.equalsIgnoreCase(cis.s);
        if (o instanceof String str) return s.equalsIgnoreCase(str); // pratique : on peut comparer à une String
        return false;
    }

    @Override
    public int hashCode() {
        return s.toLowerCase(Locale.ROOT).hashCode();
    }

    @Override
    public String toString() {
        return s;
    }
}
