import java.util.Set;

/** Résultat d'une vérification : les clauses violées et un exemple pour chacune. */
public final class Report {

    public Set<Kind> kinds() {
        throw new UnsupportedOperationException("kinds à écrire");
    }

    public boolean isClean() {
        throw new UnsupportedOperationException("isClean à écrire");
    }

    /** Le premier exemple trouvé pour ce type de violation, ou null. */
    public String explain(Kind kind) {
        throw new UnsupportedOperationException("explain à écrire");
    }
}
