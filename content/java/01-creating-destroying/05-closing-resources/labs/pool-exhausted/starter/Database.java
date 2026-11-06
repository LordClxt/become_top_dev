/** La base de données vue par le pool : exécute une requête sur une connexion physique. Fournie. */
public interface Database {
    /** @param physicalId identifiant de la connexion physique utilisée */
    String execute(int physicalId, String sql);
}
