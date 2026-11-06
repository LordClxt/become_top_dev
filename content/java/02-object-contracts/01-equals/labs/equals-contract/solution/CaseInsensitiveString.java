import java.util.Locale;
import java.util.Objects;

/** Une chaîne dont la casse est conservée à l'affichage mais ignorée par equals. */
public final class CaseInsensitiveString {
    private final String s;

    public CaseInsensitiveString(String s) {
        this.s = Objects.requireNonNull(s);
    }

    /** Égale seulement à une autre CaseInsensitiveString : String ne pourrait pas rendre la pareille. */
    @Override
    public boolean equals(Object o) {
        return o instanceof CaseInsensitiveString cis && cis.s.equalsIgnoreCase(s);
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
