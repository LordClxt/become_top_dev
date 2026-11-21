package app;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.config.ConfigurableBeanFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;

@Configuration
public class HoldConfig {

    @Bean
    ReleaseLog releaseLog() {
        return new ReleaseLog();
    }

    // Prototype : une nouvelle instance à chaque demande au conteneur.
    @Bean
    @Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE)
    SeatHold seatHold() {
        return new SeatHold();
    }

    // Le guichet (singleton) ne reçoit pas UNE réservation, mais de quoi en demander une à chaque fois.
    @Bean
    HoldDesk holdDesk(ObjectProvider<SeatHold> holds, ReleaseLog releaseLog) {
        return new HoldDesk(holds, releaseLog);
    }
}
