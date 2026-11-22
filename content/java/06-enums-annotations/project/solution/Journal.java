import java.io.IOException;
import java.util.List;

/** Un journal d'ordres. Fourni. */
public interface Journal extends AutoCloseable {
    void record(Order order) throws IOException;

    /**
     * Enregistre plusieurs ordres.
     *
     * @implSpec appelle {@link #record(Order)} pour chaque ordre, dans l'ordre de la liste.
     */
    default void recordAll(List<Order> orders) throws IOException {
        for (Order o : orders) record(o);
    }

    void flush() throws IOException;

    @Override
    void close() throws IOException;
}
