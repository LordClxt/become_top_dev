/** Une table de hachage int → String à 16 compartiments chaînés. */
public class ChainedMap implements Cloneable {
    private static final class Entry {
        final int key;
        String value;
        Entry next;

        Entry(int key, String value, Entry next) {
            this.key = key;
            this.value = value;
            this.next = next;
        }

        /** Copie itérative de la chaîne commençant ici : une seule frame de pile, quelle que soit sa longueur. */
        Entry deepCopy() {
            Entry head = new Entry(key, value, next);
            for (Entry p = head; p.next != null; p = p.next) {
                p.next = new Entry(p.next.key, p.next.value, p.next.next);
            }
            return head;
        }
    }

    private Entry[] buckets = new Entry[16];
    private int size;

    private static int index(int key) {
        return Math.floorMod(key, 16);
    }

    public void put(int key, String value) {
        int i = index(key);
        for (Entry e = buckets[i]; e != null; e = e.next) {
            if (e.key == key) {
                e.value = value;
                return;
            }
        }
        buckets[i] = new Entry(key, value, buckets[i]);
        size++;
    }

    public String get(int key) {
        for (Entry e = buckets[index(key)]; e != null; e = e.next) {
            if (e.key == key) return e.value;
        }
        return null;
    }

    public int size() { return size; }

    @Override
    public ChainedMap clone() {
        try {
            ChainedMap result = (ChainedMap) super.clone();
            result.buckets = new Entry[buckets.length];
            for (int i = 0; i < buckets.length; i++) {
                if (buckets[i] != null) result.buckets[i] = buckets[i].deepCopy();
            }
            return result;
        } catch (CloneNotSupportedException e) {
            throw new AssertionError(e);
        }
    }
}
