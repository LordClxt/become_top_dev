package tixa.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;

/**
 * Fournit un TixaClient aux applications qui ont la bibliothèque, sauf si elles en déclarent un.
 * Hors du paquet de l'application : une autoconfiguration n'est jamais trouvée par le scan, mais par
 * META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports.
 */
@AutoConfiguration
public class TixaClientAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    TixaClient tixaClient(@Value("${tixa.client.base-url:https://api.tixa.example}") String baseUrl) {
        return new TixaClient(baseUrl);
    }
}
