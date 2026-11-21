package app;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/** Préchauffe le catalogue une fois le contexte prêt, avant que l'application n'accepte du trafic. */
@Component
public class CatalogWarmUp implements ApplicationRunner {
    private final Timeline timeline;

    public CatalogWarmUp(Timeline timeline) { this.timeline = timeline; }

    // Les runners tournent après ApplicationStartedEvent et avant ApplicationReadyEvent.
    @Override
    public void run(ApplicationArguments args) {
        timeline.note("catalogue préchauffé");
    }
}
