**LCOM = 3** : `{upgrade, isActive, price}` reliés par `plan`/`renewsAt`, `{charge, refund}` par `stripeKey`, `{sendInvoice, sendReminder}` par `smtpHost`. Trois groupes qui ne partagent rien : la classe en contient trois, que l'on peut extraire sans changer le comportement. Le gain dépasse l'esthétique : la clé Stripe n'est plus accessible au code d'e-mail.

Le second cas rappelle la limite de la métrique : `tax.ts` n'a aucun champ, donc autant de groupes que de fonctions, et pourtant sa cohésion est **fonctionnelle**. LCOM détecte un couplage accidentel ; il ne remplace pas le jugement.
