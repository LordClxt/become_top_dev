import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class Test {
    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("chaque rôle a exactement ses permissions", () -> {
            Spec.eq(Role.TRADER.permissions(), EnumSet.of(Permission.VIEW, Permission.TRADE), "TRADER");
            Spec.eq(Role.RISK.permissions(), EnumSet.of(Permission.VIEW, Permission.CANCEL, Permission.APPROVE), "RISK (approuve et annule)");
            Spec.eq(Role.SUPPORT.permissions(), EnumSet.of(Permission.VIEW), "SUPPORT");
            Spec.eq(Role.ADMIN.permissions(), EnumSet.allOf(Permission.class), "ADMIN : toutes, y compris les futures");
        });

        Spec.test("les permissions d'un rôle ne se modifient pas de l'extérieur", () -> {
            Spec.raises(UnsupportedOperationException.class, () -> Role.SUPPORT.permissions().add(Permission.ADMIN), "ajouter ADMIN à SUPPORT");
        });

        Spec.test("droits effectifs : l'union, dans l'ordre de déclaration", () -> {
            Set<Permission> p = Access.effective(List.of(Role.SUPPORT, Role.TRADER));
            Spec.eq(List.copyOf(p), List.of(Permission.VIEW, Permission.TRADE), "SUPPORT + TRADER");
        });

        Spec.test("qui peut quoi", () -> {
            Map<Permission, Set<Role>> who = Access.whoCan();
            Spec.eq(List.copyOf(who.keySet()), List.of(Permission.values()), "toutes les permissions, dans l'ordre");
            Spec.eq(who.get(Permission.APPROVE), EnumSet.of(Role.RISK, Role.ADMIN), "qui peut approuver");
            Spec.eq(List.copyOf(who.get(Permission.VIEW)), List.of(Role.values()), "tout le monde peut voir, dans l'ordre des rôles");
        });

        Spec.test("encode et decode utilisent les codes, pas les positions", () -> {
            Spec.eq(Access.encode(Role.RISK.permissions()), "VAC", "RISK encodé");
            Spec.eq(Access.encode(EnumSet.of(Permission.ADMIN, Permission.VIEW)), "VX", "ordre de déclaration");
            Spec.eq(Access.decode("VAC"), Role.RISK.permissions(), "decode(VAC)");
            Spec.eq(Access.decode(""), Set.of(), "decode de la chaîne vide");
            Spec.raises(IllegalArgumentException.class, () -> Access.decode("V?"), "code inconnu");
        });

        Spec.done();
    }
}
