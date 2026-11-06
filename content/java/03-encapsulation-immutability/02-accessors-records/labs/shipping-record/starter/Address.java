/** Une adresse postale. TODO : en faire un record validé et normalisé. */
public class Address {
    private String street;
    private String postalCode;
    private String city;

    public Address(String street, String postalCode, String city) {
        this.street = street;
        this.postalCode = postalCode;
        this.city = city;
    }

    public String street() { return street; }

    public String postalCode() { return postalCode; }

    public String city() { return city; }

    public void setCity(String city) { this.city = city; }
}
