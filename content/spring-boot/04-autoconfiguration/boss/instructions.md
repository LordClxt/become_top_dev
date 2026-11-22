## Contexte

La plateforme Tixa veut un starter de notifications : une application l'ajoute, et reçoit un `NotificationService` qui envoie sur **tous** les canaux disponibles. Chaque canal dépend d'un SDK optionnel ; l'application peut ajouter ses propres canaux ; et il doit toujours y avoir au moins un canal.

Fournis : `Notifier`, `NotificationService` (qui reçoit la liste des canaux), et deux SDK fictifs, `sdk.mail.MailSdk` et `sdk.sms.SmsSdk` (les tests les cachent pour simuler leur absence). Tu écris l'autoconfiguration (autant de classes que tu veux, dans `tixa.notify`) et le fichier `imports`. Les tests chargent **les classes listées dans ton fichier `imports`**.

Pas d'indices pour ce combat : tout ce qu'il faut est dans les cinq leçons du module.

## Les règles

- Canal **e-mail** (`emailNotifier`) : si `MailSdk` est sur le classpath. Envoi : `MailSdk.send(to, text)`.
- Canal **SMS** (`smsNotifier`) : si `SmsSdk` est sur le classpath **et** que `tixa.notify.sms.sender` est défini. Envoi : `new SmsSdk(sender).send(to, text)`.
- Canal de **repli** (`log:<to>:<text>`) : seulement s'il n'existe **aucun autre** `Notifier`, ni du starter, ni de l'application.
- Le `NotificationService` reçoit tous les canaux, e-mail avant SMS. L'application peut le remplacer.
- `tixa.notify.enabled=false` : le starter ne configure **rien**.
- Sans les SDK, le contexte doit démarrer : aucune classe absente ne doit être chargée.
