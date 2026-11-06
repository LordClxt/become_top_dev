import java.util.ArrayList;
import java.util.List;

/** Prépare l'affichage d'un devis, avec le cadeau offert au-delà de 100 €. */
public class Promotions {
    static final long GIFT_THRESHOLD_CENTS = 100_00;

    public List<String> render(Quote quote) {
        List<LineItem> shown = quote.lines();
        if (quote.totalCents() >= GIFT_THRESHOLD_CENTS) {
            shown.add(new LineItem("GIFT-PEN", "Cadeau : stylo", 0, 1));
        }
        List<String> out = new ArrayList<>();
        out.add("Devis " + quote.number());
        for (LineItem line : shown) out.add(line.quantity() + " × " + line.label() + " = " + line.totalCents());
        out.add("Total : " + quote.totalCents());
        return out;
    }
}
