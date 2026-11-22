package app;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** La sonde de l'hébergeur : elle n'envoie aucun en-tête de version. */
@RestController
public class HealthController {
    @GetMapping("/health")
    public String health() {
        return "up";
    }
}
