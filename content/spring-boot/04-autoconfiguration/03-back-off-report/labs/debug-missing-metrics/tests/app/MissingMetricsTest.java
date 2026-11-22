package app;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.FilteredClassLoader;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import tixa.client.ClientMetrics;
import tixa.client.ClientMetricsAutoConfiguration;
import tixa.client.JsonCodecAutoConfiguration;
import tixa.client.TicketCodec;
import tixa.client.TixaClientAutoConfiguration;

/** Le contexte d'une application qui a la bibliothèque, avec les trois autoconfigurations. */
class MissingMetricsTest {

    final ApplicationContextRunner runner = new ApplicationContextRunner().withConfiguration(AutoConfigurations.of(
            TixaClientAutoConfiguration.class, ClientMetricsAutoConfiguration.class, JsonCodecAutoConfiguration.class));

    @Test
    @DisplayName("le tableau de bord a ses métriques de client")
    void metricsPresent() {
        runner.run(ctx -> {
            assertThat(ctx).as("contexte de l'application").hasSingleBean(ClientMetrics.class);
            assertThat(ctx.getBean(ClientMetrics.class).describe()).as("métriques").isEqualTo("métriques de TixaClient");
        });
    }

    @Test
    @DisplayName("les billets partent en JSON")
    void ticketsInJson() {
        runner.run(ctx -> assertThat(ctx.getBean(TicketCodec.class).encode("jazz", 2))
                .as("billet encodé").contains("\"event\":\"jazz\"").contains("\"seats\":2"));
    }

    @Test
    @DisplayName("sans Jackson, le texte brut reste le repli")
    void plainTextFallback() {
        runner.withClassLoader(new FilteredClassLoader("tools.jackson")).run(ctx ->
                assertThat(ctx.getBean(TicketCodec.class).encode("jazz", 2)).as("billet sans Jackson").isEqualTo("jazz x2"));
    }
}
