import java.util.Arrays;
import java.util.Objects;

/** Plan d'une cabine : nom et sièges libres (true = libre). */
public final class Seats {
    private final String cabin;
    private final boolean[] free;

    public Seats(String cabin, boolean[] free) {
        this.cabin = Objects.requireNonNull(cabin);
        this.free = free.clone();
    }

    @Override
    public boolean equals(Object o) {
        return o instanceof Seats s && s.cabin.equals(cabin) && Arrays.equals(s.free, free);
    }

    @Override
    public int hashCode() {
        return 31 * cabin.hashCode() + Arrays.hashCode(free);
    }
}
