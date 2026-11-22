package tixa.client;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;

@AutoConfiguration
public class TixaClientAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    TixaClient tixaClient() { return new TixaClient(); }

    // Format de secours : texte brut, si aucun codec JSON n'est disponible.
    @Bean
    @ConditionalOnMissingBean
    TicketCodec plainTextCodec() { return (eventId, seats) -> eventId + " x" + seats; }
}
