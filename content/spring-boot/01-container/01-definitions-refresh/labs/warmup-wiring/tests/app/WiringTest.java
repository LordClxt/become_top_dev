package app;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

class WiringTest {
    AnnotationConfigApplicationContext ctx;

    @BeforeEach
    void start() {
        ctx = new AnnotationConfigApplicationContext(TixaConfig.class);
    }

    @AfterEach
    void stop() {
        ctx.close();
    }

    @Test
    @DisplayName("le conteneur fournit un ReservationService prêt à l'emploi")
    void reservationServiceIsWired() {
        assertThat(ctx.getBeanNamesForType(ReservationService.class))
                .as("beans de type ReservationService (déclare-le avec @Bean dans TixaConfig)")
                .hasSize(1);
        ReservationService service = ctx.getBean(ReservationService.class);
        assertThat(service.quote("jazz-0612", 2))
                .as("devis pour 2 places à 45,00 € avec 1,50 € de frais par place, en centimes")
                .isEqualTo(9300);
    }

    @Test
    @DisplayName("les beans portent le nom de leur méthode @Bean")
    void beanNames() {
        assertThat(List.of(ctx.getBeanDefinitionNames()))
                .as("noms des définitions de beans du contexte")
                .contains("eventCatalog", "priceCalculator", "reservationService");
    }

    @Test
    @DisplayName("le service reçoit le catalogue du conteneur, pas une copie")
    void sharedSingleton() {
        ReservationService service = ctx.getBean(ReservationService.class);
        assertThat(service.catalog())
                .as("catalogue injecté dans ReservationService (doit être le bean eventCatalog lui-même)")
                .isSameAs(ctx.getBean(EventCatalog.class));
    }
}
