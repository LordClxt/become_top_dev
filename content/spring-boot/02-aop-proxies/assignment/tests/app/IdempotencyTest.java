package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

class IdempotencyTest {

    @Test
    @DisplayName("même clé : le résultat est rejoué, la banque n'est appelée qu'une fois")
    void sameKeyReplays() {
        try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
            PaymentService payments = ctx.getBean(PaymentService.class);
            String first = payments.charge("cmd-42", 9000);
            String second = payments.charge("cmd-42", 9000);
            assertThat(second).as("second charge avec la même clé").isEqualTo(first);
            assertThat(payments.bankCalls()).as("appels réels à la banque").isEqualTo(1);
        }
    }

    @Test
    @DisplayName("clés différentes : deux paiements")
    void differentKeys() {
        try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
            PaymentService payments = ctx.getBean(PaymentService.class);
            payments.charge("cmd-1", 100);
            payments.charge("cmd-2", 100);
            assertThat(payments.bankCalls()).as("appels réels à la banque").isEqualTo(2);
        }
    }

    @Test
    @DisplayName("un échec n'est pas mémorisé : le client peut réessayer avec la même clé")
    void failureNotRemembered() {
        try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
            PaymentService payments = ctx.getBean(PaymentService.class);
            payments.setBankDown(true);
            assertThatThrownBy(() -> payments.charge("cmd-7", 500)).as("charge pendant la panne").isInstanceOf(IllegalStateException.class);
            payments.setBankDown(false);
            assertThat(payments.charge("cmd-7", 500)).as("charge après la panne, même clé").isEqualTo("pay-2-500");
            assertThat(payments.charge("cmd-7", 500)).as("puis rejoué").isEqualTo("pay-2-500");
        }
    }

    @Test
    @DisplayName("la clé est lue à la position keyArg, et chaque méthode a ses propres clés")
    void keyArgAndPerMethod() {
        try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
            PaymentService payments = ctx.getBean(PaymentService.class);
            String refund = payments.refund("pay-1", "r-1");
            assertThat(payments.refund("pay-1", "r-1")).as("refund rejoué avec la clé r-1 (2e argument)").isEqualTo(refund);
            payments.charge("r-1", 100);
            assertThat(payments.bankCalls()).as("appels réels : un refund et un charge, même si la clé est identique").isEqualTo(2);
        }
    }

    @Test
    @DisplayName("une clé absente ou vide est refusée avant tout appel à la banque")
    void missingKeyRejected() {
        try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
            PaymentService payments = ctx.getBean(PaymentService.class);
            assertThatThrownBy(() -> payments.charge(null, 100)).as("charge(null, 100)").isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> payments.charge(" ", 100)).as("charge(\" \", 100)").isInstanceOf(IllegalArgumentException.class);
            assertThat(payments.bankCalls()).as("appels réels à la banque").isZero();
        }
    }
}
