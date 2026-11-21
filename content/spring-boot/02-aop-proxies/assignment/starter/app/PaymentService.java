package app;

import org.springframework.stereotype.Service;

/** Débite les clients. Chaque appel réel à la banque est compté. Fourni : ne pas modifier. */
@Service
public class PaymentService {
    private int bankCalls;
    private boolean bankDown;

    @Idempotent
    public String charge(String idempotencyKey, int amountCents) {
        bankCalls++;
        if (bankDown) throw new IllegalStateException("banque indisponible");
        return "pay-" + bankCalls + "-" + amountCents;
    }

    @Idempotent(keyArg = 1)
    public String refund(String paymentId, String idempotencyKey) {
        bankCalls++;
        return "refund-" + paymentId + "-" + bankCalls;
    }

    public int bankCalls() { return bankCalls; }

    public void setBankDown(boolean down) { this.bankDown = down; }
}
