/** Le fournisseur de données de marché. NE PAS MODIFIER. */
interface QuoteProvider {
    /** Appel bloquant au fournisseur : le dernier prix du symbole, en centimes. */
    long quote(String symbol) throws Exception;
}
