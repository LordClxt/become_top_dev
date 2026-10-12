import java.math.RoundingMode

class Report {
    static List<Map> parse(String csv) {
        csv.readLines().withIndex(1)
            .findAll { line, no -> no > 1 && line.trim() }
            .collect { line, no -> parseLine(line, no) }
    }

    private static Map parseLine(String line, int no) {
        def cols = line.split(',', -1)*.trim()
        if (cols.size() != 5) throw new IllegalArgumentException("ligne ${no} : 5 colonnes attendues")
        try {
            int qty = cols[3] as int
            BigDecimal price = cols[4] as BigDecimal
            [date: cols[0], customer: cols[1], product: cols[2], qty: qty, unitPrice: price, total: qty * price]
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("ligne ${no} : nombre illisible (${e.message})")
        }
    }

    static Map<String, BigDecimal> byCustomer(List rows) {
        rows.groupBy { it.customer }
            .collectEntries { name, sales -> [name, sales*.total.sum(0G)] }
            .sort { a, b -> b.value <=> a.value ?: a.key <=> b.key }
    }

    static List<String> topProducts(List rows, int n) {
        rows.groupBy { it.product }
            .collectEntries { name, sales -> [name, sales*.qty.sum(0)] }
            .sort { a, b -> b.value <=> a.value ?: a.key <=> b.key }
            .keySet().take(n).toList()
    }

    static List<String> render(List rows) {
        byCustomer(rows).collect { name, total ->
            "${name}: ${total.setScale(2, RoundingMode.HALF_UP).toPlainString()}"
        }
    }
}
