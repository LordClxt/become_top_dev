import java.util.EnumSet;
import java.util.Set;

/** Les rôles, et les permissions de chacun, en masques de bits (bit n = n-ième permission). */
public enum Role {
    TRADER(0b0011),     // VIEW, TRADE
    RISK(0b1001),       // VIEW, CANCEL
    SUPPORT(0b0001),    // VIEW
    ADMIN(0b1111);      // toutes

    private final int mask;

    Role(int mask) { this.mask = mask; }

    public Set<Permission> permissions() {
        Set<Permission> out = EnumSet.noneOf(Permission.class);
        for (Permission p : Permission.values()) if ((mask & (1 << p.ordinal())) != 0) out.add(p);
        return out;
    }
}
