package tixa.client;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Les propriétés du starter (préfixe tixa.client). */
@ConfigurationProperties("tixa.client")
public record TixaClientProperties(
        @DefaultValue("https://api.tixa.example") String baseUrl,
        @DefaultValue("5s") Duration timeout) { }
