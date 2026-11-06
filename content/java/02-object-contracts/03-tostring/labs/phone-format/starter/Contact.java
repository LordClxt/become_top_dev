import java.util.Objects;

/** Un contact : nom, numéro, et le code PIN de sa messagerie vocale. */
public final class Contact {
    private final String name;
    private final FrenchPhone phone;
    private final String voicemailPin;

    public Contact(String name, FrenchPhone phone, String voicemailPin) {
        this.name = Objects.requireNonNull(name);
        this.phone = Objects.requireNonNull(phone);
        this.voicemailPin = Objects.requireNonNull(voicemailPin);
    }

    public String name() { return name; }

    public FrenchPhone phone() { return phone; }

    public boolean checkPin(String pin) { return voicemailPin.equals(pin); }

    // TODO : toString (format libre, sans le PIN).

    @Override
    public boolean equals(Object o) {
        return o instanceof Contact c && c.name.equals(name) && c.phone.equals(phone);
    }

    @Override
    public int hashCode() {
        return 31 * name.hashCode() + phone.hashCode();
    }
}
