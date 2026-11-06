import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

public class Test {
    static Address paris() { return new Address("  10 rue de Rivoli ", "75001", " Paris "); }

    static ShippingLabel label(List<String> instr, byte[] code) {
        return new ShippingLabel(" Ana Diaz ", paris(), instr, 1200, code);
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("ce sont des records", () -> {
            Spec.check(Address.class.isRecord(), "Address doit être un record");
            Spec.check(ShippingLabel.class.isRecord(), "ShippingLabel doit être un record");
        });

        Spec.test("Address : validation et normalisation", () -> {
            Address a = paris();
            Spec.eq(a.street(), "10 rue de Rivoli", "street() sans espaces superflus");
            Spec.eq(a.city(), "Paris", "city()");
            Spec.eq(a, new Address("10 rue de Rivoli", "75001", "Paris"), "deux adresses normalisées pareil sont égales");
            Spec.raises(IllegalArgumentException.class, () -> new Address("1 rue X", "7500", "Paris"), "code postal à 4 chiffres");
            Spec.raises(IllegalArgumentException.class, () -> new Address("1 rue X", "75A01", "Paris"), "code postal non numérique");
            Spec.raises(IllegalArgumentException.class, () -> new Address("   ", "75001", "Paris"), "rue vide");
            Spec.raises(NullPointerException.class, () -> new Address(null, "75001", "Paris"), "rue null");
        });

        Spec.test("ShippingLabel : validation", () -> {
            Spec.eq(label(List.of(), new byte[] {1}).recipient(), "Ana Diaz", "recipient() normalisé");
            Spec.raises(IllegalArgumentException.class, () -> new ShippingLabel("  ", paris(), List.of(), 10, new byte[0]), "destinataire vide");
            Spec.raises(IllegalArgumentException.class, () -> new ShippingLabel("Bo", paris(), List.of(), 0, new byte[0]), "poids 0");
            Spec.raises(IllegalArgumentException.class, () -> new ShippingLabel("Bo", paris(), List.of(), 30_001, new byte[0]), "poids 30 001");
            Spec.raises(NullPointerException.class, () -> new ShippingLabel("Bo", null, List.of(), 10, new byte[0]), "adresse null");
            Spec.raises(NullPointerException.class, () -> new ShippingLabel("Bo", paris(), null, 10, new byte[0]), "instructions null");
            Spec.raises(NullPointerException.class, () -> new ShippingLabel("Bo", paris(), List.of(), 10, null), "barcode null");
        });

        Spec.test("instructions : copiées et non modifiables", () -> {
            List<String> instr = new ArrayList<>(List.of("Fragile"));
            ShippingLabel l = label(instr, new byte[] {1});
            instr.add("Ne pas plier");
            Spec.eq(l.instructions(), List.of("Fragile"), "instructions() après modification de la liste d'origine");
            Spec.raises(UnsupportedOperationException.class, () -> l.instructions().add("x"), "instructions().add(…)");
        });

        Spec.test("barcode : jamais partagé", () -> {
            byte[] code = {1, 2, 3};
            ShippingLabel l = label(List.of(), code);
            code[0] = 9;
            Spec.eq(l.barcode()[0], (byte) 1, "barcode() après modification du tableau d'origine");
            l.barcode()[1] = 9;
            Spec.eq(l.barcode()[1], (byte) 2, "barcode() après modification du tableau renvoyé");
        });

        Spec.test("égalité par contenu, y compris le code-barres", () -> {
            ShippingLabel a = label(List.of("Fragile"), new byte[] {1, 2, 3});
            ShippingLabel b = label(new ArrayList<>(List.of("Fragile")), new byte[] {1, 2, 3});
            Spec.check(a.equals(b), "deux étiquettes de même contenu doivent être égales (l'equals généré compare les tableaux par identité)");
            Spec.eq(a.hashCode(), b.hashCode(), "leurs hash");
            Spec.eq(new HashSet<>(List.of(a, b)).size(), 1, "HashSet de deux étiquettes identiques");
            Spec.check(!a.equals(label(List.of("Fragile"), new byte[] {1, 2, 4})), "codes-barres différents");
            Spec.check(a.toString().contains("[1, 2, 3]"), "toString doit montrer le code-barres en clair : " + a);
        });

        Spec.done();
    }
}
