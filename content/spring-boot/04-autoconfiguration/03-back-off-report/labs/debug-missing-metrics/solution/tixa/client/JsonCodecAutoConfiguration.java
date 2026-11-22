package tixa.client;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;

import tools.jackson.databind.json.JsonMapper;

/** Encode les billets en JSON quand Jackson 3 est présent (Spring Boot 4 : paquet tools.jackson). */
@AutoConfiguration(before = TixaClientAutoConfiguration.class)
@ConditionalOnClass(JsonMapper.class)
public class JsonCodecAutoConfiguration {

    @Bean
    TicketCodec jsonCodec() {
        JsonMapper json = JsonMapper.builder().build();
        return (eventId, seats) -> json.writeValueAsString(java.util.Map.of("event", eventId, "seats", seats));
    }
}
