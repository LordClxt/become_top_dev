package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

class M3CheckoutTest {

    @Test
    @DisplayName("M3 — un paiement réussi après deux indisponibilités : une seule ligne d'audit")
    void oneAuditLinePerPayment() {
        try (var ctx = new AnnotationConfigApplicationContext(TixaConfig.class)) {
            ctx.getBean(Bank.class).setUnavailableFor(2);
            ctx.getBean(Checkout.class).pay("cmd-1", "visa", 9000);
            assertThat(ctx.getBean(AuditLog.class).lines()).as("journal d'audit (un paiement = une ligne)")
                    .containsExactly("pay(cmd-1) ok pay-3-9000");
        }
    }

    @Test
    @DisplayName("M3 — un paiement refusé : une ligne d'échec, la commande comme référence")
    void declinedPayment() {
        try (var ctx = new AnnotationConfigApplicationContext(TixaConfig.class)) {
            assertThatThrownBy(() -> ctx.getBean(Checkout.class).pay("cmd-2", "declined", 100)).as("paiement refusé")
                    .isInstanceOf(PaymentDeclinedException.class);
            assertThat(ctx.getBean(AuditLog.class).lines()).as("journal d'audit").containsExactly("pay(cmd-2) échec carte refusée");
        }
    }

    @Test
    @DisplayName("M3 — une panne définitive : une seule ligne d'échec, pas une par tentative")
    void finalOutage() {
        try (var ctx = new AnnotationConfigApplicationContext(TixaConfig.class)) {
            ctx.getBean(Bank.class).setUnavailableFor(10);
            assertThatThrownBy(() -> ctx.getBean(Checkout.class).pay("cmd-3", "visa", 100)).as("panne")
                    .isInstanceOf(PaymentUnavailableException.class);
            assertThat(ctx.getBean(AuditLog.class).lines()).as("journal d'audit").containsExactly("pay(cmd-3) échec prestataire indisponible");
        }
    }
}
