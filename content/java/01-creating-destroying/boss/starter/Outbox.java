import java.time.Clock;
import java.util.function.Supplier;

/** File d'envoi : les messages partent au flush() ou à la fermeture. */
public final class Outbox implements AutoCloseable {

    // TODO : pas de constructeur public.

    public static Outbox open(Transport transport, Clock clock, Supplier<String> ids) {
        throw new UnsupportedOperationException("open à écrire");
    }

    public String queue(Message message) {
        throw new UnsupportedOperationException("queue à écrire");
    }

    public int pending() {
        throw new UnsupportedOperationException("pending à écrire");
    }

    public void flush() throws SendException {
        throw new UnsupportedOperationException("flush à écrire");
    }

    @Override
    public void close() throws SendException {
        throw new UnsupportedOperationException("close à écrire");
    }
}
