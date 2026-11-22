package app;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** @RestController : les valeurs de retour sont écrites en JSON, sans passer par une vue. */
@RestController
public class EventController {
    private final EventCatalog catalog;

    public EventController(EventCatalog catalog) {
        this.catalog = catalog;
    }

    @GetMapping("/events")
    public List<Event> all() {
        return catalog.findAll();
    }

    /** Un événement absent n'est pas un corps vide : c'est un 404. */
    @GetMapping("/events/{id}")
    public ResponseEntity<Event> one(@PathVariable long id) {
        return ResponseEntity.of(catalog.findById(id));
    }
}
