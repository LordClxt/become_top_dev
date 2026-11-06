import java.lang.reflect.Modifier;
import java.util.List;

public class Test {
    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("le journal voit un compte complet", () -> {
            Entity.clearAudit();
            var a = new Account("fr76 3000 6000 0112 3456 7890 189", " Ada Lovelace ");
            Spec.eq(a.iban(), "FR7630006000011234567890189", "iban()");
            Spec.eq(a.owner(), "Ada Lovelace", "owner()");
            Spec.eq(Entity.audit(), List.of("Account FR7630006000011234567890189 (Ada Lovelace)"),
                    "journal d'audit (describe() est appelé par le constructeur d'Entity)");
        });

        Spec.test("un argument invalide n'écrit rien au journal", () -> {
            Entity.clearAudit();
            Spec.raises(IllegalArgumentException.class, () -> new Account("FR76-3000", "Ada"), "IBAN avec un tiret");
            Spec.raises(IllegalArgumentException.class, () -> new Account("7630006000011234567890189", "Ada"), "IBAN sans pays");
            Spec.raises(IllegalArgumentException.class, () -> new Account("FR763000600", "Ada"), "IBAN trop court");
            Spec.raises(IllegalArgumentException.class, () -> new Account("FR7630006000011234567890189", "   "), "titulaire blanc");
            Spec.eq(Entity.audit(), List.of(), "journal après quatre créations refusées");
        });

        Spec.test("null refusé, sans rien écrire", () -> {
            Entity.clearAudit();
            Spec.raises(NullPointerException.class, () -> new Account(null, "Ada"), "IBAN null");
            Spec.raises(NullPointerException.class, () -> new Account("FR7630006000011234567890189", null), "titulaire null");
            Spec.eq(Entity.audit(), List.of(), "journal après deux créations refusées");
        });

        Spec.test("les champs restent final", () -> {
            for (var f : Account.class.getDeclaredFields()) {
                Spec.check(Modifier.isFinal(f.getModifiers()), "le champ " + f.getName() + " doit rester final");
            }
            Spec.check(Account.class.getSuperclass() == Entity.class, "Account doit hériter d'Entity");
        });

        Spec.done();
    }
}
