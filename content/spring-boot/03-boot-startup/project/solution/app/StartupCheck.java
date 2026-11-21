package app;

import java.util.Arrays;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/** Contrôle de démarrage et message de fin de démarrage. */
@Component
public class StartupCheck implements ApplicationRunner {
    private final Bank bank;
    private final TixaProperties props;
    private final Environment env;
    private final StartupLog log;

    public StartupCheck(Bank bank, TixaProperties props, Environment env, StartupLog log) {
        this.bank = bank;
        this.props = props;
        this.env = env;
        this.log = log;
    }

    // Un runner qui lève une exception fait échouer le démarrage : l'application n'est jamais déclarée prête.
    @Override
    public void run(ApplicationArguments args) {
        if (!bank.ping()) throw new IllegalStateException("la banque ne répond pas : " + bank.name());
        log.add("banque joignable : " + bank.name());
    }

    // ApplicationReadyEvent : après les runners, quand l'application accepte du trafic.
    @EventListener(ApplicationReadyEvent.class)
    public void ready() {
        String profiles = env.getActiveProfiles().length == 0 ? "default" : String.join(",", Arrays.asList(env.getActiveProfiles()));
        log.add("Tixa prêt (" + profiles + ", frais " + props.feeCents() + ")");
    }
}
