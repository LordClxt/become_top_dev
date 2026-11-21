package app;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** La configuration de Tixa : une recette (BeanDefinition) par composant, nommée d'après la méthode. */
@Configuration
public class TixaConfig {

    @Bean
    EventCatalog eventCatalog() {
        return new EventCatalog();
    }

    @Bean
    PriceCalculator priceCalculator() {
        return new PriceCalculator(150);
    }

    // Les dépendances arrivent en paramètres : le conteneur les résout par type.
    @Bean
    ReservationService reservationService(EventCatalog catalog, PriceCalculator prices) {
        return new ReservationService(catalog, prices);
    }
}
