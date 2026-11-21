package app;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Exige sa clé d'API au démarrage. Fourni : ne pas modifier. */
@Component
public class PaymentGateway {
    public PaymentGateway(@Value("${tixa.payment.api-key:}") String apiKey) {
        if (apiKey.isBlank()) throw new MissingSecretException("tixa.payment.api-key", "TIXA_PAYMENT_APIKEY");
    }
}
