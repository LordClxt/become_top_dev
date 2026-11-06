import java.time.Instant;

/** Le canal d'envoi réel (SMTP, passerelle SMS…). Fourni. */
public interface Transport extends AutoCloseable {
    void send(String id, Message message, Instant sentAt) throws SendException;

    @Override
    void close() throws SendException;
}
