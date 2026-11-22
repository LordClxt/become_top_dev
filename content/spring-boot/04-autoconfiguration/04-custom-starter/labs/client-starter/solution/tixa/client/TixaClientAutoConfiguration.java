package tixa.client;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

/**
 * L'autoconfiguration du starter : les propriétés d'abord, puis les customizers de l'application dans leur
 * ordre (@Order), et un remplacement complet reste possible.
 */
@AutoConfiguration
@EnableConfigurationProperties(TixaClientProperties.class)
public class TixaClientAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    TixaClient tixaClient(TixaClientProperties props, ObjectProvider<TixaClientCustomizer> customizers) {
        TixaClient.Builder builder = TixaClient.builder().baseUrl(props.baseUrl()).timeout(props.timeout());
        customizers.orderedStream().forEach(c -> c.customize(builder));
        return builder.build();
    }
}
