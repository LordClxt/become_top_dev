package app;

import org.springframework.resilience.annotation.Retryable;
import org.springframework.stereotype.Service;

/** Les opérations comptables de Tixa. Fourni : ne pas modifier. */
@Service
public class Accounting {
    private final Ledger ledger;
    private final AuditTrail audit;
    private int lockConflicts;
    private int attempts;

    public Accounting(Ledger ledger, AuditTrail audit) {
        this.ledger = ledger;
        this.audit = audit;
    }

    public void setLockConflicts(int n) { this.lockConflicts = n; }

    public int attempts() { return attempts; }

    @Atomic
    public void sale(String eventId, int cents) {
        ledger.write("vente " + eventId, cents);
        ledger.write("tva " + eventId, cents / 5);
        if (cents < 0) throw new IllegalArgumentException("montant négatif");
    }

    @Atomic
    public void refund(String eventId, int cents) throws Exception {
        ledger.write("remboursement " + eventId, -cents);
        if (eventId.equals("closed")) throw new Exception("événement clôturé");
    }

    /** Écrit puis audite : l'audit (autre bean, lui aussi @Atomic) rejoint la transaction en cours. */
    @Atomic
    public void transfer(String from, String to, int cents) {
        ledger.write("débit " + from, -cents);
        audit.note(from + "->" + to);
        if (to.equals("nowhere")) throw new IllegalStateException("compte inconnu");
        ledger.write("crédit " + to, cents);
    }

    /** Un conflit de verrou fait échouer les premières tentatives ; chaque tentative doit repartir de zéro. */
    @Retryable(includes = IllegalStateException.class, maxRetries = 3, delay = 0)
    @Atomic
    public void settle(String eventId) {
        attempts++;
        ledger.write("clôture " + eventId, 0);
        if (attempts <= lockConflicts) throw new IllegalStateException("verrou en conflit");
    }
}
