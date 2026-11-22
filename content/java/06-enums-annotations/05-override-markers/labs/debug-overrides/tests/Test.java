import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

public class Test {
    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("un ensemble ne garde qu'un exemplaire de chaque clé", () -> {
            Set<SymbolKey> seen = new HashSet<>();
            for (int i = 0; i < 10; i++) {
                seen.add(new SymbolKey("XPAR", "ACME"));
                seen.add(new SymbolKey("XNYS", "ACME"));
            }
            Spec.eq(seen.size(), 2, "clés distinctes après 20 ajouts");
        });

        Spec.test("une nouvelle clé égale retrouve la valeur d'une table", () -> {
            Map<SymbolKey, Integer> volumes = new HashMap<>();
            volumes.put(new SymbolKey("XPAR", "ACME"), 1_200);
            Spec.eq(volumes.get(new SymbolKey("XPAR", "ACME")), 1_200, "volume de XPAR:ACME");
        });

        Spec.test("equals respecte le contrat, vu comme un Object", () -> {
            Object a = new SymbolKey("XPAR", "ACME");
            Object b = new SymbolKey("XPAR", "ACME");
            Spec.check(a.equals(b) && b.equals(a), "deux clés égales, appelées par equals(Object)");
            Spec.check(!a.equals("XPAR:ACME"), "une clé n'est pas égale à une chaîne");
            Spec.check(!a.equals(null), "une clé n'est pas égale à null");
        });

        Spec.test("toString donne place:symbole", () -> {
            Spec.eq(String.valueOf(new SymbolKey("XPAR", "ACME")), "XPAR:ACME", "toString()");
        });

        Spec.test("chaque redéfinition porte @Override", () -> {
            String src = Files.readString(Path.of("SymbolKey.java"));
            for (String sig : new String[] { "boolean equals\\(Object", "int hashCode\\(\\)", "String toString\\(\\)" }) {
                Spec.check(Pattern.compile("@Override\\s+public\\s+" + sig).matcher(src).find(),
                        "méthode redéfinie sans @Override, ou absente : " + sig.replace("\\", ""));
            }
        });

        Spec.done();
    }
}
