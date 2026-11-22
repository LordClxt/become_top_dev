package app;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.ConfigurableApplicationContext;

import tools.jackson.databind.json.JsonMapper;

class MigrationTest {

    static ConfigurableApplicationContext start() {
        var app = new SpringApplication(TixaApp.class);
        app.setBannerMode(Banner.Mode.OFF);
        app.setWebApplicationType(WebApplicationType.NONE);
        return app.run();
    }

    @Test
    @DisplayName("l'export utilise le JsonMapper de Spring Boot, en snake_case")
    void exportsSnakeCase() {
        try (var ctx = start()) {
            String json = ctx.getBean(TicketExporter.class).export(new Ticket("jazz-0612", 12, 4500));
            assertThat(json).as("billet exporté").contains("\"event_id\":\"jazz-0612\"").contains("\"seat_number\":12").contains("\"price_cents\":4500");
        }
    }

    @Test
    @DisplayName("le customizer s'applique au JsonMapper du conteneur, pas à une copie")
    void customizerOnContainerMapper() {
        try (var ctx = start()) {
            String json = ctx.getBean(JsonMapper.class).writeValueAsString(new Ticket("rock", 1, 100));
            assertThat(json).as("JsonMapper du conteneur").contains("\"seat_number\":1");
        }
    }
}
