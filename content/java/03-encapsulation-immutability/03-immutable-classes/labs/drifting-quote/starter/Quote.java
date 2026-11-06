import java.util.List;

/** Un devis émis : un numéro et des lignes. « Immuable » : tous ses champs sont final. */
public final class Quote {
    private final String number;
    private final List<LineItem> lines;

    public Quote(String number, List<LineItem> lines) {
        this.number = number;
        this.lines = lines;
    }

    public String number() { return number; }

    public List<LineItem> lines() { return lines; }

    public long totalCents() {
        long sum = 0;
        for (LineItem line : lines) sum += line.totalCents();
        return sum;
    }
}
