import java.util.Objects;

/** Un ensemble de bits de taille fixe. Immuable. */
public final class Bits {
    private final long[] words;
    private final int size;

    private Bits(long[] words, int size) {
        this.words = words;
        this.size = size;
    }

    public static Bits zeros(int size) {
        if (size < 0) throw new IllegalArgumentException("taille négative : " + size);
        return new Bits(new long[(size + 63) >>> 6], size);
    }

    public int size() { return size; }

    public boolean get(int i) {
        Objects.checkIndex(i, size);
        return (words[i >>> 6] & (1L << i)) != 0;
    }

    public int cardinality() {
        int n = 0;
        for (long w : words) n += Long.bitCount(w);
        return n;
    }

    public Bits flip(int i) {
        Objects.checkIndex(i, size);
        long[] w = Words.copy(words);
        w[i >>> 6] ^= 1L << i;
        return new Bits(w, size);
    }

    /** Inverse plusieurs bits. TODO : une seule copie. */
    public Bits flipAll(int... indexes) {
        Bits result = this;
        for (int i : indexes) result = result.flip(i);
        return result;
    }

    public Builder toBuilder() {
        return new Builder(this);
    }

    /** Pour construire un Bits en plusieurs étapes. TODO : un vrai compagnon mutable. */
    public static final class Builder {
        private Bits current;

        public Builder(int size) {
            this.current = zeros(size);
        }

        private Builder(Bits start) {
            this.current = start;
        }

        public Builder flip(int i) {
            current = current.flip(i);
            return this;
        }

        public Builder set(int i, boolean value) {
            if (current.get(i) != value) current = current.flip(i);
            return this;
        }

        public Bits build() {
            return current;
        }
    }
}
