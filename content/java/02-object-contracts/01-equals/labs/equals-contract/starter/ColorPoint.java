import java.util.Objects;

/** Un point coloré. */
public class ColorPoint extends Point {
    private final Color color;

    public ColorPoint(int x, int y, Color color) {
        super(x, y);
        this.color = Objects.requireNonNull(color);
    }

    public Color color() { return color; }

    /** Pour l'instant, un ColorPoint « est » déjà un Point. */
    public Point asPoint() { return this; }

    @Override
    public boolean equals(Object o) {
        if (!(o instanceof Point)) return false;
        if (!(o instanceof ColorPoint)) return o.equals(this); // face à un Point : comparaison sans couleur
        return super.equals(o) && ((ColorPoint) o).color == color;
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }
}
