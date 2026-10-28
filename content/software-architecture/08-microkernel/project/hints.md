## Hint 1
Le registre est une `Map<string, AssessmentPlugin>`. Dans `assess`, un `await` sur la réponse du plug-in suffit à traiter indifféremment les plug-ins synchrones et asynchrones.

## Hint 2
Pour l'isolation, calcule `pluginNamespace` de la source et de chaque cible : deux plug-ins différents ont un domaine ou un contexte différent. Teste le préfixe de la base centrale seulement si la cible n'est pas un plug-in.

## Hint 3
`Promise.race([call(device), timer.after(ms).then(() => { throw … })])` donne le timeout. Pour `assessAll`, enveloppe chaque `assess` dans un `try/catch` qui transforme l'erreur en résultat, puis `Promise.all`.
