import java.util.EnumMap;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Un montant exact, en unités mineures d'une devise. Immuable ; zéro est unique par devise. Ordre naturel cohérent avec equals. */
public final class Money implements Comparable<Money> {
    private static final Pattern DECIMAL = Pattern.compile("(-?)(\\d+)(?:\\.(\\d+))?");
    private static final Map<Currency, Money> ZEROS = new EnumMap<>(Currency.class);
    static {
        for (Currency c : Currency.values()) ZEROS.put(c, new Money(0, c));
    }

    private final long minor;
    private final Currency currency;

    private Money(long minor, Currency currency) {
        this.minor = minor;
        this.currency = currency;
    }

    public static Money ofMinor(long minorUnits, Currency currency) {
        Objects.requireNonNull(currency, "currency");
        return minorUnits == 0 ? ZEROS.get(currency) : new Money(minorUnits, currency);
    }

    public static Money parse(String text, Currency currency) {
        Objects.requireNonNull(text, "text");
        Objects.requireNonNull(currency, "currency");
        Matcher m = DECIMAL.matcher(text);
        if (!m.matches()) throw new IllegalArgumentException("montant illisible : \"" + text + "\"");
        String fraction = m.group(3) == null ? "" : m.group(3);
        if (fraction.length() > currency.digits()) {
            throw new IllegalArgumentException("trop de décimales pour " + currency + " : \"" + text + "\"");
        }
        try {
            String digits = m.group(2) + fraction + "0".repeat(currency.digits() - fraction.length());
            long value = Long.parseLong(digits);
            return ofMinor(m.group(1).isEmpty() ? value : -value, currency);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("montant trop grand : \"" + text + "\"", e);
        }
    }

    /**
     * Relit le format de {@link #toString()} : un montant, une espace, le code de devise (« 12.50 EUR »).
     *
     * @throws IllegalArgumentException si le texte est illisible ou la devise inconnue
     */
    public static Money valueOf(String text) {
        Objects.requireNonNull(text, "text");
        int space = text.lastIndexOf(' ');
        if (space <= 0) throw new IllegalArgumentException("montant illisible : \"" + text + "\"");
        Currency currency;
        try {
            currency = Currency.valueOf(text.substring(space + 1));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("devise inconnue : \"" + text + "\"", e);
        }
        try {
            return parse(text.substring(0, space), currency);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("montant illisible : \"" + text + "\"", e);
        }
    }

    public static Money zero(Currency currency) {
        return ZEROS.get(Objects.requireNonNull(currency, "currency"));
    }

    public Money plus(Money other) {
        if (other.currency != currency) {
            throw new IllegalArgumentException("devises différentes : " + this + " + " + other);
        }
        return ofMinor(Math.addExact(minor, other.minor), currency);
    }

    public long minorUnits() { return minor; }

    public Currency currency() { return currency; }

    public boolean isPositive() { return minor > 0; }

    /** @throws IllegalArgumentException si les devises diffèrent : deux devises ne se comparent pas */
    @Override
    public int compareTo(Money other) {
        if (other.currency != currency) {
            throw new IllegalArgumentException("devises différentes : " + this + " et " + other);
        }
        return Long.compare(minor, other.minor);
    }

    @Override
    public boolean equals(Object o) {
        return o == this || (o instanceof Money m && m.minor == minor && m.currency == currency);
    }

    @Override
    public int hashCode() {
        return 31 * currency.hashCode() + Long.hashCode(minor);
    }

    /**
     * Renvoie le montant suivi d'une espace et du code de devise : signe « - » éventuel, partie entière,
     * puis, si la devise a des décimales, un point et exactement {@link Currency#digits()} chiffres.
     * Exemples : « 12.50 EUR », « -0.05 USD », « 1500 JPY ». Ce format est garanti et relu par
     * {@link #valueOf(String)}.
     */
    @Override
    public String toString() {
        int digits = currency.digits();
        String sign = minor < 0 ? "-" : "";
        if (digits == 0) return sign + Math.abs(minor) + " " + currency;
        long scale = (long) Math.pow(10, digits);
        long abs = Math.abs(minor);
        String fraction = String.valueOf(abs % scale);
        return sign + (abs / scale) + "." + "0".repeat(digits - fraction.length()) + fraction + " " + currency;
    }
}
