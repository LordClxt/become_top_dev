package app;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import tixa.payment.PaymentAutoConfiguration;
import tixa.payment.PaymentClient;

class M1ClientTest {

    final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(PaymentAutoConfiguration.class));

    @Configuration(proxyBeanMethods = false)
    static class OwnClient {
        @Bean PaymentClient ownClient() { return new PaymentClient("https://own.example", "k", List.of()); }
    }

    @Test
    @DisplayName("M1 — avec une clé : un client, endpoint par défaut")
    void withKey() {
        runner.withPropertyValues("tixa.payment.api-key=sk_test").run(ctx -> {
            PaymentClient c = ctx.getBean(PaymentClient.class);
            assertThat(c.endpoint()).as("endpoint par défaut").isEqualTo("https://pay.tixa.example");
            assertThat(c.apiKey()).as("clé").isEqualTo("sk_test");
        });
    }

    @Test
    @DisplayName("M1 — sans clé : aucun client")
    void withoutKey() {
        runner.run(ctx -> assertThat(ctx).as("contexte sans clé").doesNotHaveBean(PaymentClient.class));
    }

    @Test
    @DisplayName("M1 — le client de l'application l'emporte")
    void backsOff() {
        runner.withPropertyValues("tixa.payment.api-key=sk").withUserConfiguration(OwnClient.class).run(ctx ->
                assertThat(ctx.getBeansOfType(PaymentClient.class).keySet()).as("beans PaymentClient").containsExactly("ownClient"));
    }

    @Test
    @DisplayName("M1 — une application Spring Boot reçoit le client sans rien importer")
    void discoveredByBoot() {
        var app = new SpringApplication(TixaApp.class);
        app.setBannerMode(Banner.Mode.OFF);
        app.setWebApplicationType(WebApplicationType.NONE);
        try (var ctx = app.run("--tixa.payment.api-key=sk", "--tixa.payment.endpoint=https://staging.example")) {
            assertThat(ctx.getBean(PaymentClient.class).charge(100)).as("charge(100)").isEqualTo("débit 100 via https://staging.example");
        }
    }
}
