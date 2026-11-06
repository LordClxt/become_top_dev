import java.util.Objects;

/** Un ensemble de bits de taille fixe. Immuable : le tableau privé n'est jamais modifié après construction. */
public final class Bits {
    private final long[] words;
    private final int size;

    /** Le tableau doit appartenir exclusivement au nouvel objet : jamais un tableau d'un client ou d'un builder. */
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
        return flipAll(i);
    }

    /** Primitive à plusieurs étapes : une copie, puis tout le travail en place sur cette copie privée. */
    public Bits flipAll(int... indexes) {
        for (int i : indexes) Objects.checkIndex(i, size);   // valider avant de copier : rien à défaire en cas d'erreur
        long[] w = Words.copy(words);
        for (int i : indexes) w[i >>> 6] ^= 1L << i;
        return new Bits(w, size);
    }

    public Builder toBuilder() {
        return new Builder(Words.copy(words), size);
    }

    /** Compagnon mutable : travaille en place, et build() copie pour que le Bits produit ne change jamais. */
    public static final class Builder {
        private final long[] words;
        private final int size;

        public Builder(int size) {
            if (size < 0) throw new IllegalArgumentException("taille négative : " + size);
            this.words = new long[(size + 63) >>> 6];
            this.size = size;
        }

        private Builder(long[] words, int size) {
            this.words = words;
            this.size = size;
        }

        public Builder flip(int i) {
            Objects.checkIndex(i, size);
            words[i >>> 6] ^= 1L << i;
            return this;
        }

        public Builder set(int i, boolean value) {
            Objects.checkIndex(i, size);
            if (value) words[i >>> 6] |= 1L << i;
            else words[i >>> 6] &= ~(1L << i);
            return this;
        }

        public Bits build() {
            return new Bits(Words.copy(words), size);
        }
    }
}
