package app;

import org.springframework.stereotype.Component;

/** Programme de fidélité : 10 % de remise. Fourni : ne pas modifier. */
@Component
@Feature("loyalty")
public class LoyaltyProgram {
    public int discounted(int amountCents) { return amountCents * 9 / 10; }
}
