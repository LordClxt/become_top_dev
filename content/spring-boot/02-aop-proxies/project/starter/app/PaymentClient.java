package app;

import org.springframework.stereotype.Service;

/** M2 — le client du prestataire de paiement. */
@Service
public class PaymentClient {
    private final Bank bank;

    public PaymentClient(Bank bank) { this.bank = bank; }

    public String charge(String card, int amountCents) {
        return bank.debit(card, amountCents);
    }
}
