import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

/**
 * Compile du code pendant les tests, avec le compilateur du JDK : pour vérifier qu'un client compile (ou pas)
 * contre ton API, et que ton fichier ne produit aucun avertissement.
 */
final class Javac {
    private Javac() { }

    /** Résultat d'une compilation : réussite, et messages du compilateur (erreurs et avertissements). */
    record Result(boolean ok, String messages) {
        boolean clean() { return ok && messages.isBlank(); }
    }

    /** Compile un petit client, avec tes classes sur le classpath. */
    static Result client(String className, String source, String... options) {
        return compile(List.of(source(className, source)), options);
    }

    /** Recompile un de tes fichiers, par exemple avec -Xlint:all -Werror. */
    static Result file(String path, String... options) {
        try {
            String className = Path.of(path).getFileName().toString().replace(".java", "");
            return compile(List.of(source(className, Files.readString(Path.of(path)))), options);
        } catch (IOException e) {
            throw new IllegalStateException("fichier introuvable : " + path, e);
        }
    }

    private static JavaFileObject source(String className, String code) {
        return new SimpleJavaFileObject(URI.create("string:///" + className + ".java"), JavaFileObject.Kind.SOURCE) {
            @Override public CharSequence getCharContent(boolean ignoreEncodingErrors) { return code; }
        };
    }

    private static Result compile(List<JavaFileObject> sources, String... options) {
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        try {
            Path out = Files.createTempDirectory("javac");
            var diagnostics = new DiagnosticCollector<JavaFileObject>();
            List<String> opts = new ArrayList<>(List.of("-d", out.toString(), "-cp", System.getProperty("java.class.path"), "-encoding", "UTF-8"));
            opts.addAll(List.of(options));
            boolean ok = javac.getTask(null, javac.getStandardFileManager(diagnostics, Locale.ROOT, null), diagnostics, opts, null, sources).call();
            StringBuilder messages = new StringBuilder();
            for (var d : diagnostics.getDiagnostics()) {
                if (d.getKind() == javax.tools.Diagnostic.Kind.NOTE) continue;
                messages.append(d.getKind()).append(" ligne ").append(d.getLineNumber()).append(" : ").append(d.getMessage(Locale.ROOT)).append('\n');
            }
            return new Result(ok, messages.toString());
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
