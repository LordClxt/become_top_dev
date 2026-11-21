package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.ConfigurableApplicationContext;

class TypedConfigTest {

    static ConfigurableApplicationContext start(String... args) {
        var app = new SpringApplication(TixaApp.class);
        app.setBannerMode(Banner.Mode.OFF);
        app.setWebApplicationType(WebApplicationType.NONE);
        return app.run(args);
    }

    @Test
    @DisplayName("sans configuration : les valeurs par défaut")
    void defaults() {
        try (var ctx = start()) {
            TixaProperties p = ctx.getBean(TixaProperties.class);
            assertThat(p.currency()).as("currency par défaut").isEqualTo("EUR");
            assertThat(p.notifiers()).as("notifiers par défaut (liste vide, jamais null)").isEqualTo(List.of());
            assertThat(p.hold()).as("hold par défaut (jamais null)").isNotNull();
            assertThat(p.hold().timeout()).as("hold.timeout par défaut").isEqualTo(Duration.ofMinutes(15));
            assertThat(p.hold().maxSeats()).as("hold.max-seats par défaut").isEqualTo(6);
        }
    }

    @Test
    @DisplayName("liaison : durées, listes et noms souples")
    void binding() {
        try (var ctx = start("--tixa.currency=CHF", "--tixa.notifiers=email,sms", "--tixa.hold.timeout=90s", "--tixa.hold.maxSeats=4")) {
            TixaProperties p = ctx.getBean(TixaProperties.class);
            assertThat(p.currency()).as("currency").isEqualTo("CHF");
            assertThat(p.notifiers()).as("notifiers").isEqualTo(List.of("email", "sms"));
            assertThat(ctx.getBean(HoldService.class).holdTimeout()).as("hold.timeout=90s").isEqualTo(Duration.ofSeconds(90));
            assertThat(ctx.getBean(HoldService.class).maxSeats()).as("hold.maxSeats=4 (forme camelCase)").isEqualTo(4);
        }
    }

    @Test
    @DisplayName("une valeur hors limites fait échouer le démarrage")
    void invalidMaxSeats() {
        assertThatThrownBy(() -> start("--tixa.hold.max-seats=50").close()).as("tixa.hold.max-seats=50")
                .hasStackTraceContaining("tixa.hold.maxSeats");
    }

    @Test
    @DisplayName("une devise mal écrite fait échouer le démarrage")
    void invalidCurrency() {
        assertThatThrownBy(() -> start("--tixa.currency=euro").close()).as("tixa.currency=euro")
                .hasStackTraceContaining("tixa.currency");
    }

    @Test
    @DisplayName("une durée illisible fait échouer le démarrage")
    void unreadableDuration() {
        assertThatThrownBy(() -> start("--tixa.hold.timeout=quinze minutes").close()).as("tixa.hold.timeout illisible")
                .hasStackTraceContaining("tixa.hold.timeout");
    }
}
