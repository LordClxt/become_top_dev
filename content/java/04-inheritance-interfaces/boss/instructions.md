## Contexte

Le tableau de bord d'Ordo affiche la liste des symboles suspendus en temps réel. Il s'abonne à un ensemble observable : chaque ajout et chaque retrait doit lui parvenir, **une seule fois**, quel que soit le chemin pris par le code qui modifie l'ensemble. Les abonnements sont gardés longtemps par des clients qui oublient souvent de les fermer.

Fournis : les noms de `SetEvent` (`Added`, `Removed`, `Cleared`) et la forme d'`ObservableSet`. Tu écris les deux.

Pas d'indices pour ce combat : tout ce qu'il faut est dans les cinq leçons du module.

## Les règles

- `new ObservableSet<>(set)` **enveloppe** l'ensemble reçu (n'importe quelle implémentation, sans copie) ; `asSet()` le présente comme un `Set` ordinaire (`equals` dans les deux sens).
- **Un événement par élément réellement ajouté ou retiré**, jamais zéro, jamais deux : `add`, `addAll`, `remove`, `removeAll`, `retainAll`, `removeIf`, `iterator().remove()`… Pas d'événement quand rien ne change.
- `clear()` envoie **un seul** `Cleared` avec tous les éléments retirés (et rien si l'ensemble était vide). Un `Cleared` ne change plus après coup.
- `onChange(listener)` abonne ; fermer l'`AutoCloseable` renvoyé désabonne (le fermer deux fois ne gêne pas). **Garder un abonnement ne doit pas retenir l'ensemble en mémoire.**
- `SetEvent` est **scellée**, ses sortes sont des records ; `ObservableSet` est **finale**.
