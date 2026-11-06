import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

public class Test {
    /** Lance le fichier comme le gérant : java Tally.java, l'entrée sur stdin. */
    static String run(String input) throws Exception {
        Process p = new ProcessBuilder("java", "-XX:TieredStopAtLevel=1", "-XX:+UseSerialGC", "-Dfile.encoding=UTF-8",
                "-Dstdout.encoding=UTF-8", "-Dstdin.encoding=UTF-8", "Tally.java")
                .redirectErrorStream(true).start();
        try (var in = p.getOutputStream()) { in.write(input.getBytes(StandardCharsets.UTF_8)); }
        String out = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        if (!p.waitFor(20, TimeUnit.SECONDS)) { p.destroyForcibly(); throw new Spec.Failure("le programme ne s'arrête pas : la fin de l'entrée est-elle détectée ?"); }
        Spec.check(p.exitValue() == 0, "java Tally.java a échoué (code " + p.exitValue() + ") :\n" + out);
        return out.replace("\r\n", "\n");
    }

    static void same(String got, String expected, String what) {
        Spec.check(got.equals(expected), what + "\n--- obtenu ---\n" + got + "--- attendu ---\n" + expected);
    }

    public static void main(String[] args) throws Exception {
        Spec.only(args);

        Spec.test("un fichier compact avec un main d'instance", () -> {
            String code = Files.readString(Path.of("Tally.java")).replaceAll("(?s)/\\*.*?\\*/", "").replaceAll("//[^\\n]*", "");
            Spec.check(!code.matches("(?s).*\\b(class|record|interface|enum)\\s+\\w+.*"), "Tally.java ne doit déclarer aucune classe : c'est un fichier compact");
            Spec.check(code.matches("(?s).*\\bvoid\\s+main\\s*\\(\\s*\\).*"), "il faut une méthode void main() sans paramètre");
            Spec.check(!code.contains("static void main"), "le main d'un fichier compact n'a pas besoin d'être static");
            Spec.check(code.contains("IO.readln") && code.contains("IO.println"), "lis avec IO.readln() et écris avec IO.println");
        });

        Spec.test("l'exemple des consignes", () -> same(run("""
                # export du 14/03
                café;2;250
                croissant;2;120

                café;1;250
                thé;x;300
                """), """
                ligne 6 ignorée : thé;x;300
                café x3 = 7.50
                croissant x2 = 2.40
                TOTAL 9.90
                """, "récapitulatif"));

        Spec.test("entrée vide", () -> same(run(""), "TOTAL 0.00\n", "sans aucune vente"));

        Spec.test("lignes invalides et espaces", () -> same(run("""
                 pain ; 1 ; 95
                pain;0;95
                pain;1
                pain;1;-5
                ;1;10
                pain;2;95;extra
                pain;1;
                eau;3;60
                """), """
                ligne 2 ignorée : pain;0;95
                ligne 3 ignorée : pain;1
                ligne 4 ignorée : pain;1;-5
                ligne 5 ignorée : ;1;10
                ligne 6 ignorée : pain;2;95;extra
                ligne 7 ignorée : pain;1;
                pain x1 = 0.95
                eau x3 = 1.80
                TOTAL 2.75
                """, "chaque ligne invalide signalée à sa lecture, les espaces ignorés"));

        Spec.test("ordre de première apparition et prix variables", () -> same(run("""
                zèbre;1;1000
                abricot;1;5
                zèbre;2;1
                """), """
                zèbre x3 = 10.02
                abricot x1 = 0.05
                TOTAL 10.07
                """, "les articles restent dans l'ordre où ils apparaissent, même si le prix change"));

        Spec.done();
    }
}
