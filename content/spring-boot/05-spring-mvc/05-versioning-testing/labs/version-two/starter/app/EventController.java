package app;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class EventController {
    private final EventCatalog catalog;

    public EventController(EventCatalog catalog) {
        this.catalog = catalog;
    }

    @GetMapping("/events/{id}")
    public ResponseEntity<EventV1> one(@PathVariable long id) {
        return ResponseEntity.of(catalog.find(id).map(EventV1::of));
    }
}
