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

    /**
     * Description courte du contact. Le format n'est pas spécifié et peut changer ; exemple typique :
     * « Contact[nom=Ana Diaz, tél=06 12 34 56 78] ». Le code PIN n'y figure jamais.
     */
    @Override
    public String toString() {
        return "Contact[nom=" + name + ", tél=" + phone + "]";
    }

    @Override
    public boolean equals(Object o) {
        return o instanceof Contact c && c.name.equals(name) && c.phone.equals(phone);
    }

    @Override
    public int hashCode() {
        return 31 * name.hashCode() + phone.hashCode();
    }
}
