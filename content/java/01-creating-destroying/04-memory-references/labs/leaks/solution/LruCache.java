import java.util.LinkedHashMap;
import java.util.Map;

/** Cache borné : au-delà de {@code maxEntries}, l'entrée la moins récemment utilisée est évincée. */
public final class LruCache<K, V> {
    private final Map<K, V> map;

    public LruCache(int maxEntries) {
        if (maxEntries <= 0) throw new IllegalArgumentException("maxEntries doit être positif : " + maxEntries);
        // accessOrder = true : get() déplace l'entrée en fin de liste (la plus récente).
        map = new LinkedHashMap<>(16, 0.75f, true) {
            @Override protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
                return size() > maxEntries;
            }
        };
    }

    public V get(K key) { return map.get(key); }

    public void put(K key, V value) { map.put(key, value); }

    public int size() { return map.size(); }

    public boolean containsKey(K key) { return map.containsKey(key); }
}
