import java.util.List;

/** Le résultat d'une exécution : réussis, échoués, et un message par échec. Fourni. */
public record Report(int passed, int failed, List<String> problems) {
    public Report {
        problems = List.copyOf(problems);
    }
}
