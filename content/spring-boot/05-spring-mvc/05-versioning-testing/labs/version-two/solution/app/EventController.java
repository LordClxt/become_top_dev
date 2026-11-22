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

    @GetMapping(path = "/events/{id}", version = "1")
    public ResponseEntity<EventV1> v1(@PathVariable long id) {
        return ResponseEntity.of(catalog.find(id).map(EventV1::of));
    }

    /** « 2+ » : la version 2 et les suivantes, tant qu'aucune route plus précise ne la remplace. */
    @GetMapping(path = "/events/{id}", version = "2+")
    public ResponseEntity<EventV2> v2(@PathVariable long id) {
        return ResponseEntity.of(catalog.find(id).map(EventV2::of));
    }
}
