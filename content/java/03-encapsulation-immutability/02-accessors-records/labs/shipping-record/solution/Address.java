import java.util.Objects;

/** Une adresse postale, validée et normalisée. */
public record Address(String street, String postalCode, String city) {
    public Address {
        street = requireText(street, "street");
        city = requireText(city, "city");
        Objects.requireNonNull(postalCode, "postalCode");
        if (!postalCode.matches("\\d{5}")) throw new IllegalArgumentException("code postal invalide : " + postalCode);
    }

    static String requireText(String value, String name) {
        String s = Objects.requireNonNull(value, name).strip();
        if (s.isEmpty()) throw new IllegalArgumentException(name + " vide");
        return s;
    }
}
