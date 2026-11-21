package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

class M2RetryTest {

    @Test
    @DisplayName("M2 — prestataire indisponible deux fois : le débit réussit à la 3e tentative")
    void retriedUntilSuccess() {
        try (var ctx = new AnnotationConfigApplicationContext(TixaConfig.class)) {
            ctx.getBean(Bank.class).setUnavailableFor(2);
            assertThat(ctx.getBean(PaymentClient.class).charge("visa", 4500)).as("charge").isEqualTo("pay-3-4500");
            assertThat(ctx.getBean(Bank.class).calls()).as("appels à la banque").isEqualTo(3);
        }
    }

    @Test
    @DisplayName("M2 — au plus 3 tentatives, puis l'indisponibilité remonte")
    void givesUp() {
        try (var ctx = new AnnotationConfigApplicationContext(TixaConfig.class)) {
            ctx.getBean(Bank.class).setUnavailableFor(10);
            assertThatThrownBy(() -> ctx.getBean(PaymentClient.class).charge("visa", 100)).as("charge, banque en panne")
                    .isInstanceOf(PaymentUnavailableException.class);
            assertThat(ctx.getBean(Bank.class).calls()).as("appels à la banque").isEqualTo(3);
        }
    }

    @Test
    @DisplayName("M2 — une carte refusée n'est jamais réessayée")
    void declinedNotRetried() {
        try (var ctx = new AnnotationConfigApplicationContext(TixaConfig.class)) {
            assertThatThrownBy(() -> ctx.getBean(PaymentClient.class).charge("declined", 100)).as("carte refusée")
                    .isInstanceOf(PaymentDeclinedException.class);
            assertThat(ctx.getBean(Bank.class).calls()).as("appels à la banque pour une carte refusée").isEqualTo(1);
        }
    }
}
