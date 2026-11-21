package app;

import org.springframework.resilience.annotation.Retryable;
import org.springframework.stereotype.Service;

/** Le client du prestataire de paiement. */
@Service
public class PaymentClient {
    private final Bank bank;

    public PaymentClient(Bank bank) { this.bank = bank; }

    // Réessayer seulement ce qui peut réussir au prochain essai : une carte refusée le restera.
    @Retryable(includes = PaymentUnavailableException.class, maxRetries = 2, delay = 0)
    public String charge(String card, int amountCents) {
        return bank.debit(card, amountCents);
    }
}
