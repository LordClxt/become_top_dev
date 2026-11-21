import java.util.List;
import java.util.function.Function;

/**
 * Une recette simplifiée : un nom, les noms des beans dont elle dépend, et la fonction qui fabrique
 * l'objet à partir de ses dépendances (dans le même ordre). Fourni : ne pas modifier.
 */
public record Recipe(String name, List<String> dependsOn, Function<List<Object>, Object> factory) {

    public static Recipe of(String name, Function<List<Object>, Object> factory, String... dependsOn) {
        return new Recipe(name, List.of(dependsOn), factory);
    }
}
