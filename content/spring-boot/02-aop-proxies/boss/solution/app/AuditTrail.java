package app;

import org.springframework.stereotype.Service;

/** Écrit une ligne d'audit, dans la transaction de l'appelant s'il y en a une. Fourni. */
@Service
public class AuditTrail {
    private final Ledger ledger;

    public AuditTrail(Ledger ledger) { this.ledger = ledger; }

    @Atomic
    public void note(String what) { ledger.write("audit " + what, 0); }
}
