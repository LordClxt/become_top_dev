package app;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

/** Le catalogue, en mémoire pour l'instant. */
@Service
public class EventCatalog {
    private final List<Event> events = List.of(
            new Event(1, "Nuits de Fourvière", "Lyon", 120),
            new Event(2, "Jazz à Vienne", "Vienne", 0),
            new Event(3, "Les Eurockéennes", "Belfort", 860));

    public List<Event> findAll() {
        return events;
    }

    public Optional<Event> findById(long id) {
        return events.stream().filter(e -> e.id() == id).findFirst();
    }
}
