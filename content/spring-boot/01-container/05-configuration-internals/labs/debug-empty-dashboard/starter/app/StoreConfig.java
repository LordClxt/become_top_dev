package app;

import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

/** Les beans de la billetterie. */
@Component
public class StoreConfig {

    @Bean
    ReservationStore reservationStore() {
        return new ReservationStore();
    }

    @Bean
    ReservationService reservationService() {
        return new ReservationService(reservationStore());
    }

    @Bean
    Dashboard dashboard() {
        return new Dashboard(reservationStore());
    }
}
