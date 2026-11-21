package app;

/** Crédit de SMS du compte Tixa : un seul pour toute l'application. Fourni : ne pas modifier. */
public class SmsQuota {
    private int remaining;

    public SmsQuota(int remaining) { this.remaining = remaining; }

    public synchronized void consume() {
        if (remaining == 0) throw new IllegalStateException("quota de SMS épuisé");
        remaining--;
    }

    public synchronized int remaining() { return remaining; }
}
