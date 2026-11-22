package tixa.client;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;

import tools.jackson.databind.json.JsonMapper;

/** Encode les billets en JSON quand Jackson est présent. */
@AutoConfiguration(before = TixaClientAutoConfiguration.class)
@ConditionalOnClass(name = "com.fasterxml.jackson.databind.ObjectMapper")
public class JsonCodecAutoConfiguration {

    @Bean
    TicketCodec jsonCodec() {
        JsonMapper json = JsonMapper.builder().build();
        return (eventId, seats) -> json.writeValueAsString(java.util.Map.of("event", eventId, "seats", seats));
    }
}
