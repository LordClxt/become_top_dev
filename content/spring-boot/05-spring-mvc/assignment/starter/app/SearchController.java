package app;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SearchController {
    private final EventCatalog catalog;

    public SearchController(EventCatalog catalog) {
        this.catalog = catalog;
    }

    @GetMapping("/events/search")
    public EventPage search(@RequestParam(required = false) String city) {
        var items = catalog.all().stream().filter(e -> city == null || e.city().equals(city)).toList();
        return new EventPage(items, 0, items.size(), items.size());
    }
}
