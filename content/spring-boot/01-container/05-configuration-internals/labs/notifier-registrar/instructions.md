## Contexte

Chaque client de Tixa (une salle, un festival) choisit ses canaux de notification dans la configuration :

```properties
tixa.notifiers=email,sms
```

Le nombre de beans dépend donc d'une propriété : impossible à écrire avec des méthodes `@Bean` fixes. Spring 7 apporte `BeanRegistrar` pour ce cas : du code qui **ajoute des définitions de beans** pendant le démarrage.

Tu édites seulement `NotifierRegistrar.java`, déjà importé par `NotifyConfig`. Les canaux (`Channels.Email`, `Channels.Push`, `Channels.Sms`) et `SmsQuota` sont fournis.

## Ta tâche

Pour chaque canal listé dans `tixa.notifiers` (séparés par des virgules, espaces ignorés), enregistre un bean de type `Notifier` nommé `<canal>Notifier` :

| canal | bean | objet |
|---|---|---|
| `email` | `emailNotifier` | `new Channels.Email()` |
| `push` | `pushNotifier` | `new Channels.Push()` |
| `sms` | `smsNotifier` | `new Channels.Sms(quota)`, avec **le bean `SmsQuota` du conteneur** |

- Le **premier** canal listé est le canal par défaut : c'est lui que renvoie `ctx.getBean(Notifier.class)`.
- Propriété absente ou vide : aucun canal, l'application démarre.
- Canal inconnu : le démarrage **échoue** avec une `IllegalStateException` dont le message est exactement :

```
canal de notification inconnu : fax (connus : email, push, sms)
```

## Contrainte

N'appelle pas `new Channels.Sms(new SmsQuota(...))` : le quota doit être celui du conteneur, partagé par toute l'application.
