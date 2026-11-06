import java.util.Objects;

/** Résultat renvoyé par la passerelle de paiement : exactement l'une des trois variantes. */
sealed interface PaymentResult permits Approved, Declined, Pending {

    /** Lit une ligne de la passerelle : {@code OK;code;centimes}, {@code KO;raison;true|false} ou {@code WAIT;url}. */
    static PaymentResult fromGateway(String line) {
        String[] parts = line.split(";", -1);
        try {
            return switch (parts[0]) {
                case "OK" -> {
                    expect(parts, 3, line);
                    yield new Approved(parts[1], Long.parseLong(parts[2]));
                }
                case "KO" -> {
                    expect(parts, 3, line);
                    yield new Declined(parts[1], bool(parts[2], line));
                }
                case "WAIT" -> {
                    expect(parts, 2, line);
                    yield new Pending(parts[1]);
                }
                default -> throw new IllegalArgumentException("préfixe inconnu : " + line);
            };
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("montant illisible : " + line, e);
        }
    }

    private static void expect(String[] parts, int count, String line) {
        if (parts.length != count) throw new IllegalArgumentException(count + " champs attendus : " + line);
    }

    private static boolean bool(String s, String line) {
        return switch (s) {
            case "true" -> true;
            case "false" -> false;
            default -> throw new IllegalArgumentException("retryable doit valoir true ou false : " + line);
        };
    }
}

record Approved(String authCode, long amountCents) implements PaymentResult {
    Approved {
        Objects.requireNonNull(authCode, "authCode");
        if (!authCode.matches("[A-Z0-9]{6}")) throw new IllegalArgumentException("code d'autorisation : " + authCode);
        if (amountCents <= 0) throw new IllegalArgumentException("montant : " + amountCents);
    }
}

record Declined(String reason, boolean retryable) implements PaymentResult {
    Declined {
        Objects.requireNonNull(reason, "reason");
        if (reason.isBlank()) throw new IllegalArgumentException("raison vide");
    }
}

record Pending(String redirectUrl) implements PaymentResult {
    Pending {
        Objects.requireNonNull(redirectUrl, "redirectUrl");
        if (!redirectUrl.startsWith("https://")) throw new IllegalArgumentException("URL non sécurisée : " + redirectUrl);
    }
}
