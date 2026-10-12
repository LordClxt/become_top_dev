import groovy.transform.EqualsAndHashCode
import java.math.RoundingMode

@EqualsAndHashCode
class Money implements Comparable<Money> {
    long cents

    Money plus(Money o) { new Money(cents: cents + o.cents) }

    Money minus(Money o) { new Money(cents: cents - o.cents) }

    Money multiply(Number n) {
        new Money(cents: (cents * (n as BigDecimal)).setScale(0, RoundingMode.HALF_UP).longValue())
    }

    Money negative() { new Money(cents: -cents) }

    int compareTo(Money o) { cents <=> o.cents }

    boolean asBoolean() { cents != 0 }

    String toString() {
        long abs = Math.abs(cents)
        String.format('%s%d.%02d €', cents < 0 ? '-' : '', (long) (abs / 100), abs % 100)
    }

    static Money of(String text) {
        new Money(cents: (new BigDecimal(text) * 100).setScale(0, RoundingMode.HALF_UP).longValue())
    }
}
