import java.time.LocalDate;
import java.util.Objects;

/** Un trajet : codes IATA d'origine et de destination, date du vol. */
public final class Route {
    private final String origin;
    private final String destination;
    private final LocalDate date;

    public Route(String origin, String destination, LocalDate date) {
        this.origin = Objects.requireNonNull(origin);
        this.destination = Objects.requireNonNull(destination);
        this.date = Objects.requireNonNull(date);
    }

    @Override
    public boolean equals(Object o) {
        return o == this || (o instanceof Route r
                && r.origin.equals(origin) && r.destination.equals(destination) && r.date.equals(date));
    }

    // TODO : hashCode, sur les mêmes champs qu'equals.

    @Override
    public String toString() {
        return origin + "→" + destination + " " + date;
    }
}
