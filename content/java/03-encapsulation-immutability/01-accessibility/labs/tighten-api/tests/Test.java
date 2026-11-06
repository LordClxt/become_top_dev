import catalog.Catalog;
import catalog.Product;
import java.lang.reflect.Field;
import java.lang.reflect.Member;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.List;

public class Test {
    static boolean exported(Member m) {
        return Modifier.isPublic(m.getModifiers()) || Modifier.isProtected(m.getModifiers());
    }

    static Catalog sample() {
        Catalog c = new Catalog();
        c.add(Product.of("Café moulu", 450, "épicerie"));
        c.add(Product.of("Yaourt", 120, "frais"));
        c.add(Product.of("Jus d'orange", 300, "boissons"));
        return c;
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("le comportement est intact", () -> {
            Catalog c = sample();
            Spec.eq(c.find("Yaourt").map(Product::priceCents).orElse(-1L), 120L, "find(\"Yaourt\")");
            Spec.eq(c.cheapest().map(Product::name).orElse("vide"), "Yaourt", "cheapest()");
            Spec.eq(c.products().size(), 3, "products().size()");
            Spec.raises(IllegalArgumentException.class, () -> c.add(Product.of("Savon", 200, "hygiène")), "catégorie inconnue");
            Spec.raises(IllegalArgumentException.class, () -> c.add(Product.of("Yaourt", 99, "frais")), "nom déjà présent");
        });

        Spec.test("Catalog n'exporte aucun champ d'instance", () -> {
            for (Field f : Catalog.class.getDeclaredFields()) {
                if (Modifier.isStatic(f.getModifiers())) continue;
                Spec.check(!exported(f), "le champ " + f.getName() + " est " + Modifier.toString(f.getModifiers())
                        + " : n'importe quel client (ou sous-classe) peut le lire et le modifier");
            }
        });

        Spec.test("CATEGORIES n'est plus modifiable", () -> {
            Field f = Catalog.class.getField("CATEGORIES");
            Spec.check(!f.getType().isArray(), "CATEGORIES est encore un tableau : Catalog.CATEGORIES[0] = \"x\" compile");
            Object v = f.get(null);
            Spec.check(v instanceof List<?>, "CATEGORIES doit être une List<String>");
            Spec.raises(UnsupportedOperationException.class, () -> ((List<?>) v).clear(), "CATEGORIES.clear()");
        });

        Spec.test("products() ne laisse pas modifier le catalogue", () -> {
            Catalog c = sample();
            Spec.raises(UnsupportedOperationException.class, () -> c.products().clear(), "products().clear()");
            Spec.eq(c.products().size(), 3, "taille après tentative");
        });

        Spec.test("PriceIndex ne fait plus partie de l'API", () -> {
            Class<?> top = null;
            try { top = Class.forName("catalog.PriceIndex"); } catch (ClassNotFoundException e) { /* imbriquée : très bien */ }
            if (top != null) Spec.check(!Modifier.isPublic(top.getModifiers()), "catalog.PriceIndex est encore une classe publique");
            for (Class<?> nested : Catalog.class.getDeclaredClasses()) {
                Spec.check(!Modifier.isPublic(nested.getModifiers()) && !Modifier.isProtected(nested.getModifiers()),
                        "la classe imbriquée " + nested.getSimpleName() + " est exportée");
            }
        });

        Spec.test("pas de méthode pour les tests dans l'API", () -> {
            for (Method m : Catalog.class.getDeclaredMethods()) {
                if (m.getName().toLowerCase().contains("test")) {
                    Spec.check(!exported(m), m.getName() + "() est " + Modifier.toString(m.getModifiers())
                            + " : les tests sont dans le paquetage, package-private suffit");
                }
                for (Class<?> p : m.getParameterTypes()) Spec.check(!(exported(m) && p.getSimpleName().equals("PriceIndex")), m.getName() + " expose PriceIndex");
                Spec.check(!(exported(m) && m.getReturnType().getSimpleName().equals("PriceIndex")), m.getName() + " expose PriceIndex");
            }
        });

        Spec.test("Product : plus de champ public, et des valeurs figées", () -> {
            for (Field f : Product.class.getDeclaredFields()) {
                if (Modifier.isStatic(f.getModifiers())) continue;
                Spec.check(!Modifier.isPublic(f.getModifiers()), "Product." + f.getName() + " est public");
                Spec.check(Modifier.isFinal(f.getModifiers()), "Product." + f.getName() + " doit être final");
            }
            Spec.check(!Modifier.isFinal(Catalog.class.getModifiers()), "Catalog doit rester extensible");
        });

        Spec.done();
    }
}
