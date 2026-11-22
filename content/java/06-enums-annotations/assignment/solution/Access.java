import java.util.Collection;
import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/** Les droits effectifs d'un utilisateur, et leur forme compacte pour les jetons de session. */
public final class Access {
    private Access() { }

    /** Toutes les permissions données par ces rôles. */
    public static Set<Permission> effective(Collection<Role> roles) {
        Set<Permission> out = EnumSet.noneOf(Permission.class);
        for (Role r : roles) out.addAll(r.permissions());
        return out;
    }

    /** Pour chaque permission, les rôles qui la donnent (dans l'ordre de déclaration, des deux côtés). */
    public static Map<Permission, Set<Role>> whoCan() {
        Map<Permission, Set<Role>> out = new EnumMap<>(Permission.class);
        for (Permission p : Permission.values()) out.put(p, EnumSet.noneOf(Role.class));
        for (Role r : Role.values()) for (Permission p : r.permissions()) out.get(p).add(r);
        out.replaceAll((p, roles) -> Collections.unmodifiableSet(roles));
        return Collections.unmodifiableMap(out);
    }

    /** Les codes des permissions, dans l'ordre de déclaration (un EnumSet itère dans cet ordre). */
    public static String encode(Set<Permission> permissions) {
        StringBuilder sb = new StringBuilder();
        for (Permission p : EnumSet.copyOf(permissions.isEmpty() ? EnumSet.noneOf(Permission.class) : permissions)) sb.append(p.code());
        return sb.toString();
    }

    /** L'inverse d'encode ; un code inconnu lève IllegalArgumentException. */
    public static Set<Permission> decode(String codes) {
        Set<Permission> out = EnumSet.noneOf(Permission.class);
        for (char c : codes.toCharArray()) {
            Permission found = null;
            for (Permission p : Permission.values()) if (p.code() == c) found = p;
            if (found == null) throw new IllegalArgumentException("code de permission inconnu : " + c);
            out.add(found);
        }
        return out;
    }
}
