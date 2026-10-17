## Contexte

L'API de carte de la leçon. Les fonctions acceptent toutes les formes de coordonnées, mais doivent **toujours renvoyer la forme canonique**. Le type d'entrée de la caméra doit être **dérivé** du type canonique.

Tu édites `camera.ts`.

## À faire

1. `CameraOptions` : dérivé de `Camera` (tout optionnel, `center` remplacé par un `LngLatLike` optionnel).
2. `toLngLat(like)` : `{ lng, lat }`, `{ lon, lat }` ou `[lng, lat]` → `{ lng, lat }`.
3. `applyOptions(camera, options)` : un nouveau `Camera` complet où seules les options fournies changent (`center` normalisé).
4. `centerOf(points)` : accepte n'importe quel `Iterable<LngLatLike>` et renvoie le centre (moyenne des `lng`, moyenne des `lat`) en `LngLat`, ou `null` si l'itérable est vide.
5. `viewportFor(points, zoomForSpanDeg)` : renvoie un `Camera` complet : centre = `centerOf`, `zoom` = `zoomForSpanDeg(étendue)` où l'étendue est le plus grand écart (`lng` ou `lat`) entre les points, `bearing` et `pitch` à `0`. Lève une `Error` si `points` est vide.

## Contraintes

Pas de `any`. Aucun type de retour ne doit contenir `LngLatLike` ni de propriété optionnelle.
