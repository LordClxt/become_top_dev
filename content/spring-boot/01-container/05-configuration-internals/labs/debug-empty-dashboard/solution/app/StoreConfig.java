package app;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Les beans de la billetterie.
 * @Configuration (et non @Component) : la classe est sous-classée par CGLIB, et l'appel reservationStore()
 * passe par le conteneur, qui renvoie le singleton. Les dépendances passent en plus par les paramètres,
 * ce qui reste juste même si quelqu'un remet un jour @Component ou proxyBeanMethods = false.
 */
@Configuration
public class StoreConfig {

    @Bean
    ReservationStore reservationStore() {
        return new ReservationStore();
    }

    @Bean
    ReservationService reservationService(ReservationStore store) {
        return new ReservationService(store);
    }

    @Bean
    Dashboard dashboard(ReservationStore store) {
        return new Dashboard(store);
    }
}
