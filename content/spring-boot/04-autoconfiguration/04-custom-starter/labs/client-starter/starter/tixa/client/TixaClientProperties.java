package tixa.client;

import java.time.Duration;

/** Les propriétés du starter (préfixe tixa.client). */
public record TixaClientProperties(String baseUrl, Duration timeout) { }
