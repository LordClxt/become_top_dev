package app;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.FilteredClassLoader;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import tixa.metrics.MeterSink;
import tixa.payment.PaymentAutoConfiguration;
import tixa.payment.PaymentMetrics;
import tixa.payment.PaymentMetricsAutoConfiguration;

class M3MetricsTest {

    // L'ordre de la liste ne compte pas : AutoConfigurations trie comme Spring Boot.
    final ApplicationContextRunner runner = new ApplicationContextRunner().withConfiguration(
            AutoConfigurations.of(PaymentMetricsAutoConfiguration.class, PaymentAutoConfiguration.class));

    @Test
    @DisplayName("M3 — un client et la bibliothèque de métriques : le compteur est enregistré")
    void metricsRegistered() {
        runner.withPropertyValues("tixa.payment.api-key=sk").run(ctx -> {
            assertThat(ctx).as("contexte").hasSingleBean(PaymentMetrics.class);
            assertThat(ctx.getBean(MeterSink.class).meters()).as("compteurs").containsExactly("tixa.payment.calls[https://pay.tixa.example]");
        });
    }

    @Test
    @DisplayName("M3 — sans client, pas de métriques de paiement")
    void noClientNoMetrics() {
        runner.run(ctx -> assertThat(ctx).as("contexte sans clé").doesNotHaveBean(PaymentMetrics.class));
    }

    @Test
    @DisplayName("M3 — sans la bibliothèque de métriques, l'application démarre quand même")
    void withoutMetricsLibrary() {
        runner.withPropertyValues("tixa.payment.api-key=sk").withClassLoader(new FilteredClassLoader("tixa.metrics")).run(ctx -> {
            assertThat(ctx).as("contexte").hasNotFailed();
            assertThat(ctx).as("contexte").doesNotHaveBean(PaymentMetrics.class);
        });
    }
}
