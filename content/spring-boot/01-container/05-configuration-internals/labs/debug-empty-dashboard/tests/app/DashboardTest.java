package app;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

/** Journées réelles rejouées par le support. */
class DashboardTest {

    @Test
    @DisplayName("une vente confirmée apparaît dans le tableau de bord")
    void confirmedSaleIsShown() {
        try (var ctx = new AnnotationConfigApplicationContext(TixaApp.class)) {
            ctx.getBean(ReservationService.class).confirm("jazz-0612", 2);
            assertThat(ctx.getBean(Dashboard.class).soldSeats("jazz-0612"))
                    .as("places vendues affichées pour jazz-0612 après une vente de 2 places")
                    .isEqualTo(2);
        }
    }

    @Test
    @DisplayName("journée du 14 : trois ventes, deux événements")
    void dayOfThe14th() {
        try (var ctx = new AnnotationConfigApplicationContext(TixaApp.class)) {
            ReservationService service = ctx.getBean(ReservationService.class);
            Dashboard dashboard = ctx.getBean(Dashboard.class);
            service.confirm("jazz-0612", 2);
            assertThat(dashboard.soldSeats("jazz-0612")).as("jazz-0612 après la 1re vente").isEqualTo(2);
            service.confirm("rock-0701", 4);
            service.confirm("jazz-0612", 1);
            assertThat(dashboard.soldSeats("jazz-0612")).as("jazz-0612 en fin de journée").isEqualTo(3);
            assertThat(dashboard.soldSeats("rock-0701")).as("rock-0701 en fin de journée").isEqualTo(4);
        }
    }

    @Test
    @DisplayName("le total du support correspond aux ventes confirmées")
    void supportTotal() {
        try (var ctx = new AnnotationConfigApplicationContext(TixaApp.class)) {
            ctx.getBean(ReservationService.class).confirm("jazz-0612", 5);
            assertThat(ctx.getBean(ReservationStore.class).total())
                    .as("total lu par l'outil du support (ctx.getBean(ReservationStore.class).total())")
                    .isEqualTo(5);
        }
    }
}
