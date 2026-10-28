## Le besoin

Des partenaires (une grande enseigne, un blog littéraire) accèdent au catalogue par une API dédiée. Le contrôleur est écrit (`app.ts`) ; les clés sont dans `partners-data.ts`. Tout le pipeline est à construire dans `partners.ts`, y compris `PartnersModule`.

Pas d'indices pour ce combat.

## Le contrat

**Identifiant de requête.** `x-request-id` reçu, sinon généré ; renvoyé en en-tête ; disponible partout, sans provider request-scoped.

**Authentification.** `Authorization: Bearer <clé>`. Clé absente, inconnue ou mal formée → **401** `INVALID_KEY`. `@CurrentPartner()` donne le partenaire.

**Autorisation.** `@RequireScopes(...)` sur la classe et sur la méthode : les portées s'**additionnent** (il faut toutes celles de la classe et toutes celles de la méthode). Il en manque → **403** `MISSING_SCOPE`, et le message nomme les portées manquantes.

**Quota.** `quotaPerMinute` appels par partenaire, par fenêtre fixe de 60 s mesurée avec l'horloge injectée `Clock` (déjà fournie, les tests la remplacent). Dépassé → **429** `QUOTA_EXCEEDED` avec l'en-tête `retry-after` (secondes restantes, arrondies au supérieur). Un appel refusé en 401 ou 403 ne consomme pas de quota.

**Réponses.** Succès : `{ data, meta: { requestId } }`, sauf pour les routes `@RawResponse()`, renvoyées telles quelles.

**Erreurs.** Toutes, y compris le 404 du routeur : `{ statusCode, errorCode, message, requestId }`. Une erreur inattendue donne 500 `INTERNAL_ERROR` / `Erreur interne`, et son vrai message est ajouté à `ErrorFilter.logged` (un champ statique d'une classe `ErrorFilter` exportée).

Dans le débriefing, dessine (en texte) l'ordre exact des briques traversées par une requête qui dépasse son quota, et justifie l'ordre de tes guards.
