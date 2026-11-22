package app;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import tixa.client.TixaClient;
import tixa.client.TixaClientAutoConfiguration;
import tixa.client.TixaClientCustomizer;

class StarterTest {

    final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(TixaClientAutoConfiguration.class));

    @Configuration(proxyBeanMethods = false)
    static class Customizers {
        @Bean @Order(2) TixaClientCustomizer tracing() { return b -> b.header("X-Trace: on"); }
        @Bean @Order(1) TixaClientCustomizer auth() { return b -> b.header("Authorization: Bearer x"); }
    }

    @Configuration(proxyBeanMethods = false)
    static class FullReplacement {
        @Bean TixaClient myClient() { return TixaClient.builder().baseUrl("https://mine.example").build(); }
        @Bean TixaClientCustomizer ignored() { return b -> b.header("jamais"); }
    }

    @Test
    @DisplayName("valeurs par défaut")
    void defaults() {
        runner.run(ctx -> {
            TixaClient c = ctx.getBean(TixaClient.class);
            assertThat(c.baseUrl()).as("URL par défaut").isEqualTo("https://api.tixa.example");
            assertThat(c.timeout()).as("délai par défaut").isEqualTo(Duration.ofSeconds(5));
        });
    }

    @Test
    @DisplayName("propriétés tixa.client.*")
    void properties() {
        runner.withPropertyValues("tixa.client.base-url=https://staging.example", "tixa.client.timeout=750ms").run(ctx -> {
            TixaClient c = ctx.getBean(TixaClient.class);
            assertThat(c.baseUrl()).as("URL configurée").isEqualTo("https://staging.example");
            assertThat(c.timeout()).as("délai configuré").isEqualTo(Duration.ofMillis(750));
        });
    }

    @Test
    @DisplayName("les customizers de l'application sont appliqués, dans leur ordre")
    void customizersInOrder() {
        runner.withUserConfiguration(Customizers.class).run(ctx ->
                assertThat(ctx.getBean(TixaClient.class).headers()).as("en-têtes")
                        .isEqualTo(List.of("Authorization: Bearer x", "X-Trace: on")));
    }

    @Test
    @DisplayName("un client de l'application remplace tout, customizers compris")
    void fullReplacement() {
        runner.withUserConfiguration(FullReplacement.class).run(ctx -> {
            assertThat(ctx.getBeansOfType(TixaClient.class).keySet()).as("beans TixaClient").containsExactly("myClient");
            assertThat(ctx.getBean(TixaClient.class).headers()).as("en-têtes du client de l'application").isEmpty();
        });
    }
}
