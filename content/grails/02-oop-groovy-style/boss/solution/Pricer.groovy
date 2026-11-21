// Une surcharge par type d'article : Groovy choisit la plus spécifique selon la classe réelle de l'objet.
class Pricer {
    private static final Map<Integer, BigDecimal> TICKET = [1: 5.00, 2: 2.50, 3: 1.00]

    BigDecimal price(Seat s) {
        Math.min(s.count, 10) * 12.00 + Math.max(s.count - 10, 0) * 9.00
    }

    BigDecimal price(Ticket t) {
        TICKET[t.priority] ?: { throw new IllegalArgumentException("priorité inconnue : ${t.priority}") }()
    }

    BigDecimal price(UrgentTicket t) {
        price((Ticket) t) * 2
    }

    BigDecimal price(Storage s) {
        [s.gb * 0.10, 1.00].max()
    }

    BigDecimal price(Item i) {
        throw new IllegalArgumentException("article non tarifé : ${i.getClass().simpleName}")
    }

    BigDecimal price(Object o) {
        throw new IllegalArgumentException(o == null ? 'article manquant' : "pas un article : ${o.getClass().simpleName}")
    }
}
