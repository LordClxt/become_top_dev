package tixa.client;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Bean;

/**
 * Ajoute les métriques quand un client existe. Sans ordre explicite, les autoconfigurations sont triées
 * par nom de classe : « ClientMetrics… » passerait avant « TixaClient… », et @ConditionalOnBean ne verrait rien.
 */
@AutoConfiguration(after = TixaClientAutoConfiguration.class)
public class ClientMetricsAutoConfiguration {

    @Bean
    @ConditionalOnBean(TixaClient.class)
    ClientMetrics clientMetrics(TixaClient client) { return new ClientMetrics(client); }
}
