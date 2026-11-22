import java.lang.reflect.Method;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** La console d'Ordo : lit une ligne, trouve la commande annotée, l'exécute. */
public final class Router {
    private final Map<String, Method> commands = new HashMap<>();
    private final Map<String, Object> owners = new HashMap<>();

    public Router(Object... handlers) {
        for (Object h : handlers) {
            for (Method m : h.getClass().getMethods()) {
                if (m.isAnnotationPresent(Command.class)) {
                    String name = m.getAnnotation(Command.class).value();
                    commands.put(name, m);
                    owners.put(name, h);
                    if (m.isAnnotationPresent(Alias.class)) {
                        String alias = m.getAnnotation(Alias.class).value();
                        commands.put(alias, m);
                        owners.put(alias, h);
                    }
                }
            }
        }
    }

    public String run(Role role, String line) {
        String[] words = line.trim().split("\\s+");
        Method m = commands.get(words[0]);
        if (m == null) return "inconnu: " + words[0];
        try {
            return (String) m.invoke(owners.get(words[0]), List.of(words).subList(1, words.length));
        } catch (Exception e) {
            return "erreur: " + e.getMessage();
        }
    }

    public Set<Role> rolesFor(String command) {
        return EnumSet.allOf(Role.class);
    }

    public Map<Role, Set<String>> commandsByRole() {
        return Map.of();
    }
}
