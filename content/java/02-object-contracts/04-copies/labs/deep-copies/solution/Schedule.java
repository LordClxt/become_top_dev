import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Le planning d'une équipe : pour chaque jour, les personnes affectées. */
public final class Schedule {
    private final String team;
    private final Map<DayOfWeek, List<String>> shifts = new EnumMap<>(DayOfWeek.class);

    public Schedule(String team) {
        this.team = Objects.requireNonNull(team);
    }

    /** Constructeur de copie : la copie ne partage aucune liste avec l'original. */
    public Schedule(Schedule other) {
        this(other.team);
        copyShifts(other.shifts);
    }

    /** Fabrique de conversion : accepte n'importe quelle Map de collections, sans garder de référence vers elles. */
    public static Schedule from(String team, Map<DayOfWeek, ? extends Collection<String>> shifts) {
        Schedule s = new Schedule(team);
        s.copyShifts(shifts);
        return s;
    }

    private void copyShifts(Map<DayOfWeek, ? extends Collection<String>> source) {
        source.forEach((day, people) -> shifts.put(day, new ArrayList<>(people)));
    }

    public void assign(DayOfWeek day, String person) {
        shifts.computeIfAbsent(day, d -> new ArrayList<>()).add(Objects.requireNonNull(person));
    }

    public void unassign(DayOfWeek day, String person) {
        List<String> people = shifts.get(day);
        if (people != null) people.remove(person);
    }

    /** Les personnes affectées ce jour-là (vue non modifiable). */
    public List<String> on(DayOfWeek day) {
        return List.copyOf(shifts.getOrDefault(day, List.of()));
    }

    public String team() { return team; }
}
