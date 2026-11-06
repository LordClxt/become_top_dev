import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;

/** Calcule les frais de port à partir de règles écrites par l'équipe commerciale. */
final class Shipping {
    private Shipping() { throw new AssertionError(); }

    /** Une règle lue et validée : plus aucune chaîne après la lecture. */
    sealed interface Rule permits Tier, Surcharge, Fragile, Discount { }

    record Tier(int min, int max, long price) implements Rule {
        Tier {
            if (min < 0 || max < min) throw new IllegalArgumentException("palier vide ou négatif : " + min + "-" + max);
            if (price < 0) throw new IllegalArgumentException("prix négatif : " + price);
        }
        boolean covers(int grams) { return min <= grams && grams <= max; }
        boolean overlaps(Tier o) { return min <= o.max && o.min <= max; }
    }

    record Surcharge(Zone zone, long price) implements Rule {
        Surcharge { if (price < 0) throw new IllegalArgumentException("prix négatif : " + price); }
    }

    record Fragile(long price) implements Rule {
        Fragile { if (price < 0) throw new IllegalArgumentException("prix négatif : " + price); }
    }

    record Discount(int percent, int fromParcels) implements Rule {
        Discount {
            if (percent < 0 || percent > 100) throw new IllegalArgumentException("pourcentage hors de [0, 100] : " + percent);
            if (fromParcels <= 0) throw new IllegalArgumentException("nombre de colis : " + fromParcels);
        }
    }

    static Quote quote(String rules, List<Parcel> parcels) {
        List<Rule> parsed = parse(rules);
        var perParcel = new LinkedHashMap<String, Long>();
        for (Parcel p : parcels) {
            if (perParcel.putIfAbsent(p.id(), price(p, parsed)) != null) {
                throw new IllegalArgumentException("colis en double : " + p.id());
            }
        }
        long subtotal = perParcel.values().stream().mapToLong(Long::longValue).sum();
        long discount = discount(parsed, parcels.size(), subtotal);
        return new Quote(Collections.unmodifiableSequencedMap(perParcel), discount, subtotal - discount);
    }

    /** Base du palier + suppléments applicables. */
    private static long price(Parcel p, List<Rule> rules) {
        long base = -1, extras = 0;
        for (Rule r : rules) {
            switch (r) {
                case Tier t when t.covers(p.grams()) -> base = t.price();
                case Tier _ -> { }
                case Surcharge(Zone z, long price) when z == p.zone() -> extras += price;
                case Surcharge _ -> { }
                case Fragile(long price) when p.fragile() -> extras += price;
                case Fragile _ -> { }
                case Discount _ -> { }   // porte sur le total, pas sur un colis
            }
        }
        if (base < 0) throw new IllegalArgumentException("colis " + p.id() + " : aucun palier pour " + p.grams() + " g");
        return base + extras;
    }

    /** Remise sur le total, en faveur du client (division entière). */
    private static long discount(List<Rule> rules, int count, long subtotal) {
        long discount = 0;
        for (Rule r : rules) {
            switch (r) {
                case Discount(int percent, int from) when count >= from -> discount = subtotal * percent / 100;
                case Discount _, Tier _, Surcharge _, Fragile _ -> { }
            }
        }
        return discount;
    }

    /** Lit le texte en règles typées, et vérifie leur cohérence d'ensemble. */
    static List<Rule> parse(String text) {
        List<Rule> rules = new ArrayList<>();
        List<Tier> tiers = new ArrayList<>();
        Set<Zone> zones = EnumSet.noneOf(Zone.class);
        boolean fragile = false, discount = false;
        String[] lines = text.split("\n", -1);
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].strip();
            if (line.isEmpty() || line.startsWith("#")) continue;
            int n = i + 1;
            try {
                Rule rule = rule(line.split("\\s+"));
                switch (rule) {
                    case Tier t -> {
                        for (Tier other : tiers) {
                            if (t.overlaps(other)) throw new IllegalArgumentException("palier " + t.min() + "-" + t.max() + " chevauche " + other.min() + "-" + other.max());
                        }
                        tiers.add(t);
                    }
                    case Surcharge s -> {
                        if (!zones.add(s.zone())) throw new IllegalArgumentException("deux suppléments pour " + s.zone());
                    }
                    case Fragile _ -> {
                        if (fragile) throw new IllegalArgumentException("supplément fragile déjà défini");
                        fragile = true;
                    }
                    case Discount _ -> {
                        if (discount) throw new IllegalArgumentException("remise déjà définie");
                        discount = true;
                    }
                }
                rules.add(rule);
            } catch (IllegalArgumentException e) {   // NumberFormatException comprise
                throw new IllegalArgumentException("ligne " + n + " : " + e.getMessage(), e);
            }
        }
        return List.copyOf(rules);
    }

    private static Rule rule(String[] f) {
        return switch (f[0]) {
            case "tier" -> {
                arity(f, 3);
                String[] range = f[1].split("-", -1);
                if (range.length != 2) throw new IllegalArgumentException("palier attendu MIN-MAX : " + f[1]);
                yield new Tier(Integer.parseInt(range[0]), Integer.parseInt(range[1]), Long.parseLong(f[2]));
            }
            case "surcharge" -> {
                arity(f, 3);
                yield new Surcharge(zone(f[1]), Long.parseLong(f[2]));
            }
            case "fragile" -> {
                arity(f, 2);
                yield new Fragile(Long.parseLong(f[1]));
            }
            case "discount" -> {
                arity(f, 4);
                if (!f[2].equals("from")) throw new IllegalArgumentException("attendu : discount POURCENT from N");
                yield new Discount(Integer.parseInt(f[1]), Integer.parseInt(f[3]));
            }
            default -> throw new IllegalArgumentException("règle inconnue : " + f[0]);
        };
    }

    private static void arity(String[] f, int count) {
        if (f.length != count) throw new IllegalArgumentException(f[0] + " attend " + (count - 1) + " valeur(s)");
    }

    private static Zone zone(String s) {
        try {
            return Zone.valueOf(s);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("zone inconnue : " + s);
        }
    }
}
