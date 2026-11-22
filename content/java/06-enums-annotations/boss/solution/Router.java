import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;

/** La console d'Ordo : lit une ligne, trouve la commande annotée, vérifie le rôle, l'exécute. */
public final class Router {

    /** Une commande : son nom, les rôles autorisés, et la méthode à appeler sur son gestionnaire. */
    private record Entry(String name, Set<Role> roles, ConsoleHandler owner, Method method) { }

    private final Map<String, Entry> byName = new HashMap<>();      // noms et alias
    private final Map<String, Entry> commands = new TreeMap<>();    // noms seulement, triés

    /** Seuls des ConsoleHandler sont acceptés : l'erreur arrive à la compilation (interface marqueur). */
    public Router(ConsoleHandler... handlers) {
        for (ConsoleHandler h : handlers) {
            Objects.requireNonNull(h, "handler");
            Method[] methods = h.getClass().getDeclaredMethods();   // y compris les non publiques, pour les refuser
            Arrays.sort(methods, Comparator.comparing(Method::getName));
            for (Method m : methods) {
                Command c = m.getAnnotation(Command.class);
                if (c == null) continue;
                checkSignature(m);
                Entry e = new Entry(c.value(), roles(c), h, m);
                register(c.value(), e);
                commands.put(c.value(), e);
                for (Alias a : m.getAnnotationsByType(Alias.class)) register(a.value(), e);   // une ou plusieurs
            }
        }
    }

    private static void checkSignature(Method m) {
        int mod = m.getModifiers();
        boolean ok = Modifier.isPublic(mod) && !Modifier.isStatic(mod) && m.getReturnType() == String.class
                && m.getParameterCount() == 1 && m.getParameterTypes()[0] == List.class;
        if (!ok) {
            throw new IllegalArgumentException("commande invalide : " + m.getDeclaringClass().getSimpleName() + "."
                    + m.getName() + " (attendu : public String nom(List<String> args))");
        }
    }

    private static Set<Role> roles(Command c) {
        Set<Role> out = c.roles().length == 0 ? EnumSet.allOf(Role.class) : EnumSet.noneOf(Role.class);
        out.addAll(Arrays.asList(c.roles()));
        out.add(Role.ADMIN);   // l'administrateur peut tout
        return Collections.unmodifiableSet(out);
    }

    private void register(String key, Entry e) {
        if (byName.putIfAbsent(key, e) != null) throw new IllegalArgumentException("commande en double : " + key);
    }

    /** Exécute une ligne pour ce rôle ; ne lève jamais pour une commande inconnue, refusée ou qui échoue. */
    public String run(Role role, String line) {
        Objects.requireNonNull(role, "role");
        List<String> words = List.of(line.trim().split("\\s+"));
        Entry e = byName.get(words.get(0));
        if (e == null) return "inconnu: " + words.get(0);
        if (!e.roles().contains(role)) return "refusé: " + e.name();
        try {
            return (String) e.method().invoke(e.owner(), words.subList(1, words.size()));
        } catch (InvocationTargetException ex) {
            return "erreur: " + ex.getCause().getMessage();   // l'exception de la commande est enveloppée
        } catch (IllegalAccessException ex) {
            throw new IllegalStateException("commande inaccessible : " + e.name(), ex);
        }
    }

    /** Les rôles autorisés pour cette commande (nom ou alias). */
    public Set<Role> rolesFor(String command) {
        Entry e = byName.get(command);
        if (e == null) throw new IllegalArgumentException("commande inconnue : " + command);
        return e.roles();
    }

    /** Pour chaque rôle, les commandes qu'il peut lancer (noms, triés, sans les alias). */
    public Map<Role, Set<String>> commandsByRole() {
        Map<Role, Set<String>> out = new EnumMap<>(Role.class);
        for (Role r : Role.values()) out.put(r, new TreeSet<>());
        for (Entry e : commands.values()) for (Role r : e.roles()) out.get(r).add(e.name());
        out.replaceAll((r, names) -> Collections.unmodifiableSet(names));
        return Collections.unmodifiableMap(out);
    }
}
