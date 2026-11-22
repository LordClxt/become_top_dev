import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Une règle d'alerte sur le prix d'un titre. Les équipes écrivent leurs propres alertes en étendant cette classe :
 * elles fournissent {@link #describe()} et {@link #triggeredBy(long)}.
 *
 * <p>Le constructeur n'appelle aucune méthode redéfinissable : une sous-classe n'a pas encore initialisé ses champs
 * quand il s'exécute.
 */
public abstract class Alert {
    private static final List<String> JOURNAL = new ArrayList<>();

    private final String name;
    private boolean armed;

    protected Alert(String name) {
        this.name = Objects.requireNonNull(name, "name");
    }

    public final String name() {
        return name;
    }

    /**
     * Arme l'alerte et l'inscrit au journal.
     *
     * @implSpec appelle {@link #describe()} une fois, sur l'alerte complètement construite.
     */
    public final void arm() {
        if (armed) return;
        armed = true;
        JOURNAL.add("armée : " + name + " (" + describe() + ")");
    }

    public final boolean isArmed() {
        return armed;
    }

    /** Description lisible de la règle, pour le journal. Appelée par {@link #arm()}, jamais pendant la construction. */
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
