package app;

import jakarta.validation.Valid;
import java.util.Comparator;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SearchController {
    private final EventCatalog catalog;

    public SearchController(EventCatalog catalog) {
        this.catalog = catalog;
    }

    /** Un seul paramètre, sans annotation : Spring le construit depuis ?city=…&from=… (@ModelAttribute) et le valide. */
    @GetMapping("/events/search")
    public EventPage search(@Valid EventSearch q) {
        Comparator<Event> order = "title".equals(q.sort())
                ? Comparator.comparing(Event::title)
                : Comparator.comparing(Event::date).thenComparing(Event::id);
        var matching = catalog.all().stream()
                .filter(e -> q.city() == null || e.city().equalsIgnoreCase(q.city()))
                .filter(e -> q.from() == null || !e.date().isBefore(q.from()))
                .filter(e -> q.to() == null || !e.date().isAfter(q.to()))
                .sorted(order)
                .toList();
        var items = matching.stream().skip((long) q.page() * q.size()).limit(q.size()).toList();
        return new EventPage(items, q.page(), q.size(), matching.size());
    }
}
