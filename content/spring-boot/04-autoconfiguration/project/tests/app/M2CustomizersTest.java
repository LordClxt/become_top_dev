package app;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import tixa.payment.PaymentAutoConfiguration;
import tixa.payment.PaymentClient;
import tixa.payment.PaymentClientCustomizer;

class M2CustomizersTest {

    @Configuration(proxyBeanMethods = false)
    static class Customizers {
        @Bean @Order(20) PaymentClientCustomizer trace() { return h -> h.add("X-Trace"); }
        @Bean @Order(10) PaymentClientCustomizer idempotency() { return h -> h.add("Idempotency-Key"); }
    }

    @Test
    @DisplayName("M2 — les customizers ajoutent leurs en-têtes, dans l'ordre")
    void customizers() {
        new ApplicationContextRunner().withConfiguration(AutoConfigurations.of(PaymentAutoConfiguration.class))
                .withPropertyValues("tixa.payment.api-key=sk").withUserConfiguration(Customizers.class)
                .run(ctx -> assertThat(ctx.getBean(PaymentClient.class).headers()).as("en-têtes").isEqualTo(List.of("Idempotency-Key", "X-Trace")));
    }
}
