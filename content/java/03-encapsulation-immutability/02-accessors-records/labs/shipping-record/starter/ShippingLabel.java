import java.util.List;

/** Une étiquette d'expédition, façon JavaBean. TODO : en faire un record vraiment immuable. */
public class ShippingLabel {
    private String recipient;
    private Address address;
    private List<String> instructions;
    private int weightGrams;
    private byte[] barcode;

    public ShippingLabel(String recipient, Address address, List<String> instructions, int weightGrams, byte[] barcode) {
        this.recipient = recipient;
        this.address = address;
        this.instructions = instructions;
        this.weightGrams = weightGrams;
        this.barcode = barcode;
    }

    public String recipient() { return recipient; }

    public Address address() { return address; }

    public List<String> instructions() { return instructions; }

    public int weightGrams() { return weightGrams; }

    public byte[] barcode() { return barcode; }

    public void setRecipient(String recipient) { this.recipient = recipient; }

    public void setWeightGrams(int weightGrams) { this.weightGrams = weightGrams; }
}
