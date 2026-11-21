## Contexte

En production, Tixa tourne sur Kubernetes. Les secrets (clé d'API de paiement, mots de passe) ne sont ni dans `application.yml` (versionné) ni dans des variables d'environnement (visibles dans les outils d'exploitation) : ils sont **montés en fichiers** dans un dossier, un fichier par secret. Le nom du fichier est la propriété, son contenu est la valeur.

`TixaApp` et `application.yml` (avec un document `prod`) sont fournis. Tu écris `SecretsLoader.java` et `META-INF/spring.factories`.

Pas d'indices pour ce combat : tout ce qu'il faut est dans les cinq leçons du module.

## Les règles

- Si `tixa.secrets-dir` est défini (par n'importe quelle source, y compris un document de profil, et avec ses placeholders résolus), chaque **fichier** de ce dossier devient une propriété : nom du fichier = nom de la propriété, contenu = valeur, **sans** les espaces et sauts de ligne de début et de fin.
- Les fichiers cachés (dont le nom commence par `.`) sont ignorés : Kubernetes en crée.
- Ces propriétés forment une source nommée `tixaSecrets`, placée **juste après** les variables d'environnement :
  - la ligne de commande, les propriétés système et les variables d'environnement l'emportent sur un secret (pour dépanner) ;
  - un secret l'emporte sur tous les fichiers de configuration, profils compris.
- `tixa.secrets-dir` non défini : rien ne change, pas de source `tixaSecrets`.
- Dossier défini mais introuvable : le démarrage échoue avec `IllegalStateException("dossier de secrets introuvable : <chemin>")`.
- `TixaApp` ne change pas.
