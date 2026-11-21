package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

class AtomicTest {

    @Test
    @DisplayName("succès : les deux écritures sont validées")
    void commit() {
        try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
            ctx.getBean(Accounting.class).sale("jazz", 4500);
            assertThat(ctx.getBean(Ledger.class).count()).as("écritures après une vente").isEqualTo(2);
        }
    }

    @Test
    @DisplayName("exception non vérifiée : tout est annulé")
    void rollbackRuntime() {
        try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
            assertThatThrownBy(() -> ctx.getBean(Accounting.class).sale("jazz", -1)).as("vente négative")
                    .isExactlyInstanceOf(IllegalArgumentException.class);
            assertThat(ctx.getBean(Ledger.class).count()).as("écritures après une vente refusée").isZero();
        }
    }

    @Test
    @DisplayName("exception vérifiée : tout est annulé aussi")
    void rollbackChecked() {
        try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
            assertThatThrownBy(() -> ctx.getBean(Accounting.class).refund("closed", 100)).as("remboursement d'un événement clôturé")
                    .hasMessage("événement clôturé");
            assertThat(ctx.getBean(Ledger.class).count()).as("écritures après un remboursement refusé").isZero();
        }
    }

    @Test
    @DisplayName("un @Atomic appelé dans un @Atomic rejoint la transaction : un échec externe annule l'audit")
    void nestedJoins() {
        try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
            assertThatThrownBy(() -> ctx.getBean(Accounting.class).transfer("caisse", "nowhere", 100)).as("virement vers un compte inconnu")
                    .isInstanceOf(IllegalStateException.class);
            assertThat(ctx.getBean(Ledger.class).count()).as("écritures, audit compris, après l'échec du virement").isZero();
        }
    }

    @Test
    @DisplayName("un virement réussi garde ses trois écritures")
    void nestedCommit() {
        try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
            ctx.getBean(Accounting.class).transfer("caisse", "banque", 100);
            assertThat(ctx.getBean(Ledger.class).count()).as("écritures après un virement").isEqualTo(3);
        }
    }

    @Test
    @DisplayName("@Retryable + @Atomic : chaque tentative a sa transaction, seule la dernière reste")
    void retryEachAttemptOwnTransaction() {
        try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
            Accounting accounting = ctx.getBean(Accounting.class);
            accounting.setLockConflicts(2);
            accounting.settle("jazz");
            assertThat(accounting.attempts()).as("tentatives").isEqualTo(3);
            assertThat(ctx.getBean(Ledger.class).count()).as("écritures après deux conflits puis un succès").isEqualTo(1);
        }
    }

    @Test
    @DisplayName("sans conflit, une seule tentative")
    void noConflict() {
        try (var ctx = new AnnotationConfigApplicationContext(AppConfig.class)) {
            Accounting accounting = ctx.getBean(Accounting.class);
            accounting.settle("rock");
            assertThat(accounting.attempts()).as("tentatives").isEqualTo(1);
            assertThat(ctx.getBean(Ledger.class).count()).as("écritures").isEqualTo(1);
        }
    }
}
