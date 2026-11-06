import java.util.Objects;

/**
 * Mini harnais de test sans dépendance : chaque {@code Spec.test} affiche des lignes JSON au format
 * de {@code go test -json}, ce que la plateforme sait déjà lire. Copié tel quel dans le dossier
 * tests/ de chaque TP Java (source de vérité : sandbox/images/java/Spec.java).
 */
final class Spec {
    private Spec() { throw new AssertionError(); }

    /** Corps d'un test : peut lever n'importe quoi, l'échec est rapporté au lieu de tout arrêter. */
    @FunctionalInterface
    interface Body { void run() throws Throwable; }

    /** Échec d'une vérification : le message est montré tel quel à l'apprenant. */
    static final class Failure extends AssertionError {
        Failure(String message) { super(message); }
    }

    private static int failures;
    private static String[] prefixes = {};

    /** Ne garde que les tests dont le nom commence par l'un des arguments (ex. {@code M1}). */
    static void only(String[] args) { prefixes = args.clone(); }

    static void test(String name, Body body) {
        if (prefixes.length > 0 && java.util.Arrays.stream(prefixes).noneMatch(name::startsWith)) return;
        String problem = null;
        try {
            body.run();
        } catch (Failure f) {
            problem = f.getMessage();
        } catch (UnsupportedOperationException e) {
            problem = "pas encore implémenté (" + e.getMessage() + ")";
        } catch (Throwable t) {
            problem = describe(t);
        }
        if (problem != null) {
            failures++;
            emit("output", name, problem + "\n");
        }
        emit(problem == null ? "pass" : "fail", name, null);
    }

    /** Vérifie une condition ; {@code message} explique ce qui est attendu. */
    static void check(boolean condition, String message) {
        if (!condition) throw new Failure(message);
    }

    /** Vérifie l'égalité avec {@link Objects#equals} et affiche obtenu / attendu. */
    static void eq(Object actual, Object expected, String what) {
        if (!Objects.equals(actual, expected)) {
            throw new Failure(what + " : obtenu " + show(actual) + ", attendu " + show(expected));
        }
    }

    /** Vérifie que {@code body} lève une exception de type {@code type} et la renvoie. */
    static <T extends Throwable> T raises(Class<T> type, Body body, String what) {
        try {
            body.run();
        } catch (Throwable t) {
            if (type.isInstance(t)) return type.cast(t);
            if (t instanceof UnsupportedOperationException && type != UnsupportedOperationException.class) {
                throw new Failure("pas encore implémenté (" + t.getMessage() + ")");
            }
            throw new Failure(what + " : attendu " + type.getSimpleName() + ", obtenu " + describe(t));
        }
        throw new Failure(what + " : attendu " + type.getSimpleName() + ", mais aucune exception n'a été levée");
    }

    /** Termine le programme : code de sortie 1 si au moins un test a échoué. */
    static void done() {
        System.out.flush();
        System.exit(failures == 0 ? 0 : 1);
    }

    private static String describe(Throwable t) {
        String where = "";
        for (StackTraceElement e : t.getStackTrace()) {
            if (!e.getClassName().equals("Spec") && !e.getClassName().startsWith("java.")
                    && !e.getClassName().startsWith("jdk.") && e.getLineNumber() > 0) {
                where = " (" + e.getFileName() + ":" + e.getLineNumber() + ")";
                break;
            }
        }
        return t.getClass().getSimpleName() + (t.getMessage() == null ? "" : ": " + t.getMessage()) + where;
    }

    private static String show(Object o) {
        if (o instanceof String s) return "\"" + s + "\"";
        if (o instanceof Object[] a) return java.util.Arrays.deepToString(a);
        return String.valueOf(o);
    }

    private static void emit(String action, String test, String output) {
        StringBuilder sb = new StringBuilder("{\"Action\":").append(quote(action))
                .append(",\"Test\":").append(quote(test));
        if (output != null) sb.append(",\"Output\":").append(quote(output));
        System.out.println(sb.append('}'));
    }

    private static String quote(String s) {
        StringBuilder sb = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
                }
            }
        }
        return sb.append('"').toString();
    }
}
