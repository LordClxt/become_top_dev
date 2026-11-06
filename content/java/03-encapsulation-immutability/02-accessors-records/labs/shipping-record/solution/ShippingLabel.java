import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/** Une étiquette d'expédition, vraiment immuable : liste et tableau copiés à l'entrée comme à la sortie. */
public record ShippingLabel(String recipient, Address address, List<String> instructions, int weightGrams, byte[] barcode) {
    public ShippingLabel {
        recipient = Address.requireText(recipient, "recipient");
        Objects.requireNonNull(address, "address");
        instructions = List.copyOf(instructions);         // copie non modifiable, indépendante de l'appelant
        if (weightGrams < 1 || weightGrams > 30_000) throw new IllegalArgumentException("poids hors limites : " + weightGrams);
        barcode = Objects.requireNonNull(barcode, "barcode").clone();
    }

    /** Une copie : le tableau interne ne sort jamais. */
    @Override
    public byte[] barcode() {
        return barcode.clone();
    }

    // L'equals généré comparerait le tableau par identité : on compare son contenu.
    @Override
    public boolean equals(Object o) {
        return o == this || (o instanceof ShippingLabel s
                && s.weightGrams == weightGrams && s.recipient.equals(recipient) && s.address.equals(address)
                && s.instructions.equals(instructions) && Arrays.equals(s.barcode, barcode));
    }

    @Override
    public int hashCode() {
        int result = recipient.hashCode();
        result = 31 * result + address.hashCode();
        result = 31 * result + instructions.hashCode();
        result = 31 * result + Integer.hashCode(weightGrams);
        return 31 * result + Arrays.hashCode(barcode);
    }

    @Override
    public String toString() {
        return "ShippingLabel[recipient=" + recipient + ", address=" + address + ", instructions=" + instructions
                + ", weightGrams=" + weightGrams + ", barcode=" + Arrays.toString(barcode) + "]";
    }
}
