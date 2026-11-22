import java.util.Optional;

/** Le statut d'un ordre, et son code d'une lettre dans les messages de la passerelle. */
public enum OrderStatus {
    NEW, PARTIAL, FILLED, CANCELLED, REJECTED;   // REJECTED ajouté pour la nouvelle passerelle

    public String code() {
        switch (this) {
            case NEW: return "N";
            case PARTIAL: return "P";
            case FILLED: return "F";
            case CANCELLED: return "C";
            default: return "?";
        }
    }

    /** Un ordre terminé n'évolue plus. */
    public boolean isTerminal() {
        switch (this) {
            case FILLED:
            case CANCELLED:
                return true;
            default:
                return false;
        }
    }

    public static Optional<OrderStatus> fromCode(String code) {
        for (OrderStatus s : values()) {
            if (s.code().equals(code)) return Optional.of(s);
        }
        return Optional.of(NEW);
    }
}
