package tixa.client;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Bean;

/** Ajoute les métriques quand un client existe. */
@AutoConfiguration
public class ClientMetricsAutoConfiguration {

    @Bean
    @ConditionalOnBean(TixaClient.class)
    ClientMetrics clientMetrics(TixaClient client) { return new ClientMetrics(client); }
}
