package app;

import java.util.Map;
import org.slf4j.MDC;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ApiController {

    @GetMapping("/events/{id}")
    public Map<String, Object> event(@PathVariable long id) {
        return Map.of("id", id, "name", "Jazz à Vienne");
    }

    @GetMapping("/ping")
    public String ping() {
        return "pong";
    }

    /** Ce que verrait une ligne de journal écrite pendant cette requête. */
    @GetMapping("/whoami")
    public String whoami() {
        return String.valueOf(MDC.get("requestId"));
    }

    @GetMapping("/boom")
    public String boom() {
        throw new IllegalStateException("panne");
    }

    @GetMapping("/admin/stats")
    public Map<String, Integer> stats() {
        return Map.of("reservations", 1284);
    }
}
