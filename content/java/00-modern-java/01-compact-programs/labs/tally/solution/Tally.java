// Récapitulatif des ventes du jour : java Tally.java < ventes.txt

final Map<String, Long> quantities = new LinkedHashMap<>();
final Map<String, Long> amounts = new LinkedHashMap<>();

void main() {
    String line;
    var number = 0;
    while ((line = IO.readln()) != null) {
        number++;
        var trimmed = line.strip();
        if (trimmed.isEmpty() || trimmed.startsWith("#")) continue;
        if (!record(trimmed)) IO.println("ligne " + number + " ignorée : " + line);
    }
    quantities.forEach((item, qty) -> IO.println(item + " x" + qty + " = " + euros(amounts.get(item))));
    IO.println("TOTAL " + euros(amounts.values().stream().mapToLong(Long::longValue).sum()));
}

/** Ajoute une vente valide au récapitulatif ; renvoie false si la ligne est invalide. */
boolean record(String line) {
    var fields = line.split(";", -1);
    if (fields.length != 3) return false;
    var item = fields[0].strip();
    try {
        var qty = Long.parseLong(fields[1].strip());
        var price = Long.parseLong(fields[2].strip());
        if (item.isEmpty() || qty <= 0 || price < 0) return false;
        quantities.merge(item, qty, Long::sum);
        amounts.merge(item, Math.multiplyExact(qty, price), Long::sum);
        return true;
    } catch (NumberFormatException | ArithmeticException e) {
        return false;
    }
}

String euros(long cents) {
    return "%d.%02d".formatted(cents / 100, cents % 100);
}
