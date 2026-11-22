package tixa.payment;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Les propriétés tixa.payment.*. */
@ConfigurationProperties("tixa.payment")
public record PaymentProperties(@DefaultValue("https://pay.tixa.example") String endpoint, String apiKey) { }
