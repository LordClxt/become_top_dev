package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class M3StartupTest {

    @Test
    @DisplayName("M3 — le contrôle de la banque passe avant le message « prêt »")
    void readyAfterCheck() {
        try (var ctx = Tixa.start()) {
            assertThat(ctx.getBean(StartupLog.class).lines()).as("journal de démarrage")
                    .containsExactly("banque joignable : factice", "Tixa prêt (default, frais 150)");
        }
    }

    @Test
    @DisplayName("M3 — en prod, le message donne le profil et les frais")
    void readyInProd() {
        try (var ctx = Tixa.start("--spring.profiles.active=prod", "--tixa.bank-url=https://bank.example")) {
            assertThat(ctx.getBean(StartupLog.class).lines()).as("journal de démarrage")
                    .containsExactly("banque joignable : live https://bank.example", "Tixa prêt (prod, frais 200)");
        }
    }

    @Test
    @DisplayName("M3 — une banque injoignable fait échouer le démarrage")
    void unreachableBankFails() {
        assertThatThrownBy(() -> Tixa.start("--spring.profiles.active=prod", "--tixa.bank-url=http://insecure.example").close())
                .as("prod avec une URL http").hasStackTraceContaining("la banque ne répond pas : live http://insecure.example");
    }
}
