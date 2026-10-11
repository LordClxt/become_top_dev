**Avro apparie les champs par nom.** Un champ présent seulement chez l'écrivain est ignoré ; un champ présent seulement chez le lecteur est rempli par sa valeur par défaut. D'où la règle : on n'ajoute ou ne retire que des champs avec défaut (compatibilité dans les deux sens). Sans défaut, on casse un des deux sens ; un alias ou une nouvelle branche d'union ne sont que rétrocompatibles.

Pas de numéros dans les octets, donc **32 octets** (60,5 % de moins que JSON), au prix d'un impératif : retrouver le schéma de l'écrivain — en tête de fichier, par numéro de version, ou à la connexion.
