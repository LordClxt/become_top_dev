package app;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;

/** Le support rejoue les démarrages de recette et de production. */
class TariffTest {

    static String feeWith(String... args) {
        var app = new SpringApplication(TixaApp.class);
        app.setBannerMode(Banner.Mode.OFF);
        app.setWebApplicationType(WebApplicationType.NONE);
        try (var ctx = app.run(args)) {
            return ctx.getBean(FeeService.class).describe();
        }
    }

    @Test
    @DisplayName("recette (aucun profil) : le tarif de la grille finance")
    void defaultTariff() {
        assertThat(feeWith()).as("frais en recette").isEqualTo("180 EUR");
    }

    @Test
    @DisplayName("production : le tarif contractuel")
    void prodTariff() {
        assertThat(feeWith("--spring.profiles.active=prod")).as("frais en production").isEqualTo("200 EUR");
    }

    @Test
    @DisplayName("une option de ligne de commande l'emporte toujours (dépannage)")
    void commandLineWins() {
        assertThat(feeWith("--spring.profiles.active=prod", "--tixa.fee-cents=50")).as("frais avec --tixa.fee-cents=50").isEqualTo("50 EUR");
    }
}
