package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

class M1AuditTest {

    @Test
    @DisplayName("M1 — une réservation réussie est consignée avec son résultat")
    void success() {
        try (var ctx = new AnnotationConfigApplicationContext(TixaConfig.class)) {
            ctx.getBean(ReservationService.class).reserve("jazz", 2);
            assertThat(ctx.getBean(AuditLog.class).lines()).as("journal d'audit").containsExactly("reserve(jazz) ok jazz:1-2");
        }
    }

    @Test
    @DisplayName("M1 — un échec est consigné avec son message, et l'exception remonte")
    void failure() {
        try (var ctx = new AnnotationConfigApplicationContext(TixaConfig.class)) {
            var reservations = ctx.getBean(ReservationService.class);
            reservations.reserve("rock", 3);
            assertThatThrownBy(() -> reservations.reserve("rock", 2)).as("5 places sur 4").isInstanceOf(IllegalStateException.class);
            assertThat(ctx.getBean(AuditLog.class).lines()).as("journal d'audit")
                    .containsExactly("reserve(rock) ok rock:1-3", "reserve(rock) échec complet");
        }
    }
}
