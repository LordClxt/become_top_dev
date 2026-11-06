import java.io.IOException;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** Journal des ordres acceptés, écrit par lots sur un {@link Sink}. */
public final class OrderJournal implements AutoCloseable {
    private final Sink sink;
    private final Clock clock;
    private final int capacity;
    private final List<String> buffer;
    private boolean closed;

    private OrderJournal(Sink sink, Clock clock, int capacity) {
        this.sink = sink;
        this.clock = clock;
        this.capacity = capacity;
        this.buffer = new ArrayList<>(capacity);
    }

    public static OrderJournal open(Sink sink, Clock clock, int capacity) {
        Objects.requireNonNull(sink, "sink");
        Objects.requireNonNull(clock, "clock");
        if (capacity < 1) throw new IllegalArgumentException("capacité d'au moins 1 attendue : " + capacity);
        return new OrderJournal(sink, clock, capacity);
    }

    public void record(Order order) throws IOException {
        if (closed) throw new IllegalStateException("journal fermé : " + order.id());
        buffer.add(clock.instant() + " " + order);
        if (buffer.size() >= capacity) flush();
    }

    public int buffered() {
        return buffer.size();
    }

    /** Écrit le tampon ; il n'est vidé que si l'écriture réussit (aucun ordre perdu). */
    public void flush() throws IOException {
        if (buffer.isEmpty()) return;
        sink.write(List.copyOf(buffer));
        buffer.clear(); // clear() met les cases à null : plus aucune référence aux lignes écrites
    }

    @Override
    public void close() throws IOException {
        if (closed) return;
        closed = true;
        try (sink) {
            flush();
        }
    }
}
