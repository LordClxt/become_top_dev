import java.nio.file.Files;
import java.nio.file.Path;

public class Test {
    public static void main(String[] args) throws Exception {
        Spec.only(args);
        String expected = "{\n  \"user\": \"ada\",\n  \"unread\": 3,\n  \"links\": [\"inbox\", \"settings\"]\n}\n";

        Spec.test("le document est exactement celui attendu", () -> {
            String got = Payload.notification("ada", 3);
            if (!got.equals(expected)) {
                String[] g = got.split("\n", -1), e = expected.split("\n", -1);
                for (int i = 0; i < Math.max(g.length, e.length); i++) {
                    String gl = i < g.length ? g[i] : "<absente>", el = i < e.length ? e[i] : "<absente>";
                    Spec.check(gl.equals(el), "ligne " + (i + 1) + " : obtenu «" + gl + "», attendu «" + el
                            + "» — vérifie l'indentation (position des \"\"\" fermants) et le saut de ligne final");
                }
            }
        });

        Spec.test("les valeurs sont bien insérées", () -> {
            Spec.check(Payload.notification("linus", 0).contains("\"user\": \"linus\""), "le nom de l'utilisateur doit apparaître entre guillemets");
            Spec.check(Payload.notification("linus", 12).contains("\"unread\": 12,"), "le nombre de messages non lus doit apparaître sans guillemets");
        });

        Spec.test("un bloc de texte, sans concaténation", () -> {
            String src = Files.readString(Path.of("Payload.java"));
            String code = src.replaceAll("(?s)/\\*.*?\\*/", "").replaceAll("//[^\\n]*", "");
            Spec.check(code.contains("\"\"\""), "Payload.java doit utiliser un bloc de texte (\"\"\")");
            Spec.check(!code.contains("\\n"), "plus de \\n écrit à la main : le bloc de texte s'en charge");
            Spec.check(!code.contains("\" +") && !code.contains("+ \""), "plus de concaténation de chaînes");
        });

        Spec.done();
    }
}
