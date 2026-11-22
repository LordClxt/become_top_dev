import java.util.regex.Pattern;

/** Écrite par l'équipe conformité : se déclenche sur un prix rond (multiple de 100 €). Fournie, à ne pas modifier. */
public final class KeywordAlert extends Alert {
    private final Pattern roundPrice;

    public KeywordAlert(String name) {
        super(name);
        this.roundPrice = Pattern.compile("\\d+0000");
    }

    @Override
    protected String describe() {
        return "prix rond, motif " + roundPrice.pattern();
    }

    @Override
    public boolean triggeredBy(long priceCents) {
        return roundPrice.matcher(Long.toString(priceCents)).matches();
    }
}
