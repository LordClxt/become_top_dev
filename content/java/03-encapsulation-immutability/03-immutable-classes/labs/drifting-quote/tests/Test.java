import java.util.List;

public class Test {
    static Cart cart() {
        Cart c = new Cart();
        c.add("CHAIR", "Chaise", 45_00, 2);
        c.add("DESK", "Bureau", 120_00, 1);
        return c;
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("le panier fonctionne", () -> {
            Cart c = cart();
            Spec.eq(c.totalCents(), 210_00L, "total du panier");
            c.setQuantity("CHAIR", 4);
            Spec.eq(c.totalCents(), 300_00L, "total après passage à 4 chaises");
            c.add("LAMP", "Lampe", 30_00, 1);
            Spec.eq(c.totalCents(), 330_00L, "total après ajout d'une lampe");
            Spec.raises(IllegalArgumentException.class, () -> c.setQuantity("SOFA", 1), "setQuantity d'un article absent");
            Spec.raises(IllegalArgumentException.class, () -> c.setQuantity("DESK", 0), "quantité 0");
        });

        Spec.test("un devis émis ne bouge pas quand on ajoute au panier", () -> {
            Cart c = cart();
            Quote q = new QuoteService().issue(c);
            c.add("LAMP", "Lampe", 30_00, 1);
            Spec.eq(q.lines().size(), 2, "nombre de lignes du devis après un ajout au panier");
            Spec.eq(q.totalCents(), 210_00L, "total du devis après un ajout au panier");
        });

        Spec.test("un devis émis ne bouge pas quand on change une quantité du panier", () -> {
            Cart c = cart();
            Quote q = new QuoteService().issue(c);
            c.setQuantity("CHAIR", 10);
            Spec.eq(q.totalCents(), 210_00L, "total du devis après passage à 10 chaises dans le panier");
            Spec.eq(q.lines().get(0).quantity(), 2, "quantité de chaises dans le devis");
            Spec.eq(c.totalCents(), 570_00L, "le panier, lui, a bien changé");
        });

        Spec.test("afficher un devis ne le modifie pas", () -> {
            Quote q = new QuoteService().issue(cart());
            List<String> first = new Promotions().render(q);
            List<String> second = new Promotions().render(q);
            Spec.eq(second, first, "deuxième affichage identique au premier");
            Spec.check(first.contains("1 × Cadeau : stylo = 0"), "le cadeau doit apparaître : " + first);
            Spec.eq(q.lines().size(), 2, "lignes du devis après deux affichages");
        });

        Spec.test("personne ne peut modifier un devis de l'extérieur", () -> {
            Quote q = new QuoteService().issue(cart());
            Spec.raises(UnsupportedOperationException.class,
                    () -> q.lines().add(new LineItem("X", "X", 1, 1)), "quote.lines().add(…)");
            Spec.raises(UnsupportedOperationException.class, () -> q.lines().clear(), "quote.lines().clear()");
            Spec.eq(q.totalCents(), 210_00L, "total intact");
        });

        Spec.test("deux devis du même panier, à deux moments", () -> {
            Cart c = cart();
            QuoteService s = new QuoteService();
            Quote morning = s.issue(c);
            c.setQuantity("DESK", 3);
            Quote evening = s.issue(c);
            Spec.eq(morning.totalCents(), 210_00L, "devis du matin");
            Spec.eq(evening.totalCents(), 450_00L, "devis du soir");
            Spec.check(!morning.number().equals(evening.number()), "numéros distincts");
        });

        Spec.done();
    }
}
