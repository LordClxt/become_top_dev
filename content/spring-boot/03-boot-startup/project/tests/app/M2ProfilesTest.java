package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class M2ProfilesTest {

    @Test
    @DisplayName("M2 — sans profil : banque factice")
    void devBank() {
        try (var ctx = Tixa.start()) {
            assertThat(ctx.getBean(Bank.class).name()).as("banque sans profil").isEqualTo("factice");
        }
    }

    @Test
    @DisplayName("M2 — prod : vraie banque et frais contractuels de 200")
    void prod() {
        try (var ctx = Tixa.start("--spring.profiles.active=prod", "--tixa.bank-url=https://bank.example")) {
            assertThat(ctx.getBean(Bank.class).name()).as("banque en prod").isEqualTo("live https://bank.example");
            assertThat(ctx.getBean(TixaProperties.class).feeCents()).as("frais en prod").isEqualTo(200);
        }
    }

    @Test
    @DisplayName("M2 — staging active prod")
    void staging() {
        try (var ctx = Tixa.start("--spring.profiles.active=staging", "--tixa.bank-url=https://staging.example")) {
            assertThat(ctx.getBean(Bank.class).name()).as("banque en staging").isEqualTo("live https://staging.example");
        }
    }

    @Test
    @DisplayName("M2 — prod sans URL de banque : le démarrage échoue")
    void prodWithoutUrl() {
        assertThatThrownBy(() -> Tixa.start("--spring.profiles.active=prod").close()).as("prod sans tixa.bank-url")
                .hasStackTraceContaining("tixa.bank-url est obligatoire en production");
    }
}
