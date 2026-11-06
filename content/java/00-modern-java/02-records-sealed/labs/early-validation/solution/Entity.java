import java.util.ArrayList;
import java.util.List;

/** Classe de base imposée par le framework : NE PAS MODIFIER. */
abstract class Entity {
    private static final List<String> AUDIT = new ArrayList<>();

    protected Entity() {
        AUDIT.add(describe());   // appel d'une méthode redéfinissable depuis le constructeur
    }

    /** Description lisible, écrite au journal d'audit à la création. */
    protected abstract String describe();

    static List<String> audit() { return List.copyOf(AUDIT); }

    static void clearAudit() { AUDIT.clear(); }
}
