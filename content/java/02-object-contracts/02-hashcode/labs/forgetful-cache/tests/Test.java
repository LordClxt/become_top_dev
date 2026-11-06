import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class Test {
    static List<Line> cart() {
        return List.of(
                new Line("tshirt-m", List.of("bio"), 2),
                new Line("TSHIRT-M", List.of("bio", "logo"), 1),
                new Line("mug", List.of(), 3),
                new Line("tshirt-m", List.of("bio"), 1));
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("un panier recalculé ne rappelle pas le service de prix", () -> {
            var pricing = new Pricing();
            var cache = new PriceCache(pricing);
            var checkout = new Checkout(cache);
            long first = checkout.total(cart());
            int callsAfterFirst = pricing.calls();
            long second = checkout.total(cart());
            Spec.eq(second, first, "le total ne dépend pas du cache");
            Spec.eq(callsAfterFirst, 3, "appels au service pour le premier panier (3 combinaisons produit + options distinctes)");
            Spec.eq(pricing.calls(), 3, "appels au service après le second panier : tout devait venir du cache");
            Spec.eq(cache.hits(), 5, "hits() après deux paniers");
        });

        Spec.test("le cache ne grossit pas avec les recalculs", () -> {
            var cache = new PriceCache(new Pricing());
            var checkout = new Checkout(cache);
            for (int i = 0; i < 50; i++) checkout.total(cart());
            Spec.eq(cache.size(), 3, "size() après 50 fois le même panier");
        });

        Spec.test("Sku : deux objets de même code sont égaux pour les collections", () -> {
            Object a = Sku.of("mug");
            Object b = Sku.of("MUG");
            Spec.check(a.equals(b), "Sku.of(\"mug\").equals((Object) Sku.of(\"MUG\")) doit être vrai");
            Spec.check(new HashSet<>(List.of(Sku.of("mug"))).contains(Sku.of("Mug")), "HashSet<Sku>.contains");
        });

        Spec.test("PriceKey : modifier la liste d'origine ne modifie pas la clé", () -> {
            List<String> opts = new ArrayList<>(List.of("bio"));
            var key = new PriceKey(Sku.of("tshirt-m"), opts);
            Set<PriceKey> set = new HashSet<>(List.of(key));
            int before = key.hashCode();
            opts.add("logo");
            Spec.eq(key.hashCode(), before, "hashCode de la clé après modification de la liste passée au constructeur");
            Spec.check(set.contains(new PriceKey(Sku.of("tshirt-m"), List.of("bio"))), "la clé doit rester retrouvable");
        });

        Spec.done();
    }
}
