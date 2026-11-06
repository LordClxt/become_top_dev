import java.io.IOException;
import java.time.Clock;

/** Journal des ordres acceptés, écrit par lots sur un {@link Sink}. */
public final class OrderJournal implements AutoCloseable {

    // TODO : champs, constructeur privé.

    public static OrderJournal open(Sink sink, Clock clock, int capacity) {
        throw new UnsupportedOperationException("open à écrire");
    }

    public void record(Order order) throws IOException {
        throw new UnsupportedOperationException("record à écrire");
    }

    public int buffered() {
        throw new UnsupportedOperationException("buffered à écrire");
    }

    public void flush() throws IOException {
        throw new UnsupportedOperationException("flush à écrire");
    }

    @Override
    public void close() throws IOException {
        throw new UnsupportedOperationException("close à écrire");
    }
}
