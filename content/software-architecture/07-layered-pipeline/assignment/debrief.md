**Le style suit la forme du problème.** Un traitement de données à sens unique, par étapes (import nocturne, EDI), est un pipeline : producteur, testeur, transformateur, consommateur. Une application interactive avec écrans, règles et persistance est une architecture en couches.

Les deux bulletins se ressemblent (monolithes, un quantum, coût et simplicité forts, scalabilité faible) ; le pipeline gagne en **modularité** et un peu en déployabilité, parce que ses filtres sont indépendants.
