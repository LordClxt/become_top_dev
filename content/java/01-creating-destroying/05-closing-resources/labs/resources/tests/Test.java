import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Test {
    static final List<String> log = new ArrayList<>();

    static final class FakeSource implements Source {
        private final String data;
        private int pos;
        boolean failRead, failClose;
        FakeSource(String data) { this.data = data; log.add("open source"); }
        @Override public int read(char[] buf) throws IOException {
            if (failRead) throw new IOException("lecture impossible");
            if (pos >= data.length()) return -1;
            int n = Math.min(buf.length, data.length() - pos);
            data.getChars(pos, pos + n, buf, 0);
            pos += n;
            return n;
        }
        @Override public void close() throws IOException {
            log.add("close source");
            if (failClose) throw new IOException("fermeture source impossible");
        }
    }

    static final class FakeSink implements Sink {
        final StringBuilder out = new StringBuilder();
        boolean failClose;
        FakeSink() { log.add("open sink"); }
        @Override public void write(char[] buf, int off, int len) { out.append(buf, off, len); }
        @Override public void close() throws IOException {
            log.add("close sink");
            if (failClose) throw new IOException("fermeture sink impossible");
        }
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("Connection est AutoCloseable et utilisable dans un try-with-resources", () -> {
            Spec.check(AutoCloseable.class.isAssignableFrom(Connection.class), "Connection doit implémenter AutoCloseable");
            List<String> wire = new ArrayList<>();
            AutoCloseable c = (AutoCloseable) (Object) new Connection(wire);
            try (c) {
                ((Connection) (Object) c).send("PING");
            }
            Spec.eq(wire, List.of("HELLO", "PING", "BYE"), "messages émis");
        });

        Spec.test("Connection : send après close est refusé", () -> {
            List<String> wire = new ArrayList<>();
            Connection c = new Connection(wire);
            c.close();
            Spec.check(c.isClosed(), "isClosed() doit renvoyer true après close()");
            var e = Spec.raises(IllegalStateException.class, () -> c.send("PING"), "send après close");
            Spec.check(e.getMessage() != null && e.getMessage().contains("PING"), "le message doit dire ce qu'on essayait d'envoyer");
        });

        Spec.test("Connection : close est idempotent", () -> {
            List<String> wire = new ArrayList<>();
            Connection c = new Connection(wire);
            c.close();
            c.close();
            Spec.eq(wire, List.of("HELLO", "BYE"), "messages après deux close()");
        });

        Spec.test("Connection ne compte pas sur finalize()", () -> {
            boolean declares = Arrays.stream(Connection.class.getDeclaredMethods()).anyMatch(m -> m.getName().equals("finalize"));
            Spec.check(!declares, "finalize() peut ne jamais être appelé (et il est déprécié pour suppression) : retire-le");
        });

        Spec.test("copy : copie tout et ferme les deux, la destination en premier", () -> {
            log.clear();
            var sink = new FakeSink[1];
            long n = Transfers.copy(() -> new FakeSource("Bonjour le monde !"), () -> sink[0] = new FakeSink());
            Spec.eq(n, 18L, "nombre de caractères copiés");
            Spec.eq(sink[0].out.toString(), "Bonjour le monde !", "contenu copié");
            Spec.eq(log, List.of("open source", "open sink", "close sink", "close source"), "ordre des événements");
        });

        Spec.test("copy : si la destination ne s'ouvre pas, la source est quand même fermée", () -> {
            log.clear();
            Spec.raises(IllegalStateException.class,
                    () -> Transfers.copy(() -> new FakeSource("x"), () -> { throw new IllegalStateException("disque plein"); }),
                    "ouverture de la destination en échec");
            Spec.eq(log, List.of("open source", "close source"), "événements");
        });

        Spec.test("copy : l'erreur de lecture remonte, celle de la fermeture est supprimée", () -> {
            log.clear();
            var e = Spec.raises(IOException.class, () -> Transfers.copy(
                    () -> { var s = new FakeSource("abc"); s.failRead = true; s.failClose = true; return s; },
                    FakeSink::new), "copie en échec");
            Spec.eq(e.getMessage(), "lecture impossible",
                    "exception reçue : l'erreur de fermeture a écrasé celle de lecture, la vraie cause est perdue");
            Spec.eq(e.getSuppressed().length, 1, "nombre d'exceptions supprimées attachées à l'erreur de lecture");
            Spec.eq(e.getSuppressed()[0].getMessage(), "fermeture source impossible", "exception supprimée");
        });

        Spec.test("copy : deux fermetures en échec, la première reste visible", () -> {
            log.clear();
            var e = Spec.raises(IOException.class, () -> Transfers.copy(
                    () -> { var s = new FakeSource("abc"); s.failClose = true; return s; },
                    () -> { var k = new FakeSink(); k.failClose = true; return k; }), "fermetures en échec");
            Spec.eq(e.getMessage(), "fermeture sink impossible", "exception principale (la destination est fermée en premier)");
            Spec.eq(e.getSuppressed().length, 1, "exceptions supprimées");
            Spec.eq(log, List.of("open source", "open sink", "close sink", "close source"), "les deux close() ont été tentés");
        });

        Spec.done();
    }
}
