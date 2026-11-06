/** Un montant exact, en unités mineures d'une devise. Immuable. */
public final class Money {

    // TODO : champs, constructeur privé, cache des zéros.

    public static Money ofMinor(long minorUnits, Currency currency) {
        throw new UnsupportedOperationException("ofMinor à écrire");
    }

    public static Money parse(String text, Currency currency) {
        throw new UnsupportedOperationException("parse à écrire");
    }

    public static Money zero(Currency currency) {
        throw new UnsupportedOperationException("zero à écrire");
    }

    public Money plus(Money other) {
        throw new UnsupportedOperationException("plus à écrire");
    }

    public long minorUnits() {
        throw new UnsupportedOperationException("minorUnits à écrire");
    }

    public Currency currency() {
        throw new UnsupportedOperationException("currency à écrire");
    }

    public boolean isPositive() {
        throw new UnsupportedOperationException("isPositive à écrire");
    }

    @Override
    public String toString() {
        throw new UnsupportedOperationException("toString à écrire");
    }
}
