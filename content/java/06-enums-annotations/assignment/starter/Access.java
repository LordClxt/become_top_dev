import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/** Les droits effectifs d'un utilisateur, et leur forme compacte pour les jetons de session. */
public final class Access {
    private Access() { }

    /** Toutes les permissions données par ces rôles. */
    public static Set<Permission> effective(Collection<Role> roles) {
        Set<Permission> out = new HashSet<>();
        for (Role r : roles) out.addAll(r.permissions());
        return out;
    }

    /** Pour chaque permission, les rôles qui la donnent. */
    public static Map<Permission, Set<Role>> whoCan() {
        Map<Permission, Set<Role>> out = new HashMap<>();
        for (Role r : Role.values()) for (Permission p : r.permissions()) out.computeIfAbsent(p, k -> new HashSet<>()).add(r);
        return out;
    }

    /** Les codes des permissions, dans l'ordre de déclaration. */
    public static String encode(Set<Permission> permissions) {
        StringBuilder sb = new StringBuilder();
        for (Permission p : permissions) sb.append(p.ordinal());
        return sb.toString();
    }

    /** L'inverse d'encode. */
    public static Set<Permission> decode(String codes) {
        Set<Permission> out = new HashSet<>();
        for (char c : codes.toCharArray()) out.add(Permission.values()[c - '0']);
        return out;
    }
}
