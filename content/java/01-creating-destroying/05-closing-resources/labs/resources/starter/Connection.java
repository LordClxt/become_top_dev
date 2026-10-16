import java.util.List;

/**
 * Connexion à fermer. L'auteur précédent comptait sur le ramasse-miettes pour la fermer…
 * TODO : implémenter AutoCloseable, refuser send() après fermeture, close() idempotent,
 * et supprimer finalize().
 */
public class Connection {
    private final List<String> wire;

    /** {@code wire} reçoit tout ce que la connexion émet (y compris "BYE" à la fermeture). */
    public Connection(List<String> wire) {
        this.wire = wire;
        wire.add("HELLO");
    }

    /** Après fermeture : IllegalStateException. */
    public void send(String message) {
        wire.add(message);
    }

    public boolean isClosed() { return false; }

    /** Émet "BYE" une seule fois, même si on l'appelle plusieurs fois. */
    public void close() {
        wire.add("BYE");
    }

    @SuppressWarnings({"deprecation", "removal"})
    @Override protected void finalize() {
        close(); // "filet de sécurité"
    }
}
