import java.util.Collections;
import java.util.EnumMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** Résultat d'une vérification : les clauses violées et le premier exemple pour chacune. Immuable. */
public final class Report {
    private final Map<Kind, String> examples;

    private Report(Map<Kind, String> examples) {
        this.examples = Collections.unmodifiableMap(new EnumMap<>(examples));
    }

    /** Accumulateur mutable, utilisé seulement pendant la vérification. */
    static final class Builder {
        private final Map<Kind, String> examples = new EnumMap<>(Kind.class);

        void add(Kind kind, String example) {
            examples.putIfAbsent(kind, example); // garde le premier exemple
        }

        Report build() {
            return new Report(examples);
        }
    }

    /** Les types trouvés, dans l'ordre de l'enum. */
    public Set<Kind> kinds() {
        return examples.keySet();
    }

    public boolean isClean() {
        return examples.isEmpty();
    }

    public String explain(Kind kind) {
        return examples.get(kind);
    }

    @Override
    public boolean equals(Object o) {
        return o instanceof Report r && r.examples.equals(examples);
    }

    @Override
    public int hashCode() {
        return examples.hashCode();
    }

    /** « Report[SYMMETRY, TRANSITIVITY] » ou « Report[propre] ». Le format peut changer. */
    @Override
    public String toString() {
        return "Report" + (isClean() ? "[propre]" : examples.keySet().toString());
    }

    static String show(Object o) {
        return Objects.toString(o);
    }
}
