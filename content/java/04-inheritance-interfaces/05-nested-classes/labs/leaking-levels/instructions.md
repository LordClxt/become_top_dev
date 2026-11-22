## Contexte

Le service de diffusion garde en cache, pour chaque client, les derniers niveaux de prix envoyés (`OrderBook.Level`) et le comparateur qui les ordonne. Le carnet (`OrderBook`, plusieurs mégaoctets) est remplacé à chaque mise à jour. Pourtant la mémoire du serveur grimpe sans fin : l'analyse du tas montre des milliers de carnets périmés, chacun retenu par quelques petits objets.

Les tests mesurent la fuite pour de vrai : ils gardent les niveaux (ou le comparateur), oublient le carnet, et demandent au ramasse-miettes de le récupérer.

## Ta mission

1. Les niveaux et le comparateur gardés en cache ne retiennent plus le carnet.
2. Leur comportement ne change pas : tri du meilleur prix au moins bon, `toString` avec la devise.
3. `Level` devient une classe membre **statique**.

Ne modifie que `OrderBook.java`.
