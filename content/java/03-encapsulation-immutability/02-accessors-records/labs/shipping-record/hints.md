## Hint 1
`public record Address(String street, String postalCode, String city) { public Address { … } }`. Dans le corps compact, tu peux réaffecter `street = street.strip();`.

## Hint 2
Pour la liste : `instructions = List.copyOf(instructions);`. Pour le tableau, l'`equals` généré compare par identité : il faut redéfinir `equals`, `hashCode` et `toString`, et l'accesseur `barcode()`.

## Hint 3
Compact : `barcode = barcode.clone();`. Accesseur : `public byte[] barcode() { return barcode.clone(); }`. `equals` : `o instanceof ShippingLabel s && recipient.equals(s.recipient) && … && Arrays.equals(barcode, s.barcode)`. `hashCode` : `31 * Objects.hash(recipient, address, instructions, weightGrams) + Arrays.hashCode(barcode)`.
