## Contexte

Un hôtel reçoit des réservations de sources variées (site web, téléphone, partenaires). Chaque source a ses habitudes : dates en chaîne ou en `Date`, nombre de personnes en texte, type de chambre en majuscules… Tu appliques la **loi de Postel** : une fonction accepte toutes ces formes et produit une **réservation canonique**, aux types précis.

Tu édites `booking.ts`.

## À faire

1. `normalize(input)` → `Booking` :
   - `checkIn` / `checkOut` : `Date` ou chaîne `AAAA-MM-JJ` → `Date` UTC ; `checkOut` strictement après `checkIn`, sinon `Error("séjour invalide")` ; une chaîne mal formée → `Error("date invalide : …")` ;
   - `guests` : nombre ou chaîne d'entier (`"2"`) entre 1 et 4, sinon `Error("nombre de personnes invalide")` ;
   - `room` : insensible à la casse et aux espaces → `'single' | 'double' | 'suite'`, sinon `Error("chambre inconnue : …")` ;
   - `contact` : l'entrée a `email?` et `phone?` à plat ; la sortie a un `contact` **groupé** `{ email?, phone? }` présent seulement si l'un des deux est fourni (chaîne non vide après `trim`).
2. `nightCount(booking)` : nombre de nuits.
3. `priceEur(booking, nightlyRateEur)` : `nightlyRateEur[room] × nuits`, + 10 € par personne au-delà de 2 et par nuit.
4. `occupancy(bookings)` : `[premièreArrivée, dernierDépart]`, ou `null` sans réservation (un seul objet nullable).

## Contraintes

Pas de `any`. La sortie ne contient ni chaîne de date, ni nombre en texte, ni `room` non normalisée.
