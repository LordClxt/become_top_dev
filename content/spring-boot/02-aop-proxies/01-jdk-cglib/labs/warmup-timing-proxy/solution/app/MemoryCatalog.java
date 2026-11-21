package app;

/** Implémente une interface. Fourni : ne pas modifier. */
public class MemoryCatalog implements Catalog {
    public String find(String eventId) {
        if (eventId.isBlank()) throw new IllegalArgumentException("identifiant vide");
        return "événement " + eventId;
    }
}
