package app;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class IdempotencyStore {
    public record Entry(String customerId, ReservationRequest request, Reservation reservation) {
        boolean sameAs(String customerId, ReservationRequest request) {
            return this.customerId.equals(customerId) && this.request.equals(request);
        }
    }

    private final Map<String, Entry> entries = new ConcurrentHashMap<>();

    public Optional<Entry> find(String key) {
        return Optional.ofNullable(entries.get(key));
    }

    public void save(String key, Entry entry) {
        entries.put(key, entry);
    }
}
