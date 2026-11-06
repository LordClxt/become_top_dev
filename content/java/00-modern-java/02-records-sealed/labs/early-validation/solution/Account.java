import java.util.Locale;
import java.util.Objects;

final class Account extends Entity {
    private final String iban;
    private final String owner;

    Account(String iban, String owner) {
        // Prologue (Java 25) : tout est validé et initialisé avant que Entity n'appelle describe().
        var normalized = Objects.requireNonNull(iban, "iban").replace(" ", "").toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}")) {
            throw new IllegalArgumentException("IBAN invalide : " + iban);
        }
        var holder = Objects.requireNonNull(owner, "owner").strip();
        if (holder.isEmpty()) throw new IllegalArgumentException("titulaire vide");
        this.iban = normalized;
        this.owner = holder;
        super();
    }

    String iban() { return iban; }

    String owner() { return owner; }

    @Override
    protected String describe() {
        return "Account " + iban + " (" + owner + ")";
    }
}
