import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Une règle d'alerte sur le prix d'un titre. Les équipes écrivent leurs propres alertes en étendant cette classe :
 * elles fournissent {@link #describe()} et {@link #triggeredBy(long)}.
 */
public abstract class Alert {
    private static final List<String> JOURNAL = new ArrayList<>();

    private final String name;
    private boolean armed;

    protected Alert(String name) {
        this.name = Objects.requireNonNull(name, "name");
        JOURNAL.add("armée : " + name + " (" + describe() + ")");
    }

    public String name() {
        return name;
    }

    /** Arme l'alerte : le moteur l'appelle une fois l'alerte créée. */
    public void arm() {
        armed = true;
    }

    public boolean isArmed() {
        return armed;
    }

    /** Description lisible de la règle, pour le journal. */
    protected abstract String describe();

    /** Vrai si ce prix (en centimes) déclenche l'alerte. */
    public abstract boolean triggeredBy(long priceCents);

    public static List<String> journal() {
        return List.copyOf(JOURNAL);
    }

    static void clearJournal() {
        JOURNAL.clear();
    }
}
