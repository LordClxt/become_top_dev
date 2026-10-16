import java.util.HashMap;
import java.util.Map;

/**
 * Cache borné : au-delà de maxEntries, l'entrée la MOINS RÉCEMMENT UTILISÉE (lue ou écrite) est
 * évincée. maxEntries <= 0 : IllegalArgumentException.
 * Version actuelle : aucune borne, le cache grossit pour toujours.
 */
public final class LruCache<K, V> {
    private final Map<K, V> map = new HashMap<>();

    public LruCache(int maxEntries) {
    }

    public V get(K key) { return map.get(key); }

    public void put(K key, V value) { map.put(key, value); }

    public int size() { return map.size(); }

    public boolean containsKey(K key) { return map.containsKey(key); }
}
