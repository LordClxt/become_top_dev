package app;

/** Une horloge en millisecondes, injectée pour que les tests maîtrisent le temps. Fourni. */
@FunctionalInterface
public interface Ticker {
    long millis();
}
