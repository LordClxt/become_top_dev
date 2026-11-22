package tixa.payment;

import java.util.List;

/** Le client du prestataire de paiement. Fourni : ne pas modifier. */
public record PaymentClient(String endpoint, String apiKey, List<String> headers) {
    public String charge(int cents) { return "débit " + cents + " via " + endpoint; }
}
