import java.util.Objects;

/** Un code produit (« TSHIRT-M »). Égal à un autre Sku de même code, à la casse près. */
public final class Sku {
    private final String code;

    private Sku(String code) {
        this.code = code;
    }

    public static Sku of(String code) {
        return new Sku(Objects.requireNonNull(code).toUpperCase(java.util.Locale.ROOT));
    }

    public String code() { return code; }

    public boolean equals(Sku other) {
        return other != null && other.code.equals(code);
    }

    @Override
    public int hashCode() {
        return code.hashCode();
    }
}
