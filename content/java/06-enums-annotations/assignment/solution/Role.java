import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;

/** Les rôles, et les permissions de chacun : nommées, plus jamais déduites d'une position. */
public enum Role {
    TRADER(EnumSet.of(Permission.VIEW, Permission.TRADE)),
    RISK(EnumSet.of(Permission.VIEW, Permission.CANCEL, Permission.APPROVE)),
    SUPPORT(EnumSet.of(Permission.VIEW)),
    ADMIN(EnumSet.allOf(Permission.class));

    private final Set<Permission> permissions;

    Role(EnumSet<Permission> permissions) {
        this.permissions = Collections.unmodifiableSet(permissions);   // un EnumSet est modifiable : on l'enveloppe
    }

    public Set<Permission> permissions() {
        return permissions;
    }
}
