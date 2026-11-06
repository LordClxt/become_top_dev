import java.util.List;

/** Une ligne de panier telle que reçue du front : code produit, options choisies, quantité. Fourni. */
public record Line(String skuCode, List<String> options, int quantity) { }
