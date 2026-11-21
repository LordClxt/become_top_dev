package app;

import org.springframework.stereotype.Component;

/** Simule la banque : carte « declined » refusée, carte « expired » expirée. */
@Component
public class PaymentGateway {
    public String charge(String card, int amountCents) throws PaymentDeclinedException, CardExpiredException {
        if (card.equals("declined")) throw new PaymentDeclinedException("paiement refusé par la banque");
        if (card.equals("expired")) throw new CardExpiredException("carte expirée");
        return "pay-" + amountCents;
    }
}
