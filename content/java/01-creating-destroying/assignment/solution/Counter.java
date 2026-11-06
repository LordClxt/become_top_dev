/** Un compteur qui ne fait que monter. Créé par {@link MetricRegistry#counter}. */
public final class Counter {
    private final String name;
    private long count;

    Counter(String name) {
        this.name = name;
    }

    public String name() {
        return name;
    }

    public void increment() {
        count++;
    }

    public void add(long n) {
        if (n < 0) throw new IllegalArgumentException("un compteur ne descend pas : " + n);
        count += n;
    }

    public long count() {
        return count;
    }
}
