/** Un accès différé à un bean : chaque get() le redemande au conteneur. Fourni (comme jakarta.inject.Provider). */
@FunctionalInterface
public interface Provider<T> {
    T get();
}
