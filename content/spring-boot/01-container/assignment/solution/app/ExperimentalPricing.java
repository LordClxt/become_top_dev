package app;

import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.stereotype.Component;

/** Tarification expérimentale : son constructeur appelle un service distant (coûteux). Fourni. */
@Component
@Feature("experimental-pricing")
public class ExperimentalPricing {
    static final AtomicInteger INSTANCES = new AtomicInteger();

    public ExperimentalPricing() {
        INSTANCES.incrementAndGet();   // en vrai : connexion au moteur de prix distant
    }
}
