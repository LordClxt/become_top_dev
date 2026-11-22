package app;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class EventCatalog {
    private final Map<Long, Event> events = Map.of(
            1L, new Event(1, "Nuits de Fourvière", LocalDateTime.of(2026, 7, 3, 21, 30), "Théâtre antique", "Lyon"),
            2L, new Event(2, "Jazz à Vienne", LocalDateTime.of(2026, 7, 10, 20, 0), "Théâtre antique", "Vienne"));

    public Optional<Event> find(long id) {
        return Optional.ofNullable(events.get(id));
    }
}
