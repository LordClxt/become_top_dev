package app;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

/** Sans @Feature : toujours là. Utilise la fidélité seulement si elle est active. Fourni. */
@Component
public class Checkout {
    private final ObjectProvider<LoyaltyProgram> loyalty;

    public Checkout(ObjectProvider<LoyaltyProgram> loyalty) {
        this.loyalty = loyalty;
    }

    public int total(int amountCents) {
        LoyaltyProgram program = loyalty.getIfAvailable();
        return program == null ? amountCents : program.discounted(amountCents);
    }
}
