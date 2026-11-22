/** La commission prélevée sur une transaction : un forfait, ou un taux en points de base (1 pb = 0,01 %). */
public interface Commission {
    record Flat(Money amount) implements Commission { }

    record Rate(int basisPoints) implements Commission { }
}
