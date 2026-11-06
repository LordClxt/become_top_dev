import java.util.EnumMap;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Un montant exact, en unités mineures d'une devise. Immuable ; zéro est unique par devise. */
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

    /** TODO M1 : relit le format de toString (« 12.50 EUR »), avec aller-retour garanti. */
    public static Money valueOf(String text) {
        throw new UnsupportedOperationException("valueOf à écrire");
    }

    /** TODO M1 : ordre par montant, même devise uniquement, cohérent avec equals. */
    @Override
    public int compareTo(Money other) {
        throw new UnsupportedOperationException("compareTo à écrire");
    }

    // TODO M1 : equals, hashCode, et la Javadoc du format de toString.

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
