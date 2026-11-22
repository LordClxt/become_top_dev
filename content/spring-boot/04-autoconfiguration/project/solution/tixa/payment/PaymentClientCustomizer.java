package tixa.payment;

import java.util.List;

/** Ajoute des en-têtes au client. Fourni : ne pas modifier. */
@FunctionalInterface
public interface PaymentClientCustomizer {
    void customize(List<String> headers);
}
