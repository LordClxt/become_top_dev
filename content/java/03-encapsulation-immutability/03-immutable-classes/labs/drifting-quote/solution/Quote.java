import java.util.List;
import java.util.Objects;

/** Un devis émis. Vraiment immuable : sa liste est une copie non modifiable de lignes immuables. */
public final class Quote {
    private final String number;
    private final List<LineItem> lines;

    public Quote(String number, List<LineItem> lines) {
        this.number = Objects.requireNonNull(number, "number");
        this.lines = List.copyOf(lines);   // ne jamais garder la liste de l'appelant
    }

    public String number() { return number; }

    public List<LineItem> lines() { return lines; }   // déjà non modifiable, et ses éléments sont immuables

    public long totalCents() {
        long sum = 0;
        for (LineItem line : lines) sum += line.totalCents();
        return sum;
    }
}
