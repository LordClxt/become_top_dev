package app;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Le catalogue, en mémoire. Fourni : ne pas modifier. */
public class EventCatalog {
    private final Map<String, Event> events;

    public EventCatalog(List<Event> events) {
        this.events = events.stream().collect(Collectors.toUnmodifiableMap(Event::id, Function.identity()));
    }

    public Optional<Event> find(String eventId) {
        return Optional.ofNullable(events.get(eventId));
    }
}
