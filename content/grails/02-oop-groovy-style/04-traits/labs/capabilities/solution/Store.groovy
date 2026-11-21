// Fourni : ne pas modifier. Un faux stockage en mémoire, avec une horloge réglable par les tests.
class Store {
    static Date now = new Date(0)
    static List saved = []
    private static long nextId = 1

    static long nextId() { nextId++ }

    static void reset() { now = new Date(0); saved = []; nextId = 1 }
}
