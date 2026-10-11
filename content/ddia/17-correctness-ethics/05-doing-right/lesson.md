---
id: ddia-ch17-l05
title: "Faire ce qui est juste : analytique prédictive et vie privée"
source: { chapter: 12, pages: "533-546" }
duration_min: 40
concepts:
  - id: ddia-ethics-predictive-bias
    label: "Analytique prédictive : un modèle appris sur un passé discriminatoire codifie et amplifie la discrimination, même sans attribut protégé"
  - id: ddia-ethics-accountability
    label: "Responsabilité : décisions opaques, statistiques plutôt qu'individuelles, et difficiles à contester (la « prison algorithmique »)"
  - id: ddia-ethics-feedback-loops
    label: "Boucles de rétroaction : une prédiction modifie le monde qui produit les données suivantes (spirale du score de crédit, bulles de filtre)"
  - id: ddia-ethics-surveillance
    label: "Pistage et surveillance : remplacer « données » par « surveillance » révèle ce que l'on construit"
  - id: ddia-ethics-consent
    label: "Consentement et liberté de choix : asymétrie d'information, échange non négocié, refus impossible en pratique"
  - id: ddia-ethics-data-as-power
    label: "Vie privée = droit de décider ce qu'on révèle ; la donnée est un actif, un pouvoir et une matière dangereuse"
  - id: ddia-ethics-regulation
    label: "Révolution industrielle, législation et autorégulation : finalité, minimisation, purge des données"
glossary:
  - term: "analytique prédictive"
    definition: "Usage de données passées pour prédire un comportement individuel (défaut de paiement, récidive, sinistre)."
  - term: "variable de substitution (proxy)"
    definition: "Donnée apparemment neutre fortement corrélée à un attribut protégé, comme le code postal pour l'origine."
  - term: "boucle de rétroaction auto-renforçante"
    definition: "Situation où la sortie d'un système influence les données qu'il recevra ensuite, dans le même sens."
  - term: "minimisation des données"
    definition: "Ne collecter et ne conserver que les données nécessaires à une finalité déclarée."
  - term: "courtier de données (data broker)"
    definition: "Entreprise qui achète, agrège et revend des données personnelles."
visuals: []
labs: [ddia-ch17-l05-lab-ethics-design]
xp: 40
---

## Pourquoi c'est important

Tout ce chapitre a parlé de correction **technique**. Mais un système parfaitement correct peut faire du tort. Chaque système est construit pour un but, et chaque action a des conséquences voulues et non voulues. Beaucoup de jeux de données parlent de **personnes** : leur comportement, leurs intérêts, leur identité. Ces personnes méritent d'être traitées avec humanité et respect. Les ingénieurs ne peuvent pas se réfugier derrière l'idée d'une technologie neutre : il leur revient de décider de quel monde ils veulent, et de refuser de construire ce qui le dégrade. La fin du livre est une invitation à cette **imagination morale**.

## L'analytique prédictive

Prédire la météo ou la diffusion d'une maladie est une chose. Prédire **si une personne** va récidiver, rembourser un prêt ou coûter cher à son assureur en est une autre : la prédiction touche directement sa vie.

Les décisions algorithmiques se répandent. Une personne étiquetée « à risque » par un algorithme peut se voir refuser coup sur coup un emploi, un vol, une assurance, un logement, un crédit. Kleppmann parle de **prison algorithmique** : une exclusion systématique, sans preuve d'une faute, avec très peu de moyens de faire appel. Cela heurte un principe fondamental : la présomption d'innocence.

### Biais et discrimination

On pourrait espérer qu'un algorithme soit plus juste qu'un humain. Mais il apprend **les régularités de ses données d'entraînement**. Si ces données reflètent un passé discriminatoire, le modèle le **codifie**, et peut l'**amplifier**.

Exclure les attributs protégés (origine, sexe, religion) ne suffit pas. Les données regorgent de **variables de substitution** : dans une ville ségréguée, le **code postal** ou même l'adresse IP prédisent fortement l'origine. Le modèle retrouve l'attribut interdit par la bande. D'où la formule citée par le livre : l'apprentissage automatique peut servir à **blanchir les biais**, comme on blanchit de l'argent. Le résultat a l'air objectif, parce qu'il sort d'un calcul.

Une prédiction n'extrapole que le passé. Si le passé est injuste, la prédiction l'est aussi. Rendre le futur **meilleur** que le passé demande un jugement moral, qui reste une responsabilité humaine.

### Responsabilité et redevabilité

Quand un humain se trompe, on sait qui doit rendre des comptes. Quand un algorithme se trompe (une voiture autonome qui provoque un accident, un modèle de crédit qui refuse à tort), qui est responsable ? Et comment la personne lésée peut-elle **contester** ?

Le score de crédit classique répond à la question « comment cette personne s'est-elle comportée par le passé ? ». Il contient des erreurs, mais on peut (difficilement) les faire corriger. Un score appris sur des données très variées répond à une autre question : « **qui te ressemble**, et comment ces gens se sont-ils comportés ? ». C'est du **stéréotype**, et la décision est souvent **opaque** : impossible de savoir pourquoi on a été refusé.

Et une prédiction est **statistique**, pas individuelle. Une espérance de vie de 80 ans ne veut pas dire que tu mourras le jour de tes 80 ans. Un modèle juste à 90 % se trompe sur une personne sur dix, et pour elle l'erreur est totale. Exemple : un modèle signale 1 500 personnes « à risque » ; 600 récidivent effectivement. Les 900 autres (60 % des signalées) subissent la décision sans l'avoir méritée.

Les données peuvent aussi servir le bien : cibler l'aide vers les personnes qui en ont le plus besoin. Mais une confiance aveugle dans la suprématie des données est dangereuse. Il faut rendre les algorithmes **transparents** et **contestables**, éviter qu'ils renforcent les biais existants, et **corriger** leurs erreurs.

### Les boucles de rétroaction

Une prédiction ne se contente pas d'observer le monde : elle le **change**, et les données suivantes en portent la trace.

- Les **systèmes de recommandation** montrent aux gens ce qu'ils sont susceptibles d'aimer, donc de plus en plus ce qu'ils pensent déjà : chambres d'écho, polarisation, désinformation qui prospère, avec des effets possibles sur les élections.
- Le **score de crédit utilisé à l'embauche** : un bon salarié subit un coup dur (maladie, licenciement), manque quelques échéances, son score baisse, il trouve plus difficilement un emploi, il s'appauvrit, son score baisse encore. Une **spirale descendante**, où le système fabrique la preuve qui le justifie.

On ne voit pas toujours ces boucles venir. Le livre conseille une **pensée systémique** : analyser le système entier, humains compris, pas seulement le modèle. Le système renforce-t-il des différences existantes ? Combat-il l'injustice ou la perpétue-t-il ?

## Vie privée et pistage

Une donnée saisie volontairement (« enregistre cette commande ») sert l'utilisateur. Le **pistage** (*tracking*) du comportement en est un **effet de bord**, et il sert souvent quelqu'un d'autre. Il peut être utile à l'utilisateur lui-même : les clics améliorent le classement des résultats de recherche, les recommandations « vous aimerez peut-être ». Mais quand un service est financé par la publicité, les **annonceurs sont les vrais clients**, et l'intérêt des utilisateurs passe au second plan. Le pistage devient plus détaillé, les analyses plus intrusives, les données gardées plus longtemps.

### La surveillance

Expérience de pensée du livre : remplace le mot « données » par « **surveillance** ». « Notre organisation pilotée par la surveillance collecte des flux de surveillance en temps réel et les stocke dans son entrepôt de surveillance. Nos scientifiques de la surveillance… » La phrase sonne autrement, et elle décrit pourtant la même chose.

Smartphones, télévisions connectées, assistants vocaux : nous avons installé chez nous une infrastructure de collecte que **aucun régime totalitaire** n'aurait osé espérer. La différence, c'est que nous l'avons **acceptée volontairement**, et qu'elle est opérée par des entreprises plutôt que par des États. Cela n'en fait pas une infrastructure inoffensive.

### Consentement et liberté de choix

L'argument habituel : les utilisateurs ont **choisi** le service et accepté les conditions. Il tient mal :

- les utilisateurs savent très peu **quelles données** sont collectées, comment elles sont croisées et conservées. Les politiques de confidentialité obscurcissent plus qu'elles n'éclairent ;
- la relation est **asymétrique** : les conditions sont fixées par le service, pas négociées ; la donnée est extraite dans un seul sens, sans réel échange de valeur équitable ;
- des personnes qui n'ont **rien accepté** sont pistées aussi, via les carnets d'adresses ou les photos de leurs amis ;
- pour un service devenu socialement indispensable (réseau social, messagerie, plateforme professionnelle), refuser a un **coût réel** : l'exclusion. Seule une minorité privilégiée, qui a le temps et les connaissances, peut vraiment s'en passer.

### La vie privée et l'usage des données

Vivre en privé ne veut pas dire **tout cacher**. Cela veut dire avoir la **liberté de choisir** ce qu'on révèle, à qui, et ce qu'on garde pour soi. Le droit à la vie privée est un **droit de décider**.

La surveillance **transfère** ce droit de l'individu vers celui qui collecte. Ce dernier peut le garder pour lui (et, souvent, il garde secrets les résultats de sa propre surveillance, de peur de paraître « intrusif ») et exercer ce droit à la place des personnes : par exemple **cibler** des publicités sur une maladie ou une difficulté financière qu'elles n'ont révélée à personne. Les réglages de confidentialité offerts aux utilisateurs ne leur rendent qu'une partie du contrôle, puisque le service garde toutes les données et en fait ce qu'il veut en interne.

### La donnée comme actif et comme pouvoir

Les données comportementales sont parfois qualifiées de « résidus » de l'activité. Si elles financent le service via la publicité ciblée, ce sont plutôt **les utilisateurs** qui sont la ressource exploitée. Des **courtiers de données** achètent, agrègent et revendent des profils dans une industrie discrète.

Une ressource de valeur attire les convoitises : **fuites** et piratages, et **États** qui obtiennent les données par accords secrets, contrainte ou intrusion. Il faut penser non seulement au gouvernement d'aujourd'hui, mais à **tous les gouvernements futurs**, y compris un régime qui ne respecterait pas les droits humains. Installer des technologies qui pourraient un jour faciliter un État policier relève, selon une formule de Bruce Schneier reprise par le livre, d'une mauvaise **hygiène civique**. Le savoir, c'est le pouvoir ; et ceux qui scrutent sans être scrutés en concentrent beaucoup.

### Se souvenir de la révolution industrielle

La révolution industrielle a apporté croissance et progrès, mais aussi la pollution, le travail des enfants, des conditions de travail effroyables. Il a fallu longtemps pour établir des **garde-fous** : normes environnementales, sécurité au travail, interdiction du travail des enfants, inspections sanitaires. Faire des affaires est devenu plus cher, et la société en a largement profité.

La donnée est, selon Schneier, **la pollution de l'âge de l'information**. Protéger la vie privée est le chantier de notre époque, comme la protection de l'environnement l'a été pour l'industrie.

### Législation et autorégulation

La directive européenne de 1995 sur la protection des données exigeait déjà une collecte pour des **finalités déterminées, explicites et légitimes**, et des données **adéquates, pertinentes et non excessives**. C'est l'opposé de la philosophie « big data » : tout collecter, tout croiser, et chercher ensuite ce qu'on peut en tirer. Les entreprises rétorquent que la régulation freine l'innovation ; il est vrai qu'on ne sait pas d'avance ce qu'une donnée révélera. Mais cela ne justifie pas de collecter sans limite.

Le livre appelle surtout à un **changement de culture** dans l'industrie :

- voir les utilisateurs comme des **humains** qui méritent dignité et autonomie, pas comme des métriques à optimiser ;
- **s'autoréguler** : collecter moins, expliquer ce qu'on fait, ne pas piéger ;
- **purger les données** dès qu'elles ne servent plus, plutôt que de tout garder pour toujours. Ce qui va à l'encontre de l'immuabilité des logs vue dans les chapitres précédents : il faut des mécanismes pour effacer vraiment (compaction, suppression de clés de chiffrement par utilisateur) ;
- envisager des protocoles cryptographiques qui imposent le contrôle d'accès par construction plutôt que par une simple politique.

### Aller plus loin : le RGPD

Le **RGPD**, entré en application en 2018 (après la 1re édition du livre), a repris ces principes en les renforçant : base légale, minimisation, limitation de la conservation, droit d'accès, droit à l'effacement, portabilité, et amendes jusqu'à 4 % du chiffre d'affaires mondial. Pour un système à base de logs immuables, le droit à l'effacement oblige à prévoir l'effacement dès la conception : clé de chiffrement par personne détruite à la demande (*crypto-shredding*), ou compaction qui retire réellement les événements.

## Pièges fréquents

- **Retirer l'attribut protégé et se croire neutre** : les variables de substitution le réintroduisent.
- **Juger un modèle sur sa précision moyenne** : l'erreur se concentre sur des individus, et elle est totale pour eux.
- **Évaluer un modèle sans regarder ce qu'il change** : la boucle de rétroaction peut fabriquer ses propres preuves.
- **Assimiler l'acceptation des conditions d'utilisation à un consentement éclairé.**
- **Tout garder « au cas où »** : chaque donnée conservée est un risque de fuite et un pouvoir confié aux régimes futurs.

## À retenir

- Une prédiction sur des personnes extrapole le passé ; s'il est discriminatoire, elle le codifie, même sans attribut protégé, à cause des variables de substitution.
- Les décisions algorithmiques doivent rester transparentes, contestables et corrigibles ; une prédiction est statistique, pas individuelle.
- Les prédictions modifient le monde qui les nourrit : pense en systèmes pour repérer les boucles de rétroaction.
- Vie privée = droit de décider ce qu'on révèle ; la surveillance transfère ce droit au collecteur, sous un consentement souvent illusoire.
- La donnée est un actif, un pouvoir et une matière dangereuse : finalité déclarée, minimisation, purge, et considération des personnes plutôt que des métriques.
