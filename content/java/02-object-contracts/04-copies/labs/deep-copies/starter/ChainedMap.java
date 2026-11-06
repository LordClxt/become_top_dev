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
            result.buckets = buckets.clone(); // TODO : nouveau tableau… mais les mêmes chaînes d'Entry
            return result;
        } catch (CloneNotSupportedException e) {
            throw new AssertionError(e);
        }
    }
}
