package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.ConfigurableApplicationContext;

class RegionDefaultsTest {

    static ConfigurableApplicationContext start(String... args) {
        var app = new SpringApplication(TixaApp.class);
        app.setBannerMode(Banner.Mode.OFF);
        app.setWebApplicationType(WebApplicationType.NONE);
        return app.run(args);
    }

    @Test
    @DisplayName("région eu (application.yml) : EUR et Europe/Paris")
    void euDefaults() {
        try (var ctx = start()) {
            assertThat(ctx.getEnvironment().getProperty("tixa.currency")).as("tixa.currency en eu").isEqualTo("EUR");
            assertThat(ctx.getEnvironment().getProperty("tixa.time-zone")).as("tixa.time-zone en eu").isEqualTo("Europe/Paris");
        }
    }

    @Test
    @DisplayName("région us en ligne de commande : USD et America/New_York")
    void usDefaults() {
        try (var ctx = start("--tixa.region=us")) {
            assertThat(ctx.getEnvironment().getProperty("tixa.currency")).as("tixa.currency en us").isEqualTo("USD");
            assertThat(ctx.getEnvironment().getProperty("tixa.time-zone")).as("tixa.time-zone en us").isEqualTo("America/New_York");
        }
    }

    @Test
    @DisplayName("une valeur configurée ailleurs l'emporte toujours sur le défaut de région")
    void anyOtherSourceWins() {
        try (var ctx = start("--tixa.region=us", "--tixa.currency=CAD")) {
            assertThat(ctx.getEnvironment().getProperty("tixa.currency")).as("tixa.currency=CAD en us").isEqualTo("CAD");
        }
    }

    @Test
    @DisplayName("les défauts de région passent après les fichiers de configuration")
    void afterConfigFiles() {
        try (var ctx = start()) {
            List<String> names = new ArrayList<>();
            ctx.getEnvironment().getPropertySources().forEach(ps -> names.add(ps.getName()));
            int region = names.indexOf("tixaRegionDefaults");
            assertThat(region).as("position de tixaRegionDefaults dans " + names).isGreaterThanOrEqualTo(0);
            for (int i = 0; i < names.size(); i++) {
                if (names.get(i).startsWith("Config resource") || names.get(i).equals("systemEnvironment")) {
                    assertThat(i).as("la source " + names.get(i) + " doit passer avant tixaRegionDefaults").isLessThan(region);
                }
            }
        }
    }

    @Test
    @DisplayName("une région inconnue fait échouer le démarrage, avec un message clair")
    void unknownRegionFails() {
        assertThatThrownBy(() -> start("--tixa.region=mars").close()).as("tixa.region=mars")
                .hasStackTraceContaining("région inconnue : mars (connues : eu, us)");
    }
}
