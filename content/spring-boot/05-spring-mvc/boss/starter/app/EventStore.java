package app;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/** Le catalogue et ses places restantes (en mémoire). */
@Service
public class EventStore {
    private final Map<Long, Event> events = new ConcurrentHashMap<>(Map.of(
            1L, new Event(1, "Nuits de Fourvière", LocalDateTime.of(2026, 7, 3, 21, 30), "Théâtre antique", "Lyon", 120),
            2L, new Event(2, "Jazz à Vienne", LocalDateTime.of(2026, 7, 10, 20, 0), "Théâtre antique", "Vienne", 3)));

    public List<Event> all() {
        return events.values().stream().sorted((a, b) -> Long.compare(a.id(), b.id())).toList();
    }

    public Optional<Event> find(long id) {
        return Optional.ofNullable(events.get(id));
    }

    /** Retire des places ; faux s'il n'en reste pas assez (rien n'est retiré). */
    public synchronized boolean take(long id, int seats) {
        Event e = events.get(id);
        if (e == null || e.seatsLeft() < seats) {
            return false;
        }
        events.put(id, new Event(e.id(), e.title(), e.startsAt(), e.venueName(), e.city(), e.seatsLeft() - seats));
        return true;
    }
}
