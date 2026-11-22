package app;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class EventCatalog {
    private final Map<Long, Event> events = Map.of(
            1L, new Event(1, "Nuits de Fourvière", 120),
            2L, new Event(2, "Jazz à Vienne", 40));

    /** L'événement, ou EventNotFoundException. */
    public Event get(long id) {
        Event e = events.get(id);
        if (e == null) {
            throw new EventNotFoundException(id);
        }
        return e;
    }
}
