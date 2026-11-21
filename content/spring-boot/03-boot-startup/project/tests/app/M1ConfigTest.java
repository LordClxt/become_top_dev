package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class M1ConfigTest {

    @Test
    @DisplayName("M1 — valeurs par défaut : frais 150, réservation 15 min")
    void defaults() {
        try (var ctx = Tixa.start()) {
            TixaProperties p = ctx.getBean(TixaProperties.class);
            assertThat(p.feeCents()).as("tixa.fee-cents par défaut").isEqualTo(150);
            assertThat(p.holdTimeout()).as("tixa.hold-timeout par défaut").isEqualTo(Duration.ofMinutes(15));
        }
    }

    @Test
    @DisplayName("M1 — liaison et conversion des durées")
    void binding() {
        try (var ctx = Tixa.start("--tixa.fee-cents=90", "--tixa.hold-timeout=2m")) {
            TixaProperties p = ctx.getBean(TixaProperties.class);
            assertThat(p.feeCents()).as("tixa.fee-cents").isEqualTo(90);
            assertThat(p.holdTimeout()).as("tixa.hold-timeout=2m").isEqualTo(Duration.ofMinutes(2));
        }
    }

    @Test
    @DisplayName("M1 — des frais négatifs font échouer le démarrage")
    void negativeFee() {
        assertThatThrownBy(() -> Tixa.start("--tixa.fee-cents=-1").close()).as("tixa.fee-cents=-1").hasStackTraceContaining("tixa.feeCents");
    }
}
