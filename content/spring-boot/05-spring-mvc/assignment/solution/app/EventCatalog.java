package app;

import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;

/** Douze événements de l'été, dans le désordre. */
@Service
public class EventCatalog {
    private final List<Event> events = List.of(
            new Event(1, "Nuits de Fourvière", "Lyon", LocalDate.of(2026, 7, 3)),
            new Event(2, "Jazz à Vienne", "Vienne", LocalDate.of(2026, 7, 10)),
            new Event(3, "Les Eurockéennes", "Belfort", LocalDate.of(2026, 7, 2)),
            new Event(4, "Woodstower", "Lyon", LocalDate.of(2026, 8, 28)),
            new Event(5, "Festival d'Avignon", "Avignon", LocalDate.of(2026, 7, 4)),
            new Event(6, "Les Suds", "Arles", LocalDate.of(2026, 7, 13)),
            new Event(7, "Peacock Society", "Paris", LocalDate.of(2026, 7, 17)),
            new Event(8, "Musilac", "Aix-les-Bains", LocalDate.of(2026, 7, 9)),
            new Event(9, "Fête des Lumières", "Lyon", LocalDate.of(2026, 12, 8)),
            new Event(10, "Chorégies d'Orange", "Orange", LocalDate.of(2026, 6, 20)),
            new Event(11, "Rock en Seine", "Saint-Cloud", LocalDate.of(2026, 8, 21)),
            new Event(12, "Les Francofolies", "La Rochelle", LocalDate.of(2026, 7, 11)));

    public List<Event> all() {
        return events;
    }
}
