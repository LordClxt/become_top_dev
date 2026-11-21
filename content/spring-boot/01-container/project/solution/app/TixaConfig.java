package app;

import java.time.Clock;
import java.util.Map;
import java.util.function.Supplier;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

/** La configuration de Tixa. Les dépendances passent par les paramètres des méthodes @Bean. */
@Configuration
@Import(PromotionRegistrar.class)
public class TixaConfig {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    EventCatalog eventCatalog() {
        return new EventCatalog(SeedEvents.ALL);
    }

    @Bean
    PricingPolicy standardPricing() {
        return new Pricings.Standard();
    }

    @Bean
    PricingPolicy festivalPricing() {
        return new Pricings.Festival();
    }

    @Bean
    Supplier<String> reservationIds() {
        return new SequentialIds();
    }

    @Bean
    JournalSink journalSink() {
        return new JournalSink();
    }

    // Le journal dépend du support par son constructeur : le conteneur le détruira AVANT le support.
    @Bean
    ReservationJournal reservationJournal(JournalSink sink) {
        return new ReservationJournal(sink);
    }

    @Bean
    ReservationService reservationService(EventCatalog catalog, Map<String, PricingPolicy> pricings, Clock clock,
            Supplier<String> reservationIds, ReservationJournal journal, ObjectProvider<Promotion> promotions) {
        return new ReservationService(catalog, pricings, clock, reservationIds, journal, promotions);
    }
}
