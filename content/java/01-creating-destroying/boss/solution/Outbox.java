import java.time.Clock;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Objects;
import java.util.function.Supplier;

/** File d'envoi : les messages partent au {@link #flush()} ou à la fermeture. */
public final class Outbox implements AutoCloseable {
    private record Pending(String id, Message message) { }

    private final Transport transport;
    private final Clock clock;
    private final Supplier<String> ids;
    private final Deque<Pending> queue = new ArrayDeque<>();
    private boolean closed;

    private Outbox(Transport transport, Clock clock, Supplier<String> ids) {
        this.transport = transport;
        this.clock = clock;
        this.ids = ids;
    }

    public static Outbox open(Transport transport, Clock clock, Supplier<String> ids) {
        return new Outbox(Objects.requireNonNull(transport, "transport"),
                Objects.requireNonNull(clock, "clock"), Objects.requireNonNull(ids, "ids"));
    }

    public String queue(Message message) {
        if (closed) throw new IllegalStateException("outbox fermée");
        String id = ids.get();
        queue.addLast(new Pending(id, Objects.requireNonNull(message, "message")));
        return id;
    }

    public int pending() {
        return queue.size();
    }

    /** Envoie tout ; la première erreur remonte, les suivantes y sont attachées. La file est vidée dans tous les cas. */
    public void flush() throws SendException {
        SendException first = null;
        Pending p;
        while ((p = queue.pollFirst()) != null) { // pollFirst : la file ne retient plus le message
            try {
                transport.send(p.id(), p.message(), clock.instant());
            } catch (SendException e) {
                if (first == null) first = e;
                else first.addSuppressed(e);
            }
        }
        if (first != null) throw first;
    }

    @Override
    public void close() throws SendException {
        if (closed) return;
        closed = true;
        try (transport) { // fermé même si flush échoue ; son erreur devient supprimée
            flush();
        }
    }
}
