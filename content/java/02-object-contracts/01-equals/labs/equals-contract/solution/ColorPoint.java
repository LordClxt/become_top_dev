import java.util.Objects;

/** Un point coloré, par composition : il contient un Point au lieu d'en être un. */
public final class ColorPoint {
    private final Point point;
    private final Color color;

    public ColorPoint(int x, int y, Color color) {
        this.point = new Point(x, y);
        this.color = Objects.requireNonNull(color);
    }

    public Color color() { return color; }

    /** Vue : la position de ce point coloré. */
    public Point asPoint() { return point; }

    @Override
    public boolean equals(Object o) {
        return o instanceof ColorPoint cp && cp.point.equals(point) && cp.color == color;
    }

    @Override
    public int hashCode() {
        return 31 * point.hashCode() + color.hashCode();
    }
}
