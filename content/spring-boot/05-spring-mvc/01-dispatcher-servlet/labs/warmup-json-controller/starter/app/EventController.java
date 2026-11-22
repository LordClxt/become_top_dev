package app;

import java.util.List;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
public class EventController {
    private final EventCatalog catalog;

    public EventController(EventCatalog catalog) {
        this.catalog = catalog;
    }

    @GetMapping("/events")
    public List<Event> all() {
        return catalog.findAll();
    }

    @GetMapping("/events/{id}")
    public Event one(@PathVariable long id) {
        return catalog.findById(id).orElse(null);
    }
}
