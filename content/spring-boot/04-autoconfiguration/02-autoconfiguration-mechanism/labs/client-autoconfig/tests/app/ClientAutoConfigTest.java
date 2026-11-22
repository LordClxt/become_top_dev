package app;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import tixa.client.TixaClient;
import tixa.client.TixaClientAutoConfiguration;

class ClientAutoConfigTest {

    @Configuration(proxyBeanMethods = false)
    static class TeamClient {
        @Bean TixaClient teamClient() { return new TixaClient("https://team.example"); }
    }

    static ConfigurableApplicationContext start(Class<?>[] sources, String... args) {
        var app = new SpringApplication(sources);
        app.setBannerMode(Banner.Mode.OFF);
        app.setWebApplicationType(WebApplicationType.NONE);
        return app.run(args);
    }

    @Test
    @DisplayName("l'application reçoit un TixaClient sans rien déclarer")
    void autoConfigured() {
        try (var ctx = start(new Class<?>[] { TixaApp.class })) {
            assertThat(ctx.getBean(TixaClient.class).baseUrl()).as("URL par défaut").isEqualTo("https://api.tixa.example");
        }
    }

    @Test
    @DisplayName("tixa.client.base-url change l'URL")
    void configurable() {
        try (var ctx = start(new Class<?>[] { TixaApp.class }, "--tixa.client.base-url=https://staging.tixa.example")) {
            assertThat(ctx.getBean(TixaClient.class).baseUrl()).as("URL configurée").isEqualTo("https://staging.tixa.example");
        }
    }

    @Test
    @DisplayName("un client déclaré par l'application remplace celui de l'autoconfiguration")
    void backsOff() {
        try (var ctx = start(new Class<?>[] { TixaApp.class, TeamClient.class })) {
            assertThat(ctx.getBeansOfType(TixaClient.class).keySet()).as("beans TixaClient").containsExactly("teamClient");
        }
    }

    @Test
    @DisplayName("l'autoconfiguration peut être exclue par configuration")
    void excludable() {
        try (var ctx = start(new Class<?>[] { TixaApp.class }, "--spring.autoconfigure.exclude=tixa.client.TixaClientAutoConfiguration")) {
            assertThat(ctx.getBeansOfType(TixaClient.class)).as("beans TixaClient après exclusion").isEmpty();
        }
    }

    @Test
    @DisplayName("c'est une vraie @AutoConfiguration, déclarée dans le fichier imports")
    void declaredAsAutoConfiguration() throws Exception {
        assertThat(TixaClientAutoConfiguration.class.isAnnotationPresent(AutoConfiguration.class)).as("@AutoConfiguration").isTrue();
        var imports = getClass().getClassLoader().getResource("META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports");
        assertThat(imports).as("fichier imports sur le classpath").isNotNull();
        try (var in = imports.openStream()) {
            assertThat(new String(in.readAllBytes())).as("contenu du fichier imports").contains("tixa.client.TixaClientAutoConfiguration");
        }
    }
}
