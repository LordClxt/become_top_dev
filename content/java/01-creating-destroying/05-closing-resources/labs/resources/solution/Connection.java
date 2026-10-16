import java.util.List;
import java.util.Objects;

/** Connexion à fermer explicitement, de préférence avec try-with-resources. */
public final class Connection implements AutoCloseable {
    private final List<String> wire;
    private boolean closed;

    /** {@code wire} reçoit tout ce que la connexion émet (y compris "BYE" à la fermeture). */
    public Connection(List<String> wire) {
        this.wire = Objects.requireNonNull(wire, "wire");
        wire.add("HELLO");
    }

    public void send(String message) {
        if (closed) throw new IllegalStateException("connexion fermée, impossible d'envoyer : " + message);
        wire.add(message);
    }

    public boolean isClosed() { return closed; }

    /** Idempotent : un second appel ne fait rien. */
    @Override public void close() {
        if (closed) return;
        closed = true;
        wire.add("BYE");
    }
}
