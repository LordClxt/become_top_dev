import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class Test {
    static final List<String> AIRPORTS = List.of("JFK", "LHR", "FCO", "MAD", "BCN", "AMS", "BER", "LIS", "ATH", "DUB",
            "VIE", "PRG", "CPH", "OSL", "HEL", "WAW", "BUD", "ZRH", "BRU", "IST");

    static boolean declares(Class<?> c) {
        try { c.getDeclaredMethod("hashCode"); return true; } catch (NoSuchMethodException e) { return false; }
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("Route : deux trajets égaux, un seul tiroir", () -> {
            Spec.check(declares(Route.class), "Route redéfinit equals mais pas hashCode");
            var a = new Route("CDG", "JFK", LocalDate.of(2026, 12, 24));
            var b = new Route(new String("CDG"), "JFK", LocalDate.parse("2026-12-24"));
            Spec.check(a.equals(b), "précondition : a.equals(b)");
            Spec.eq(a.hashCode(), b.hashCode(), "hashCode de deux trajets égaux");
            Map<Route, Integer> cache = new HashMap<>();
            cache.put(a, 420);
            Spec.eq(cache.get(b), 420, "cache.get(trajet égal)");
        });

        Spec.test("Route : bien réparti", () -> {
            Set<Integer> hashes = new HashSet<>();
            int n = 0;
            for (String to : AIRPORTS) {
                for (int d = 0; d < 365; d++) {
                    hashes.add(new Route("CDG", to, LocalDate.of(2026, 1, 1).plusDays(d)).hashCode());
                    n++;
                }
            }
            Spec.check(hashes.size() >= n * 0.95, hashes.size() + " hash distincts pour " + n
                    + " trajets au départ de CDG : chaque champ significatif doit peser dans le calcul");
        });

        Spec.test("Route : l'ordre des champs compte", () -> {
            var d = LocalDate.of(2026, 6, 1);
            Spec.check(new Route("CDG", "JFK", d).hashCode() != new Route("JFK", "CDG", d).hashCode(),
                    "CDG→JFK et JFK→CDG ont le même hash : une somme ou un XOR des champs ignore leur ordre, multiplie par 31");
        });

        Spec.test("Seats : cohérent avec equals", () -> {
            var a = new Seats("ECO", new boolean[] {true, false, true});
            var b = new Seats("ECO", new boolean[] {true, false, true});
            Spec.eq(a.hashCode(), b.hashCode(), "hashCode de deux plans égaux");
        });

        Spec.test("Seats : le tableau compte", () -> {
            Set<Integer> hashes = new HashSet<>();
            for (int mask = 0; mask < 1024; mask++) {
                boolean[] free = new boolean[10];
                for (int i = 0; i < 10; i++) free[i] = (mask >> i & 1) == 1;
                hashes.add(new Seats("ECO", free).hashCode());
            }
            Spec.check(hashes.size() >= 1000, hashes.size() + " hash distincts pour 1024 plans de la cabine ECO : le tableau free doit entrer dans le calcul");
        });

        Spec.done();
    }
}
